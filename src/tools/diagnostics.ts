import * as fs from "fs/promises";
import * as path from "path";
import { formatToolResponse } from "../utils/response.js";
import { glob } from "glob";
import { exec } from "child_process";
import { promisify } from "util";
import { z } from "zod";

const execAsync = promisify(exec);
const workspacePath = process.env.WORKSPACE_PATH || process.cwd();

export const diagnosticsTools = [
  {
    name: "get_vscode_problems",
    description: "Get compilation errors, linting issues, and other problems from VS Code diagnostics by running TypeScript and ESLint checks",
    inputSchema: z.object({
      filePath: z.string().describe("Optional file path to filter problems for specific file").optional(),
      severity: z.enum(["error", "warning", "info", "all"]).describe("Filter by severity level").default("all").optional(),
    }),
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
    inputSchema: z.object({
      logPath: z.string().describe("Path to log file (relative to workspace)"),
      lines: z.number().describe("Number of lines to read from end (tail -n)").default(100).optional(),
      filter: z.string().describe("Filter logs by string/regex pattern").optional(),
      level: z.enum(["ERROR", "WARN", "INFO", "DEBUG", "TRACE"]).describe("Filter by log level").optional(),
    }),
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
    inputSchema: z.object({
      pattern: z.string().describe("Glob pattern for log files").default("**/*.log").optional(),
      includeNodeModules: z.boolean().describe("Include logs in node_modules").default(false).optional(),
    }),
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
    inputSchema: z.object({
      logPath: z.string().describe("Path to log file to analyze"),
      extractStackTraces: z.boolean().describe("Extract and parse stack traces").default(true).optional(),
    }),
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
    inputSchema: z.object({
      logPath: z.string().describe("Path to log file"),
      lastReadPosition: z.number().describe("Last byte position read (for incremental reads)").default(0).optional(),
      maxBytes: z.number().describe("Maximum bytes to read from current position").default(10240).optional(),
    }),
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
    inputSchema: z.object({
      logPattern: z.string().describe("Glob pattern to match log files").default("**/*.log").optional(),
      timeRange: z.object({
        start: z.string().describe("Start time (ISO 8601)").optional(),
        end: z.string().describe("End time (ISO 8601)").optional(),
      }).optional(),
      groupBy: z.enum(["level", "file", "hour", "day"]).describe("How to group log entries").default("level").optional(),
    }),
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
    inputSchema: z.object({
      lines: z.number().describe("Number of recent commands to retrieve").default(20).optional(),
      filter: z.string().describe("Optional filter pattern for commands").optional(),
    }),
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
    inputSchema: z.object({
      pattern: z.string().describe("Search pattern (supports regex)"),
      logDir: z.string().describe("Directory to search for logs (default: workspace root)").default(".").optional(),
      filePattern: z.string().describe("File pattern for log files (default: *.log)").default("*.log").optional(),
      contextLines: z.number().describe("Number of context lines before/after match").default(2).optional(),
    }),
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
  {
    name: "get_xcode_logs",
    description: "Get Xcode build logs, crash logs, and simulator logs for iOS/macOS development",
    inputSchema: z.object({
      logType: z.enum(["build", "simulator", "crash", "device", "all"]).describe("Type of Xcode logs to retrieve").default("all").optional(),
      lines: z.number().describe("Number of recent log lines to retrieve").default(100).optional(),
      filter: z.string().describe("Filter logs by keyword or pattern").optional(),
    }),
    handler: async (args: any) => {
      try {
        const logs: any = {
          logType: args.logType || "all",
          entries: [],
        };

        // Build logs - check DerivedData
        if (args.logType === "build" || args.logType === "all") {
          try {
            const derivedDataPath = `${process.env.HOME}/Library/Developer/Xcode/DerivedData`;
            const { stdout } = await execAsync(
              `find "${derivedDataPath}" -name "*.xcactivitylog" -type f -mtime -1 | head -5`
            );
            
            if (stdout.trim()) {
              const logFiles = stdout.trim().split("\n");
              for (const logFile of logFiles) {
                try {
                  // Use xcactivitylog to parse binary logs
                  const { stdout: content } = await execAsync(
                    `strings "${logFile}" | tail -${args.lines}`
                  );
                  if (content) {
                    logs.entries.push({
                      type: "build",
                      file: logFile.replace(derivedDataPath, "~/Library/Developer/Xcode/DerivedData"),
                      content: content.split("\n").filter(line => 
                        !args.filter || line.toLowerCase().includes(args.filter.toLowerCase())
                      ),
                    });
                  }
                } catch (e) {
                  // Skip if can't read log
                }
              }
            }
          } catch (e) {
            logs.entries.push({
              type: "build",
              note: "No recent build logs found or Xcode not installed",
            });
          }
        }

        // Simulator logs
        if (args.logType === "simulator" || args.logType === "all") {
          try {
            const { stdout } = await execAsync(
              `xcrun simctl spawn booted log stream --level debug --style compact 2>&1 | head -${args.lines}`,
              { timeout: 2000 }
            );
            
            if (stdout) {
              const filteredLines = stdout.split("\n").filter(line => 
                !args.filter || line.toLowerCase().includes(args.filter.toLowerCase())
              );
              
              if (filteredLines.length > 0) {
                logs.entries.push({
                  type: "simulator",
                  content: filteredLines,
                });
              }
            }
          } catch (e: any) {
            logs.entries.push({
              type: "simulator",
              note: "No simulator running or not accessible",
            });
          }
        }

        // Crash logs
        if (args.logType === "crash" || args.logType === "all") {
          try {
            const crashLogsPath = `${process.env.HOME}/Library/Logs/DiagnosticReports`;
            const { stdout } = await execAsync(
              `find "${crashLogsPath}" -name "*.crash" -o -name "*.ips" | sort -r | head -5`
            );
            
            if (stdout.trim()) {
              const crashFiles = stdout.trim().split("\n");
              for (const crashFile of crashFiles.slice(0, 3)) {
                try {
                  const content = await fs.readFile(crashFile, "utf-8");
                  const lines = content.split("\n").slice(0, args.lines);
                  const filteredLines = lines.filter(line => 
                    !args.filter || line.toLowerCase().includes(args.filter.toLowerCase())
                  );
                  
                  logs.entries.push({
                    type: "crash",
                    file: crashFile.replace(process.env.HOME!, "~"),
                    content: filteredLines,
                  });
                } catch (e) {
                  // Skip if can't read crash log
                }
              }
            }
          } catch (e) {
            logs.entries.push({
              type: "crash",
              note: "No crash logs found",
            });
          }
        }

        // Device logs (requires connected device)
        if (args.logType === "device" || args.logType === "all") {
          try {
            const { stdout } = await execAsync(
              `idevicesyslog --no-colors 2>&1 | head -${args.lines}`,
              { timeout: 3000 }
            );
            
            if (stdout && !stdout.includes("No device found")) {
              const filteredLines = stdout.split("\n").filter(line => 
                !args.filter || line.toLowerCase().includes(args.filter.toLowerCase())
              );
              
              logs.entries.push({
                type: "device",
                content: filteredLines,
              });
            }
          } catch (e) {
            logs.entries.push({
              type: "device",
              note: "No device connected or libimobiledevice not installed (brew install libimobiledevice)",
            });
          }
        }

        return formatToolResponse({
          success: true,
          ...logs,
          totalEntries: logs.entries.length,
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
    name: "get_android_logs",
    description: "Get Android logcat logs, build logs, and device logs for Android development",
    inputSchema: z.object({
      logType: z.enum(["logcat", "build", "gradle", "all"]).describe("Type of Android logs to retrieve").default("logcat").optional(),
      priority: z.enum(["V", "D", "I", "W", "E", "F", "all"]).describe("Logcat priority level (Verbose, Debug, Info, Warning, Error, Fatal)").default("all").optional(),
      tag: z.string().describe("Filter logcat by tag").optional(),
      lines: z.number().describe("Number of recent log lines to retrieve").default(100).optional(),
    }),
    handler: async (args: any) => {
      try {
        const logs: any = {
          logType: args.logType || "logcat",
          entries: [],
        };

        // Logcat - live device/emulator logs
        if (args.logType === "logcat" || args.logType === "all") {
          try {
            // Check if adb is available
            await execAsync("which adb");
            
            let logcatCmd = "adb logcat -d";
            
            // Add priority filter
            if (args.priority && args.priority !== "all") {
              logcatCmd += ` *:${args.priority}`;
            }
            
            // Add tag filter
            if (args.tag) {
              logcatCmd += ` -s ${args.tag}`;
            }
            
            logcatCmd += ` | tail -${args.lines}`;
            
            const { stdout } = await execAsync(logcatCmd);
            
            if (stdout) {
              const lines = stdout.split("\n").filter(line => line.trim());
              const parsedLogs = lines.map(line => {
                // Parse logcat format: timestamp PID-TID/package priority/tag: message
                const match = line.match(/(\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+)\s+(\d+)\s+(\d+)\s+([VDIWEF])\s+(.+?):\s+(.+)/);
                if (match) {
                  return {
                    timestamp: match[1],
                    pid: match[2],
                    tid: match[3],
                    priority: match[4],
                    tag: match[5],
                    message: match[6],
                  };
                }
                return { raw: line };
              });
              
              logs.entries.push({
                type: "logcat",
                count: parsedLogs.length,
                logs: parsedLogs,
              });
            }
          } catch (e: any) {
            logs.entries.push({
              type: "logcat",
              note: e.message.includes("not found") 
                ? "adb not found - install Android SDK platform-tools"
                : "No device/emulator connected or adb error",
            });
          }
        }

        // Gradle build logs
        if (args.logType === "build" || args.logType === "gradle" || args.logType === "all") {
          try {
            // Check for recent Gradle build logs
            const gradleLogsPath = `${workspacePath}/.gradle`;
            const buildLogsPath = `${workspacePath}/build`;
            
            const logPaths = [
              `${gradleLogsPath}/daemon/*/daemon-*.out.log`,
              `${buildLogsPath}/outputs/logs/*.txt`,
            ];
            
            for (const pattern of logPaths) {
              try {
                const files = await glob(pattern, { absolute: true });
                const sortedFiles = files.sort((a, b) => {
                  try {
                    const statA = require("fs").statSync(a);
                    const statB = require("fs").statSync(b);
                    return statB.mtimeMs - statA.mtimeMs;
                  } catch {
                    return 0;
                  }
                });
                
                for (const file of sortedFiles.slice(0, 2)) {
                  try {
                    const content = await fs.readFile(file, "utf-8");
                    const lines = content.split("\n").slice(-args.lines);
                    
                    logs.entries.push({
                      type: "gradle",
                      file: file.replace(workspacePath, "."),
                      lines: lines.filter(l => l.trim()),
                    });
                  } catch (e) {
                    // Skip if can't read
                  }
                }
              } catch (e) {
                // No logs found for this pattern
              }
            }
            
            if (logs.entries.filter((e: any) => e.type === "gradle").length === 0) {
              logs.entries.push({
                type: "gradle",
                note: "No Gradle build logs found",
              });
            }
          } catch (e: any) {
            logs.entries.push({
              type: "gradle",
              note: "Error reading Gradle logs",
            });
          }
        }

        return formatToolResponse({
          success: true,
          ...logs,
          totalEntries: logs.entries.length,
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
    name: "get_flutter_logs",
    description: "Get Flutter application logs and DevTools logs",
    inputSchema: z.object({
      lines: z.number().describe("Number of recent log lines to retrieve").default(100).optional(),
      verbose: z.boolean().describe("Include verbose debugging information").default(false).optional(),
    }),
    handler: async (args: any) => {
      try {
        const logs: any = {
          entries: [],
        };

        // Check if flutter is available
        try {
          await execAsync("which flutter");
        } catch (e) {
          return formatToolResponse({
            success: false,
            error: "Flutter not found - install Flutter SDK",
          });
        }

        // Get flutter doctor output for diagnostics
        try {
          const { stdout } = await execAsync("flutter doctor");
          logs.entries.push({
            type: "doctor",
            content: stdout.split("\n"),
          });
        } catch (e: any) {
          logs.entries.push({
            type: "doctor",
            note: "Could not run flutter doctor",
          });
        }

        // Try to get logs from running flutter app
        try {
          const verboseFlag = args.verbose ? "-v" : "";
          const { stdout } = await execAsync(
            `flutter logs ${verboseFlag} 2>&1 | head -${args.lines}`,
            { timeout: 3000 }
          );
          
          if (stdout) {
            logs.entries.push({
              type: "app",
              content: stdout.split("\n").filter(line => line.trim()),
            });
          }
        } catch (e: any) {
          logs.entries.push({
            type: "app",
            note: "No Flutter app running or timed out",
          });
        }

        return formatToolResponse({
          success: true,
          ...logs,
          totalEntries: logs.entries.length,
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
    name: "get_react_native_logs",
    description: "Get React Native Metro bundler and application logs",
    inputSchema: z.object({
      logType: z.enum(["metro", "ios", "android", "all"]).describe("Type of React Native logs to retrieve").default("all").optional(),
      lines: z.number().describe("Number of recent log lines to retrieve").default(100).optional(),
    }),
    handler: async (args: any) => {
      try {
        const logs: any = {
          logType: args.logType || "all",
          entries: [],
        };

        // Metro bundler logs
        if (args.logType === "metro" || args.logType === "all") {
          try {
            // Check for Metro process
            const { stdout } = await execAsync("pgrep -fl 'react-native.*start' || pgrep -fl 'metro'");
            
            if (stdout) {
              logs.entries.push({
                type: "metro",
                note: "Metro bundler running",
                processes: stdout.split("\n").filter(l => l.trim()),
              });
              
              // Try to get Metro logs from common log locations
              const metroLogPaths = [
                `${workspacePath}/metro.log`,
                `${workspacePath}/.metro/metro.log`,
              ];
              
              for (const logPath of metroLogPaths) {
                try {
                  const content = await fs.readFile(logPath, "utf-8");
                  const lines = content.split("\n").slice(-args.lines);
                  logs.entries.push({
                    type: "metro",
                    file: logPath.replace(workspacePath, "."),
                    content: lines.filter(l => l.trim()),
                  });
                  break;
                } catch (e) {
                  // Try next path
                }
              }
            } else {
              logs.entries.push({
                type: "metro",
                note: "Metro bundler not running",
              });
            }
          } catch (e) {
            logs.entries.push({
              type: "metro",
              note: "Metro bundler not running",
            });
          }
        }

        // iOS logs (if running on iOS)
        if (args.logType === "ios" || args.logType === "all") {
          try {
            const { stdout } = await execAsync(
              `xcrun simctl spawn booted log stream --predicate 'processImagePath contains "Runner"' --style compact 2>&1 | head -${args.lines}`,
              { timeout: 2000 }
            );
            
            if (stdout && !stdout.includes("error")) {
              logs.entries.push({
                type: "ios",
                content: stdout.split("\n").filter(line => line.trim()),
              });
            }
          } catch (e) {
            logs.entries.push({
              type: "ios",
              note: "iOS simulator not running or app not launched",
            });
          }
        }

        // Android logs (if running on Android)
        if (args.logType === "android" || args.logType === "all") {
          try {
            const { stdout } = await execAsync(
              `adb logcat -d ReactNative:* ReactNativeJS:* *:S | tail -${args.lines}`
            );
            
            if (stdout) {
              logs.entries.push({
                type: "android",
                content: stdout.split("\n").filter(line => line.trim()),
              });
            }
          } catch (e) {
            logs.entries.push({
              type: "android",
              note: "Android device/emulator not connected or app not running",
            });
          }
        }

        return formatToolResponse({
          success: true,
          ...logs,
          totalEntries: logs.entries.length,
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
