import { exec } from "child_process";
import { formatToolResponse } from "../utils/response.js";
import { promisify } from "util";
import { z } from "zod";

const execAsync = promisify(exec);
const workspacePath = process.env.WORKSPACE_PATH || process.cwd();

export const testTools = [
  {
    name: "run_tests",
    description: "Run test suite (automatically detects test framework)",
    inputSchema: z.object({
      framework: z.enum(["jest", "vitest", "pytest", "mocha", "auto"]).describe("Test framework to use (default: auto-detect)").default("auto").optional(),
      pattern: z.string().describe("Test file pattern to run").optional(),
      coverage: z.boolean().describe("Generate coverage report").default(false).optional(),
    }),
    handler: async (args: any) => {
      let command: string;
      
      // Auto-detect test framework if not specified
      if (args.framework === "auto" || !args.framework) {
        try {
          const { readFile } = await import("fs/promises");
          const { join } = await import("path");
          const packagePath = join(workspacePath, "package.json");
          const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
          
          if (packageJson.devDependencies?.jest || packageJson.dependencies?.jest) {
            command = "npm test";
          } else if (packageJson.devDependencies?.vitest || packageJson.dependencies?.vitest) {
            command = "npm test";
          } else if (packageJson.devDependencies?.mocha || packageJson.dependencies?.mocha) {
            command = "npm test";
          } else {
            // Try Python pytest
            command = "pytest";
          }
        } catch {
          command = "npm test";
        }
      } else {
        switch (args.framework) {
          case "jest":
            command = "npx jest";
            break;
          case "vitest":
            command = "npx vitest run";
            break;
          case "pytest":
            command = "pytest";
            break;
          case "mocha":
            command = "npx mocha";
            break;
          default:
            command = "npm test";
        }
      }
      
      if (args.pattern) {
        command += ` ${args.pattern}`;
      }
      
      if (args.coverage) {
        if (command.includes("jest")) {
          command += " --coverage";
        } else if (command.includes("pytest")) {
          command += " --cov";
        } else if (command.includes("vitest")) {
          command += " --coverage";
        }
      }
      
      try {
        const { stdout, stderr } = await execAsync(command, {
          cwd: workspacePath,
          timeout: 300000,
        });
        
        const result = {
          success: true,
          command,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        };
        return formatToolResponse(result);
      } catch (error: any) {
        const result = {
          success: false,
          command,
          stdout: error.stdout?.trim() || "",
          stderr: error.stderr?.trim() || error.message,
          exitCode: error.code,
        };
        return formatToolResponse(result);
      }
    },
  },
  {
    name: "build_project",
    description: "Build the project",
    inputSchema: z.object({
      command: z.string().describe("Build command (default: npm run build)").default("npm run build").optional(),
    }),
    handler: async (args: any) => {
      const command = args.command || "npm run build";
      
      try {
        const { stdout, stderr } = await execAsync(command, {
          cwd: workspacePath,
          timeout: 600000, // 10 minutes
        });
        
        const result = {
          success: true,
          command,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        };
        return formatToolResponse(result);
      } catch (error: any) {
        const result = {
          success: false,
          command,
          stdout: error.stdout?.trim() || "",
          stderr: error.stderr?.trim() || error.message,
          exitCode: error.code,
        };
        return formatToolResponse(result);
      }
    },
  },
  {
    name: "start_dev_server",
    description: "Start development server",
    inputSchema: z.object({
      command: z.string().describe("Server command (default: npm run dev)").default("npm run dev").optional(),
      background: z.boolean().describe("Run in background").default(false).optional(),
    }),
    handler: async (args: any) => {
      const command = args.command || "npm run dev";
      
      if (args.background) {
        // For background processes, we start them but don't wait
        const { spawn } = await import("child_process");
        const child = spawn(command, [], {
          cwd: workspacePath,
          shell: true,
          detached: true,
          stdio: "ignore",
        });
        
        child.unref();
        
        const result = {
          success: true,
          command,
          pid: child.pid,
          background: true,
          message: "Server started in background",
        };
        return formatToolResponse(result);
      } else {
        // This will timeout, but that's expected for dev servers
        const result = {
          success: false,
          message: "Use background: true to start dev server in background",
        };
        return formatToolResponse(result);
      }
    },
  },
  {
    name: "lint_code",
    description: "Run code linter",
    inputSchema: z.object({
      fix: z.boolean().describe("Automatically fix issues").default(false).optional(),
    }),
    handler: async (args: any) => {
      let command = "npm run lint";
      if (args.fix) {
        command += " -- --fix";
      }
      
      try {
        const { stdout, stderr } = await execAsync(command, {
          cwd: workspacePath,
          timeout: 60000,
        });
        
        const result = {
          success: true,
          command,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        };
        return formatToolResponse(result);
      } catch (error: any) {
        const result = {
          success: false,
          command,
          stdout: error.stdout?.trim() || "",
          stderr: error.stderr?.trim() || error.message,
          exitCode: error.code,
        };
        return formatToolResponse(result);
      }
    },
  },
];
