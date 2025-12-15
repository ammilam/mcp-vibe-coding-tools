import * as fs from "fs/promises";
import * as path from "path";
import { glob } from "glob";
import { z } from "zod";
import { formatToolResponse } from "../utils/response.js";

const workspacePath = process.env.WORKSPACE_PATH || process.cwd();

// Validate paths to prevent directory traversal
function validatePath(inputPath: string): string {
  const resolvedPath = path.resolve(workspacePath, inputPath);
  if (!resolvedPath.startsWith(workspacePath)) {
    throw new Error("Access denied: Path outside workspace");
  }
  return resolvedPath;
}

export const filesystemTools = [
  {
    name: "read_file",
    description: "Read the contents of a file",
    inputSchema: z.object({
      path: z.string().describe("Path to the file relative to workspace"),
      encoding: z.string().describe("File encoding (default: utf8)").default("utf8").optional(),
    }),
    handler: async (args: any) => {
      const validPath = validatePath(args.path);
      const content = await fs.readFile(validPath, args.encoding || "utf8");
      const result = {
        success: true,
        path: args.path,
        content: content.toString(),
        size: content.length,
      };
      return formatToolResponse(result);
    },
  },
  {
    name: "write_file",
    description: "Write content to a file (creates or overwrites)",
    inputSchema: z.object({
      path: z.string().describe("Path to the file relative to workspace"),
      content: z.string().describe("Content to write to the file"),
      encoding: z.string().describe("File encoding (default: utf8)").default("utf8").optional(),
    }),
    handler: async (args: any) => {
      const validPath = validatePath(args.path);
      await fs.mkdir(path.dirname(validPath), { recursive: true });
      await fs.writeFile(validPath, args.content, args.encoding || "utf8");
      const result = {
        success: true,
        path: args.path,
        size: args.content.length,
      };
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  },
  {
    name: "list_directory",
    description: "List contents of a directory",
    inputSchema: z.object({
      path: z.string().describe("Path to the directory relative to workspace (default: .)").default(".").optional(),
      recursive: z.boolean().describe("List subdirectories recursively").default(false).optional(),
    }),
    handler: async (args: any) => {
      const validPath = validatePath(args.path || ".");
      const entries = await fs.readdir(validPath, { withFileTypes: true });
      
      let items = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(validPath, entry.name);
          const stats = await fs.stat(fullPath);
          return {
            name: entry.name,
            type: entry.isDirectory() ? "directory" : "file",
            size: stats.size,
            modified: stats.mtime,
          };
        })
      );

      if (args.recursive) {
        const subdirs = items.filter((item) => item.type === "directory");
        for (const subdir of subdirs) {
          const subItems: any = await filesystemTools[2].handler({
            path: path.join(args.path || ".", subdir.name),
            recursive: true,
          });
          if (subItems.items) {
            items = [...items, ...subItems.items.map((item: any) => ({
              ...item,
              name: path.join(subdir.name, item.name),
            }))];
          }
        }
      }

      const result = {
        success: true,
        path: args.path || ".",
        items,
      };
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  },
  {
    name: "search_files",
    description: "Search for files using glob patterns",
    inputSchema: z.object({
      pattern: z.string().describe("Glob pattern to search for (e.g., '**/*.ts')"),
      ignore: z.array(z.string()).describe("Patterns to ignore").default(["node_modules/**", ".git/**"]).optional(),
    }),
    handler: async (args: any) => {
      const files = await glob(args.pattern, {
        cwd: workspacePath,
        ignore: args.ignore || ["node_modules/**", ".git/**"],
      });
      
      const result = {
        success: true,
        pattern: args.pattern,
        files,
        count: files.length,
      };
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  },
  {
    name: "file_info",
    description: "Get detailed information about a file or directory",
    inputSchema: z.object({
      path: z.string().describe("Path to the file or directory"),
    }),
    handler: async (args: any) => {
      const validPath = validatePath(args.path);
      const stats = await fs.stat(validPath);
      
      const result = {
        success: true,
        path: args.path,
        type: stats.isDirectory() ? "directory" : "file",
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        permissions: stats.mode.toString(8),
      };
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  },
  {
    name: "create_directory",
    description: "Create a new directory (and parent directories if needed)",
    inputSchema: z.object({
      path: z.string().describe("Path to the directory to create"),
    }),
    handler: async (args: any) => {
      const validPath = validatePath(args.path);
      await fs.mkdir(validPath, { recursive: true });
      
      const result = {
        success: true,
        path: args.path,
      };
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  },
];
