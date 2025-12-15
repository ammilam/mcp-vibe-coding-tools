import { exec } from "child_process";
import { formatToolResponse } from "../utils/response.js";
import { promisify } from "util";
import { z } from "zod";

const execAsync = promisify(exec);
const workspacePath = process.env.WORKSPACE_PATH || process.cwd();

export const cliTools = [
  {
    name: "execute_command",
    description: "Execute a shell command in the workspace directory",
    inputSchema: z.object({
      command: z.string().describe("The command to execute"),
      cwd: z.string().describe("Working directory (relative to workspace)").default(".").optional(),
      timeout: z.number().describe("Timeout in milliseconds (default: 30000)").default(30000).optional(),
    }),
    handler: async (args: any) => {
      try {
        const { stdout, stderr } = await execAsync(args.command, {
          cwd: workspacePath,
          timeout: args.timeout || 30000,
          maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        });
        
        const result = {
          success: true,
          command: args.command,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: 0,
        };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        const result = {
          success: false,
          command: args.command,
          stdout: error.stdout?.trim() || "",
          stderr: error.stderr?.trim() || error.message,
          exitCode: error.code || 1,
          error: error.message,
        };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      }
    },
  },
  {
    name: "get_environment",
    description: "Get environment variables",
    inputSchema: z.object({
      variable: z.string().describe("Specific variable to get (or all if not specified)").optional(),
    }),
    handler: async (args: any) => {
      if (args.variable) {
        const result = {
          success: true,
          variable: args.variable,
          value: process.env[args.variable] || null,
        };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      }
      
      const result = {
        success: true,
        environment: process.env,
      };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  },
  {
    name: "which_command",
    description: "Find the path to an executable command",
    inputSchema: z.object({
      command: z.string().describe("The command to locate"),
    }),
    handler: async (args: any) => {
      try {
        const { stdout } = await execAsync(
          process.platform === "win32" 
            ? `where ${args.command}` 
            : `which ${args.command}`
        );
        
        const result = {
          success: true,
          command: args.command,
          path: stdout.trim(),
        };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        const result = {
          success: false,
          command: args.command,
          error: "Command not found",
        };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      }
    },
  },
];
