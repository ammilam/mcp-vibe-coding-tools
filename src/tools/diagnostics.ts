import * as fs from "fs/promises";
import * as path from "path";
import { formatToolResponse } from "../utils/response.js";
import { glob } from "glob";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const workspacePath = process.env.WORKSPACE_PATH || process.cwd();

export const diagnosticsTools = [
  {
    name: "get_vscode_problems",
    description: "Get compilation errors, linting issues, and other problems from VS Code diagnostics by running TypeScript and ESLint checks",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Optional file path to filter problems for specific file",
        },
        severity: {
          type: "string",
          enum: ["error", "warning", "info", "all"],
          description: "Filter by severity level",
          default: "all",
        },
      },
    },
    handler: async (args: any) => {
      try {
        const problems: any[] = [];

        // Check TypeScript compilation errors
        try {
          const { stdout, stderr } = await execAsync("tsc --noEmit", {
            cwd: workspacePath,
          });
          if (stderr) {
            const lines = stderr.split("\n").filter((line) => line.trim());
            lines.forEach((line) => {
              if (line.includes("error TS")) {
                const match = line.match(/(.+)\((\d+),(\d+)\): error TS(\d+): (.+)/);
                if (match) {
                  problems.push({
                    file: match[1],
                    line: parseInt(match[2]),
                    column: parseInt(match[3]),
                    code: `TS${match[4]}`,
                    message: match[5],
                    severity: "error",
                    source: "typescript",
                  });
                }
              }
            });
          }
        } catch (error: any) {
          // TypeScript errors are thrown as exceptions
          if (error.stdout || error.stderr) {
            const output = error.stdout || error.stderr;
            const lines = output.split("\n").filter((line: string) => line.trim());
            lines.forEach((line: string) => {
              if (line.includes("error TS")) {
                const match = line.match(/(.+)\((\d+),(\d+)\): error TS(\d+): (.+)/);
                if (match) {
                  problems.push({
                    file: match[1],
                    line: parseInt(match[2]),
                    column: parseInt(match[3]),
                    code: `TS${match[4]}`,
                    message: match[5],
                    severity: "error",
                    source: "typescript",
                  });
                }
              }
            });
          }
        }

        // Check ESLint issues
        try {
          const { stdout } = await execAsync("eslint . --format json", {
            cwd: workspacePath,
          });
          const eslintResults = JSON.parse(stdout);
          eslintResults.forEach((result: any) => {
            result.messages?.forEach((msg: any) => {
              problems.push({
                file: result.filePath.replace(workspacePath + "/", ""),
                line: msg.line,
                column: msg.column,
                code: msg.ruleId,
                message: msg.message,
                severity: msg.severity === 2 ? "error" : "warning",
                source: "eslint",
              });
            });
          });
        } catch (error) {
          // ESLint not configured or no issues
        }

        // Filter by file if specified
        let filteredProblems = problems;
        if (args.filePath) {
          filteredProblems = problems.filter((p: any) =>
            p.file.includes(args.filePath)
          );
        }

        // Filter by severity
        if (args.severity !== "all") {
          filteredProblems = filteredProblems.filter(
            (p: any) => p.severity === args.severity
          );
        }

        return formatToolResponse({
          success: true,
          problemCount: filteredProblems.length,
          problems: filteredProblems,
          summary: {
            errors: filteredProblems.filter((p: any) => p.severity === "error").length,
            warnings: filteredProblems.filter((p: any) => p.severity === "warning")
              .length,
            info: filteredProblems.filter((p: any) => p.severity === "info").length,
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
    name: "read_log_file",
    description: "Read and parse log files with optional filtering and tail support",
    inputSchema: {
      type: "object",
      properties: {
        logPath: {
          type: "string",
          description: "Path to log file (relative to workspace)",
        },
        lines: {
          type: "number",
          description: "Number of lines to read from end (tail -n)",
          default: 100,
        },
        filter: {
          type: "string",
          description: "Filter logs by string/regex pattern",
        },
        level: {
          type: "string",
          enum: ["ERROR", "WARN", "INFO", "DEBUG", "TRACE"],
          description: "Filter by log level",
        },
      },
      required: ["logPath"],
    },
    handler: async (args: any) => {
      try {
        const logPath = path.join(workspacePath, args.logPath);
        const content = await fs.readFile(logPath, "utf8");
        const allLines = content.split("\n");
        
        // Get last N lines (tail)
        let lines = allLines.slice(-args.lines || -100);
        
        // Filter by log level
        if (args.level) {
          lines = lines.filter((line) =>
            line.includes(args.level) || 
            line.toLowerCase().includes(args.level.toLowerCase())
          );
        }
        
        // Filter by pattern
        if (args.filter) {
          const regex = new RegExp(args.filter, "i");
          lines = lines.filter((line) => regex.test(line));
        }
        
        // Parse structured logs if possible
        const parsedLines = lines.map((line) => {
          // Try to parse JSON logs
          if (line.trim().startsWith("{")) {
            try {
              return JSON.parse(line);
            } catch {
              return { raw: line };
            }
          }
          
          // Try to parse common log formats
          const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})/);
          const levelMatch = line.match(/\[(ERROR|WARN|INFO|DEBUG|TRACE)\]/i);
          
          return {
            timestamp: timestampMatch ? timestampMatch[1] : null,
            level: levelMatch ? levelMatch[1].toUpperCase() : null,
            message: line,
          };
        });
        
        return formatToolResponse({
          success: true,
          logPath: args.logPath,
          totalLines: allLines.length,
          returnedLines: lines.length,
          logs: parsedLines,
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
    name: "find_log_files",
    description: "Find all log files in the workspace",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Glob pattern for log files",
          default: "**/*.log",
        },
        includeNodeModules: {
          type: "boolean",
          description: "Include logs in node_modules",
          default: false,
        },
      },
    },
    handler: async (args: any) => {
      try {
        const ignore = args.includeNodeModules
          ? [".git/**"]
          : ["node_modules/**", ".git/**", "dist/**", "build/**"];
        
        const logFiles = await glob(args.pattern || "**/*.log", {
          cwd: workspacePath,
          ignore,
        });
        
        // Get file sizes and modification times
        const fileDetails = await Promise.all(
          logFiles.map(async (file) => {
            const fullPath = path.join(workspacePath, file);
            const stats = await fs.stat(fullPath);
            return {
              path: file,
              size: stats.size,
              modified: stats.mtime,
              sizeHuman: `${(stats.size / 1024).toFixed(2)} KB`,
            };
          })
        );
        
        return formatToolResponse({
          success: true,
          pattern: args.pattern || "**/*.log",
          found: fileDetails.length,
          logFiles: fileDetails.sort((a, b) => b.modified.getTime() - a.modified.getTime()),
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
    name: "analyze_error_logs",
    description: "Analyze log files for errors, exceptions, and common issues",
    inputSchema: {
      type: "object",
      properties: {
        logPath: {
          type: "string",
          description: "Path to log file to analyze",
        },
        extractStackTraces: {
          type: "boolean",
          description: "Extract and parse stack traces",
          default: true,
        },
      },
      required: ["logPath"],
    },
    handler: async (args: any) => {
      try {
        const logPath = path.join(workspacePath, args.logPath);
        const content = await fs.readFile(logPath, "utf8");
        const lines = content.split("\n");
        
        const analysis = {
          totalLines: lines.length,
          errors: [] as any[],
          warnings: [] as any[],
          exceptions: [] as any[],
          stackTraces: [] as any[],
          errorPatterns: {} as Record<string, number>,
        };
        
        let currentStackTrace: string[] = [];
        let inStackTrace = false;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Detect errors
          if (/\b(ERROR|FATAL|CRITICAL)\b/i.test(line)) {
            analysis.errors.push({
              line: i + 1,
              content: line.trim(),
            });
            
            // Extract error pattern
            const errorMatch = line.match(/Error:\s*(.+?)(\s|$)/);
            if (errorMatch) {
              const errorType = errorMatch[1];
              analysis.errorPatterns[errorType] = (analysis.errorPatterns[errorType] || 0) + 1;
            }
          }
          
          // Detect warnings
          if (/\b(WARN|WARNING)\b/i.test(line)) {
            analysis.warnings.push({
              line: i + 1,
              content: line.trim(),
            });
          }
          
          // Detect exceptions
          if (/Exception|Error:/.test(line)) {
            analysis.exceptions.push({
              line: i + 1,
              type: line.match(/(\w+Exception|\w+Error)/)?.[1] || "Unknown",
              content: line.trim(),
            });
            
            if (args.extractStackTraces) {
              inStackTrace = true;
              currentStackTrace = [line];
            }
          }
          
          // Collect stack trace lines
          if (inStackTrace) {
            if (/^\s+at\s/.test(line) || /^\s+\w+\./.test(line)) {
              currentStackTrace.push(line);
            } else if (currentStackTrace.length > 0) {
              analysis.stackTraces.push({
                startLine: i - currentStackTrace.length + 1,
                trace: currentStackTrace.join("\n"),
              });
              currentStackTrace = [];
              inStackTrace = false;
            }
          }
        }
        
        // Get top error patterns
        const topErrors = Object.entries(analysis.errorPatterns)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10);
        
        return formatToolResponse({
          success: true,
          logPath: args.logPath,
          analysis: {
            ...analysis,
            topErrorPatterns: topErrors.map(([error, count]) => ({ error, count })),
            summary: {
              totalErrors: analysis.errors.length,
              totalWarnings: analysis.warnings.length,
              totalExceptions: analysis.exceptions.length,
              totalStackTraces: analysis.stackTraces.length,
            },
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
    name: "watch_log_changes",
    description: "Get recent changes/additions to a log file (simulates tail -f)",
    inputSchema: {
      type: "object",
      properties: {
        logPath: {
          type: "string",
          description: "Path to log file",
        },
        lastReadPosition: {
          type: "number",
          description: "Last byte position read (for incremental reads)",
          default: 0,
        },
        maxBytes: {
          type: "number",
          description: "Maximum bytes to read from current position",
          default: 10240,
        },
      },
      required: ["logPath"],
    },
    handler: async (args: any) => {
      try {
        const logPath = path.join(workspacePath, args.logPath);
        const stats = await fs.stat(logPath);
        const fileHandle = await fs.open(logPath, "r");
        
        const startPosition = args.lastReadPosition || Math.max(0, stats.size - (args.maxBytes || 10240));
        const endPosition = stats.size;
        const bytesToRead = endPosition - startPosition;
        
        if (bytesToRead <= 0) {
          await fileHandle.close();
          return formatToolResponse({
            success: true,
            logPath: args.logPath,
            newContent: "",
            newLines: [],
            currentSize: stats.size,
            nextReadPosition: stats.size,
            message: "No new content since last read",
          });
        }
        
        const buffer = Buffer.alloc(bytesToRead);
        await fileHandle.read(buffer, 0, bytesToRead, startPosition);
        await fileHandle.close();
        
        const content = buffer.toString("utf8");
        const lines = content.split("\n").filter(Boolean);
        
        return formatToolResponse({
          success: true,
          logPath: args.logPath,
          newContent: content,
          newLines: lines,
          linesRead: lines.length,
          bytesRead: bytesToRead,
          currentSize: stats.size,
          nextReadPosition: stats.size,
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
    name: "aggregate_logs",
    description: "Aggregate and analyze multiple log files together",
    inputSchema: {
      type: "object",
      properties: {
        logPattern: {
          type: "string",
          description: "Glob pattern to match log files",
          default: "**/*.log",
        },
        timeRange: {
          type: "object",
          properties: {
            start: {
              type: "string",
              description: "Start time (ISO 8601)",
            },
            end: {
              type: "string",
              description: "End time (ISO 8601)",
            },
          },
        },
        groupBy: {
          type: "string",
          enum: ["level", "file", "hour", "day"],
          description: "How to group log entries",
          default: "level",
        },
      },
    },
    handler: async (args: any) => {
      try {
        const logFiles = await glob(args.logPattern || "**/*.log", {
          cwd: workspacePath,
          ignore: ["node_modules/**", ".git/**"],
        });
        
        const aggregated = {
          files: logFiles.length,
          entries: [] as any[],
          byLevel: {} as Record<string, number>,
          byFile: {} as Record<string, number>,
          byHour: {} as Record<string, number>,
          timeRange: {
            earliest: null as Date | null,
            latest: null as Date | null,
          },
        };
        
        for (const file of logFiles) {
          const fullPath = path.join(workspacePath, file);
          const content = await fs.readFile(fullPath, "utf8");
          const lines = content.split("\n").filter(Boolean);
          
          aggregated.byFile[file] = lines.length;
          
          for (const line of lines) {
            // Try to parse timestamp
            const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})/);
            const levelMatch = line.match(/\[(ERROR|WARN|INFO|DEBUG|TRACE)\]/i);
            
            if (levelMatch) {
              const level = levelMatch[1].toUpperCase();
              aggregated.byLevel[level] = (aggregated.byLevel[level] || 0) + 1;
            }
            
            if (timestampMatch) {
              const timestamp = new Date(timestampMatch[1]);
              const hour = timestamp.toISOString().substring(0, 13);
              aggregated.byHour[hour] = (aggregated.byHour[hour] || 0) + 1;
              
              if (!aggregated.timeRange.earliest || timestamp < aggregated.timeRange.earliest) {
                aggregated.timeRange.earliest = timestamp;
              }
              if (!aggregated.timeRange.latest || timestamp > aggregated.timeRange.latest) {
                aggregated.timeRange.latest = timestamp;
              }
            }
          }
        }
        
        return formatToolResponse({
          success: true,
          pattern: args.logPattern,
          aggregated: {
            ...aggregated,
            totalEntries: Object.values(aggregated.byFile).reduce((a, b) => a + b, 0),
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
    name: "get_terminal_history",
    description: "Get recent terminal command history from shell (zsh/bash)",
    inputSchema: {
      type: "object",
      properties: {
        lines: {
          type: "number",
          description: "Number of recent commands to retrieve",
          default: 20,
        },
        filter: {
          type: "string",
          description: "Optional filter pattern for commands",
        },
      },
    },
    handler: async (args: any) => {
      try {
        // Try to read shell history
        const homeDir = process.env.HOME || process.env.USERPROFILE || "";
        const historyFiles = [
          path.join(homeDir, ".zsh_history"),
          path.join(homeDir, ".bash_history"),
          path.join(homeDir, ".history"),
        ];

        let history: any[] = [];
        for (const histFile of historyFiles) {
          try {
            const content = await fs.readFile(histFile, "utf8");
            const lines = content.split("\n").filter((line) => line.trim());

            // Parse zsh extended history format
            const commands = lines.map((line) => {
              // zsh format: : timestamp:duration;command
              const match = line.match(/^: (\d+):(\d+);(.+)$/);
              if (match) {
                return {
                  timestamp: new Date(parseInt(match[1]) * 1000).toISOString(),
                  command: match[3],
                };
              }
              return { command: line };
            });

            history = commands;
            break; // Use first found history file
          } catch {
            continue;
          }
        }

        // Filter if pattern provided
        if (args.filter) {
          const filterRegex = new RegExp(args.filter, "i");
          history = history.filter((entry) =>
            filterRegex.test(entry.command)
          );
        }

        // Get last N commands
        const recentHistory = history.slice(-(args.lines || 20));

        return formatToolResponse({
          success: true,
          commandCount: recentHistory.length,
          commands: recentHistory,
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
    name: "search_logs",
    description: "Search through all log files in workspace for specific patterns with context",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Search pattern (supports regex)",
        },
        logDir: {
          type: "string",
          description: "Directory to search for logs (default: workspace root)",
          default: ".",
        },
        filePattern: {
          type: "string",
          description: "File pattern for log files (default: *.log)",
          default: "*.log",
        },
        contextLines: {
          type: "number",
          description: "Number of context lines before/after match",
          default: 2,
        },
      },
      required: ["pattern"],
    },
    handler: async (args: any) => {
      try {
        const searchDir = path.join(workspacePath, args.logDir || ".");
        const { stdout } = await execAsync(
          `grep -r -n -C ${args.contextLines || 2} "${args.pattern}" --include="${
            args.filePattern || "*.log"
          }" "${searchDir}" || true`,
          { cwd: workspacePath }
        );

        const matches: any[] = [];
        const lines = stdout.split("\n").filter((line) => line.trim());

        let currentFile = "";
        let currentMatch: any = null;

        for (const line of lines) {
          if (line.includes(":")) {
            const parts = line.split(":");
            if (parts.length >= 3) {
              const file = parts[0];
              const lineNum = parts[1];
              const content = parts.slice(2).join(":");

              if (file !== currentFile) {
                if (currentMatch) {
                  matches.push(currentMatch);
                }
                currentFile = file;
                currentMatch = {
                  file: file.replace(workspacePath + "/", ""),
                  lineNumber: parseInt(lineNum),
                  context: [],
                };
              }

              if (currentMatch) {
                currentMatch.context.push({
                  line: parseInt(lineNum),
                  content: content.trim(),
                  isMatch: content.includes(args.pattern),
                });
              }
            }
          }
        }

        if (currentMatch) {
          matches.push(currentMatch);
        }

        return formatToolResponse({
          success: true,
          pattern: args.pattern,
          matchCount: matches.length,
          matches,
        });
      } catch (error: any) {
        return formatToolResponse({
          success: false,
          error: error.message,
        });
      }
    },
  },
];
