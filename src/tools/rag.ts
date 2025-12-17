import * as fs from "fs/promises";
import * as path from "path";
import { glob } from "glob";
import { z } from "zod";
import { formatToolResponse } from "../utils/response.js";
import * as crypto from "crypto";

// RAG configuration from environment
const RAG_DOCS_PATH = process.env.RAG_DOCS_PATH || "";

// Sensible defaults - index stored alongside docs, no config needed
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

// Index path is always inside the docs folder
function getIndexPath(): string {
  return path.join(RAG_DOCS_PATH, ".rag-index");
}

// Supported file extensions for RAG indexing
const SUPPORTED_EXTENSIONS = [
  ".txt", ".md", ".markdown", ".rst",
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".pyi",
  ".json", ".yaml", ".yml", ".toml",
  ".html", ".htm", ".xml",
  ".css", ".scss", ".less",
  ".sql",
  ".sh", ".bash", ".zsh",
  ".go", ".rs", ".java", ".kt", ".scala",
  ".c", ".cpp", ".h", ".hpp",
  ".rb", ".php", ".swift",
  ".env", ".env.example", ".env.local",
  ".gitignore", ".dockerignore",
  "Dockerfile", "Makefile",
];

// Document chunk interface
interface DocumentChunk {
  id: string;
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
  metadata: {
    fileType: string;
    fileName: string;
    chunkIndex: number;
    totalChunks: number;
  };
  tfidfVector?: Map<string, number>;
}

// RAG Index interface
interface RAGIndex {
  version: string;
  createdAt: string;
  updatedAt: string;
  docsPath: string;
  chunks: DocumentChunk[];
  vocabulary: string[];
  idf: Record<string, number>;
  fileHashes: Record<string, string>;
}

// In-memory index cache
let indexCache: RAGIndex | null = null;

// Tokenize text for TF-IDF
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !isStopWord(token));
}

// Common stop words to filter out
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
  "be", "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "must", "shall", "can", "need", "dare", "ought",
  "used", "this", "that", "these", "those", "it", "its", "they", "them",
  "their", "we", "us", "our", "you", "your", "he", "him", "his", "she",
  "her", "not", "no", "nor", "so", "than", "too", "very", "just", "also",
  "now", "here", "there", "when", "where", "why", "how", "all", "each",
  "every", "both", "few", "more", "most", "other", "some", "such", "only",
  "own", "same", "then", "which", "who", "whom", "what", "any", "if",
]);

function isStopWord(word: string): boolean {
  return STOP_WORDS.has(word);
}

// Calculate term frequency
function calculateTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  // Normalize by document length
  const maxFreq = Math.max(...tf.values());
  for (const [term, freq] of tf) {
    tf.set(term, freq / maxFreq);
  }
  return tf;
}

// Calculate IDF for all documents
function calculateIDF(documents: string[][]): Record<string, number> {
  const docCount = documents.length;
  const termDocCount: Record<string, number> = {};
  
  for (const doc of documents) {
    const uniqueTerms = new Set(doc);
    for (const term of uniqueTerms) {
      termDocCount[term] = (termDocCount[term] || 0) + 1;
    }
  }
  
  const idf: Record<string, number> = {};
  for (const [term, count] of Object.entries(termDocCount)) {
    idf[term] = Math.log(docCount / count);
  }
  return idf;
}

// Calculate TF-IDF vector
function calculateTFIDF(tokens: string[], idf: Record<string, number>): Map<string, number> {
  const tf = calculateTF(tokens);
  const tfidf = new Map<string, number>();
  
  for (const [term, tfValue] of tf) {
    const idfValue = idf[term] || 0;
    tfidf.set(term, tfValue * idfValue);
  }
  return tfidf;
}

// Cosine similarity between two TF-IDF vectors
function cosineSimilarity(vec1: Map<string, number>, vec2: Map<string, number>): number {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (const [term, value] of vec1) {
    norm1 += value * value;
    if (vec2.has(term)) {
      dotProduct += value * vec2.get(term)!;
    }
  }
  
  for (const value of vec2.values()) {
    norm2 += value * value;
  }
  
  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

// Hash file content for change detection
function hashContent(content: string): string {
  return crypto.createHash("md5").update(content).digest("hex");
}

// Split text into chunks with overlap
function chunkText(
  content: string,
  filePath: string,
  chunkSize: number = CHUNK_SIZE,
  overlap: number = CHUNK_OVERLAP
): DocumentChunk[] {
  const lines = content.split("\n");
  const chunks: DocumentChunk[] = [];
  const fileName = path.basename(filePath);
  const fileType = path.extname(filePath) || "unknown";
  
  let currentChunk: string[] = [];
  let currentSize = 0;
  let startLine = 1;
  let chunkIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineSize = line.length + 1; // +1 for newline
    
    if (currentSize + lineSize > chunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        id: `${hashContent(filePath)}-${chunkIndex}`,
        filePath,
        content: currentChunk.join("\n"),
        startLine,
        endLine: startLine + currentChunk.length - 1,
        metadata: {
          fileType,
          fileName,
          chunkIndex,
          totalChunks: 0, // Will be updated later
        },
      });
      
      // Calculate overlap lines
      const overlapLines = Math.ceil(overlap / (currentSize / currentChunk.length));
      const keepLines = Math.min(overlapLines, currentChunk.length);
      
      currentChunk = currentChunk.slice(-keepLines);
      currentSize = currentChunk.join("\n").length;
      startLine = startLine + currentChunk.length - keepLines;
      chunkIndex++;
    }
    
    currentChunk.push(line);
    currentSize += lineSize;
  }
  
  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    chunks.push({
      id: `${hashContent(filePath)}-${chunkIndex}`,
      filePath,
      content: currentChunk.join("\n"),
      startLine,
      endLine: startLine + currentChunk.length - 1,
      metadata: {
        fileType,
        fileName,
        chunkIndex,
        totalChunks: 0,
      },
    });
  }
  
  // Update total chunks count
  for (const chunk of chunks) {
    chunk.metadata.totalChunks = chunks.length;
  }
  
  return chunks;
}

// Load index from disk
async function loadIndex(): Promise<RAGIndex | null> {
  if (indexCache) return indexCache;
  
  try {
    const indexPath = path.join(getIndexPath(), "index.json");
    const data = await fs.readFile(indexPath, "utf8");
    indexCache = JSON.parse(data);
    
    // Reconstruct Map objects for tfidfVector
    if (indexCache) {
      for (const chunk of indexCache.chunks) {
        if (chunk.tfidfVector) {
          chunk.tfidfVector = new Map(Object.entries(chunk.tfidfVector));
        }
      }
    }
    
    return indexCache;
  } catch {
    return null;
  }
}

// Save index to disk
async function saveIndex(index: RAGIndex): Promise<void> {
  await fs.mkdir(getIndexPath(), { recursive: true });
  
  // Convert Map objects to plain objects for JSON serialization
  const serializable = {
    ...index,
    chunks: index.chunks.map((chunk) => ({
      ...chunk,
      tfidfVector: chunk.tfidfVector ? Object.fromEntries(chunk.tfidfVector) : undefined,
    })),
  };
  
  const indexFilePath = path.join(getIndexPath(), "index.json");
  await fs.writeFile(indexFilePath, JSON.stringify(serializable, null, 2));
  indexCache = index;
}

// Check if RAG is enabled
function isRAGEnabled(): boolean {
  return !!RAG_DOCS_PATH && RAG_DOCS_PATH.length > 0;
}

// Get all indexable files
async function getIndexableFiles(docsPath: string): Promise<string[]> {
  const patterns = SUPPORTED_EXTENSIONS.map((ext) => 
    ext.startsWith(".") ? `**/*${ext}` : `**/${ext}`
  );
  
  const files: string[] = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: docsPath,
      ignore: ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**", "**/.rag-index/**"],
      absolute: true,
    });
    files.push(...matches);
  }
  
  return [...new Set(files)]; // Remove duplicates
}

// Export RAG tools
export const ragTools = [
  {
    name: "rag_index_documents",
    description: "Index local documents for RAG retrieval. Requires RAG_DOCS_PATH environment variable to be set. This will scan the specified directory, chunk documents, and build a TF-IDF index for semantic search.",
    inputSchema: z.object({
      forceReindex: z.boolean().describe("Force reindexing of all documents even if unchanged").default(false).optional(),
      filePatterns: z.array(z.string()).describe("Optional glob patterns to filter files (e.g., ['**/*.md', '**/*.ts'])").optional(),
    }),
    handler: async (args: any) => {
      if (!isRAGEnabled()) {
        return formatToolResponse({
          success: false,
          error: "RAG is not enabled. Set RAG_DOCS_PATH environment variable to the directory containing documents to index.",
        });
      }
      
      try {
        const docsPath = path.resolve(RAG_DOCS_PATH);
        const existingIndex = await loadIndex();
        
        // Get all indexable files
        let files = await getIndexableFiles(docsPath);
        
        // Apply custom file patterns if provided
        if (args.filePatterns && args.filePatterns.length > 0) {
          const customFiles: string[] = [];
          for (const pattern of args.filePatterns) {
            const matches = await glob(pattern, {
              cwd: docsPath,
              ignore: ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**"],
              absolute: true,
            });
            customFiles.push(...matches);
          }
          files = [...new Set(customFiles)];
        }
        
        const chunks: DocumentChunk[] = [];
        const fileHashes: Record<string, string> = {};
        let indexedCount = 0;
        let skippedCount = 0;
        
        for (const filePath of files) {
          try {
            const content = await fs.readFile(filePath, "utf8");
            const hash = hashContent(content);
            fileHashes[filePath] = hash;
            
            // Skip unchanged files unless force reindex
            if (!args.forceReindex && existingIndex?.fileHashes[filePath] === hash) {
              const existingChunks = existingIndex.chunks.filter((c) => c.filePath === filePath);
              chunks.push(...existingChunks);
              skippedCount++;
              continue;
            }
            
            const fileChunks = chunkText(content, filePath);
            chunks.push(...fileChunks);
            indexedCount++;
          } catch (err) {
            // Skip files that can't be read
            console.error(`Skipping file ${filePath}: ${err}`);
          }
        }
        
        // Build vocabulary and calculate IDF
        const tokenizedChunks = chunks.map((chunk) => tokenize(chunk.content));
        const idf = calculateIDF(tokenizedChunks);
        const vocabulary = Object.keys(idf);
        
        // Calculate TF-IDF for each chunk
        for (let i = 0; i < chunks.length; i++) {
          chunks[i].tfidfVector = calculateTFIDF(tokenizedChunks[i], idf);
        }
        
        // Create and save index
        const index: RAGIndex = {
          version: "1.0.0",
          createdAt: existingIndex?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          docsPath,
          chunks,
          vocabulary,
          idf,
          fileHashes,
        };
        
        await saveIndex(index);
        
        return formatToolResponse({
          success: true,
          message: "Documents indexed successfully",
          stats: {
            totalFiles: files.length,
            indexedFiles: indexedCount,
            skippedFiles: skippedCount,
            totalChunks: chunks.length,
            vocabularySize: vocabulary.length,
            indexPath: getIndexPath(),
          },
        });
      } catch (error: any) {
        return formatToolResponse({
          success: false,
          error: error.message,
        });
      }
    },
  },
  {
    name: "rag_search",
    description: "Search indexed documents using semantic similarity. Returns the most relevant document chunks based on the query. Requires documents to be indexed first using rag_index_documents.",
    inputSchema: z.object({
      query: z.string().describe("The search query to find relevant documents"),
      topK: z.number().describe("Number of top results to return (default: 5)").default(5).optional(),
      minScore: z.number().describe("Minimum similarity score threshold (0-1, default: 0.1)").default(0.1).optional(),
      fileFilter: z.string().describe("Optional regex pattern to filter results by file path").optional(),
    }),
    handler: async (args: any) => {
      if (!isRAGEnabled()) {
        return formatToolResponse({
          success: false,
          error: "RAG is not enabled. Set RAG_DOCS_PATH environment variable.",
        });
      }
      
      try {
        const index = await loadIndex();
        if (!index || index.chunks.length === 0) {
          return formatToolResponse({
            success: false,
            error: "No documents indexed. Run rag_index_documents first.",
          });
        }
        
        // Tokenize and vectorize query
        const queryTokens = tokenize(args.query);
        const queryVector = calculateTFIDF(queryTokens, index.idf);
        
        // Calculate similarity scores
        let results = index.chunks.map((chunk) => ({
          chunk,
          score: cosineSimilarity(queryVector, chunk.tfidfVector || new Map()),
        }));
        
        // Apply file filter if provided
        if (args.fileFilter) {
          const regex = new RegExp(args.fileFilter, "i");
          results = results.filter((r) => regex.test(r.chunk.filePath));
        }
        
        // Filter by minimum score and sort
        results = results
          .filter((r) => r.score >= (args.minScore || 0.1))
          .sort((a, b) => b.score - a.score)
          .slice(0, args.topK || 5);
        
        return formatToolResponse({
          success: true,
          query: args.query,
          totalChunksSearched: index.chunks.length,
          results: results.map((r) => ({
            filePath: r.chunk.filePath,
            fileName: r.chunk.metadata.fileName,
            score: Math.round(r.score * 1000) / 1000,
            lines: `${r.chunk.startLine}-${r.chunk.endLine}`,
            chunkInfo: `${r.chunk.metadata.chunkIndex + 1}/${r.chunk.metadata.totalChunks}`,
            content: r.chunk.content,
          })),
        });
      } catch (error: any) {
        return formatToolResponse({
          success: false,
          error: error.message,
        });
      }
    },
  },
  {
    name: "rag_get_context",
    description: "Get expanded context around a specific search result. Useful for getting more surrounding content from a document after finding a relevant chunk.",
    inputSchema: z.object({
      filePath: z.string().describe("Path to the file"),
      startLine: z.number().describe("Starting line number"),
      endLine: z.number().describe("Ending line number"),
      expandLines: z.number().describe("Number of lines to expand before and after (default: 20)").default(20).optional(),
    }),
    handler: async (args: any) => {
      try {
        const content = await fs.readFile(args.filePath, "utf8");
        const lines = content.split("\n");
        
        const expandBy = args.expandLines || 20;
        const start = Math.max(0, args.startLine - 1 - expandBy);
        const end = Math.min(lines.length, args.endLine + expandBy);
        
        const contextLines = lines.slice(start, end);
        
        return formatToolResponse({
          success: true,
          filePath: args.filePath,
          requestedLines: `${args.startLine}-${args.endLine}`,
          expandedLines: `${start + 1}-${end}`,
          totalLines: lines.length,
          content: contextLines.map((line, i) => ({
            lineNumber: start + i + 1,
            text: line,
            isOriginal: (start + i + 1) >= args.startLine && (start + i + 1) <= args.endLine,
          })),
        });
      } catch (error: any) {
        return formatToolResponse({
          success: false,
          error: error.message,
        });
      }
    },
  },
  {
    name: "rag_list_indexed",
    description: "List all indexed documents and their metadata. Shows what files are currently in the RAG index.",
    inputSchema: z.object({
      showChunks: z.boolean().describe("Include chunk details for each file (default: false)").default(false).optional(),
    }),
    handler: async (args: any) => {
      if (!isRAGEnabled()) {
        return formatToolResponse({
          success: false,
          error: "RAG is not enabled. Set RAG_DOCS_PATH environment variable.",
        });
      }
      
      try {
        const index = await loadIndex();
        if (!index) {
          return formatToolResponse({
            success: false,
            error: "No index found. Run rag_index_documents first.",
          });
        }
        
        // Group chunks by file
        const fileMap = new Map<string, DocumentChunk[]>();
        for (const chunk of index.chunks) {
          const existing = fileMap.get(chunk.filePath) || [];
          existing.push(chunk);
          fileMap.set(chunk.filePath, existing);
        }
        
        const files = Array.from(fileMap.entries()).map(([filePath, chunks]) => {
          const result: any = {
            filePath,
            fileName: path.basename(filePath),
            fileType: path.extname(filePath),
            chunkCount: chunks.length,
            totalLines: chunks[chunks.length - 1].endLine,
          };
          
          if (args.showChunks) {
            result.chunks = chunks.map((c) => ({
              id: c.id,
              lines: `${c.startLine}-${c.endLine}`,
              contentPreview: c.content.substring(0, 100) + (c.content.length > 100 ? "..." : ""),
            }));
          }
          
          return result;
        });
        
        return formatToolResponse({
          success: true,
          indexInfo: {
            version: index.version,
            createdAt: index.createdAt,
            updatedAt: index.updatedAt,
            docsPath: index.docsPath,
            totalFiles: files.length,
            totalChunks: index.chunks.length,
            vocabularySize: index.vocabulary.length,
          },
          files,
        });
      } catch (error: any) {
        return formatToolResponse({
          success: false,
          error: error.message,
        });
      }
    },
  },
  {
    name: "rag_clear_index",
    description: "Clear the RAG index. This removes all indexed documents and requires re-indexing.",
    inputSchema: z.object({
      confirm: z.boolean().describe("Must be true to confirm clearing the index"),
    }),
    handler: async (args: any) => {
      if (!args.confirm) {
        return formatToolResponse({
          success: false,
          error: "Must set confirm: true to clear the index",
        });
      }
      
      try {
        const indexPath = path.join(getIndexPath(), "index.json");
        await fs.unlink(indexPath);
        indexCache = null;
        
        return formatToolResponse({
          success: true,
          message: "RAG index cleared successfully",
        });
      } catch (error: any) {
        if (error.code === "ENOENT") {
          return formatToolResponse({
            success: true,
            message: "No index to clear",
          });
        }
        return formatToolResponse({
          success: false,
          error: error.message,
        });
      }
    },
  },
  {
    name: "rag_status",
    description: "Check the status of the RAG system, including whether it's enabled and index statistics.",
    inputSchema: z.object({}),
    handler: async () => {
      const enabled = isRAGEnabled();
      
      if (!enabled) {
        return formatToolResponse({
          success: true,
          enabled: false,
          message: "RAG is not enabled. Set RAG_DOCS_PATH environment variable to enable.",
          configuration: {
            RAG_DOCS_PATH: RAG_DOCS_PATH || "(not set)",
          },
        });
      }
      
      try {
        const index = await loadIndex();
        
        return formatToolResponse({
          success: true,
          enabled: true,
          indexed: !!index,
          configuration: {
            RAG_DOCS_PATH,
            indexPath: getIndexPath(),
          },
          indexStats: index ? {
            version: index.version,
            createdAt: index.createdAt,
            updatedAt: index.updatedAt,
            totalFiles: Object.keys(index.fileHashes).length,
            totalChunks: index.chunks.length,
            vocabularySize: index.vocabulary.length,
          } : null,
        });
      } catch (error: any) {
        return formatToolResponse({
          success: false,
          enabled: true,
          error: error.message,
        });
      }
    },
  },
];
