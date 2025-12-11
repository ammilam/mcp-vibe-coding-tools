import { exec } from "child_process";
import { formatToolResponse } from "../utils/response.js";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";

const execAsync = promisify(exec);
const workspacePath = process.env.WORKSPACE_PATH || process.cwd();

export const pythonTools = [
  {
    name: "python_create_venv",
    description: "Create a Python virtual environment",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Virtual environment name",
          default: "venv",
        },
      },
    },
    handler: async (args: any) => {
      const venvName = args.name || "venv";
      const { stdout, stderr } = await execAsync(`python3 -m venv ${venvName}`, {
        cwd: workspacePath,
      });
      
      const result = {
        success: true,
        venv: venvName,
        path: path.join(workspacePath, venvName),
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      };
      return formatToolResponse(result);
    },
  },
  {
    name: "pip_install",
    description: "Install Python packages using pip",
    inputSchema: {
      type: "object",
      properties: {
        packages: {
          type: "array",
          items: { type: "string" },
          description: "Package names to install",
        },
        requirements: {
          type: "string",
          description: "Path to requirements.txt file",
        },
        venv: {
          type: "string",
          description: "Virtual environment to use",
          default: "venv",
        },
      },
    },
    handler: async (args: any) => {
      const venvName = args.venv || "venv";
      const pipPath = process.platform === "win32"
        ? path.join(workspacePath, venvName, "Scripts", "pip")
        : path.join(workspacePath, venvName, "bin", "pip");
      
      let command: string;
      
      if (args.requirements) {
        command = `"${pipPath}" install -r ${args.requirements}`;
      } else if (args.packages && args.packages.length > 0) {
        command = `"${pipPath}" install ${args.packages.join(" ")}`;
      } else {
        throw new Error("Either packages or requirements must be specified");
      }
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: workspacePath,
        timeout: 300000,
      });
      
      const result = {
        success: true,
        command,
        packages: args.packages || ["from requirements.txt"],
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      };
      return formatToolResponse(result);
    },
  },
  {
    name: "pip_freeze",
    description: "Generate requirements.txt from installed packages",
    inputSchema: {
      type: "object",
      properties: {
        venv: {
          type: "string",
          description: "Virtual environment to use",
          default: "venv",
        },
        output: {
          type: "string",
          description: "Output file path",
          default: "requirements.txt",
        },
      },
    },
    handler: async (args: any) => {
      const venvName = args.venv || "venv";
      const pipPath = process.platform === "win32"
        ? path.join(workspacePath, venvName, "Scripts", "pip")
        : path.join(workspacePath, venvName, "bin", "pip");
      
      const { stdout } = await execAsync(`"${pipPath}" freeze`, {
        cwd: workspacePath,
      });
      
      const outputPath = path.join(workspacePath, args.output || "requirements.txt");
      await fs.writeFile(outputPath, stdout);
      
      const result = {
        success: true,
        output: args.output || "requirements.txt",
        packages: stdout.trim().split("\n"),
      };
      return formatToolResponse(result);
    },
  },
  {
    name: "python_run_script",
    description: "Run a Python script",
    inputSchema: {
      type: "object",
      properties: {
        script: {
          type: "string",
          description: "Path to Python script",
        },
        args: {
          type: "array",
          items: { type: "string" },
          description: "Arguments to pass to the script",
        },
        venv: {
          type: "string",
          description: "Virtual environment to use",
        },
      },
      required: ["script"],
    },
    handler: async (args: any) => {
      let pythonPath = "python3";
      
      if (args.venv) {
        pythonPath = process.platform === "win32"
          ? path.join(workspacePath, args.venv, "Scripts", "python")
          : path.join(workspacePath, args.venv, "bin", "python");
      }
      
      const scriptArgs = args.args ? " " + args.args.join(" ") : "";
      const command = `"${pythonPath}" ${args.script}${scriptArgs}`;
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: workspacePath,
        timeout: 300000,
      });
      
      const result = {
        success: true,
        script: args.script,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      };
      return formatToolResponse(result);
    },
  },
  {
    name: "python_version",
    description: "Get Python version information",
    inputSchema: {
      type: "object",
      properties: {
        venv: {
          type: "string",
          description: "Virtual environment to check",
        },
      },
    },
    handler: async (args: any) => {
      let pythonPath = "python3";
      
      if (args.venv) {
        pythonPath = process.platform === "win32"
          ? path.join(workspacePath, args.venv, "Scripts", "python")
          : path.join(workspacePath, args.venv, "bin", "python");
      }
      
      const { stdout } = await execAsync(`"${pythonPath}" --version`, {
        cwd: workspacePath,
      });
      
      const result = {
        success: true,
        version: stdout.trim(),
      };
      return formatToolResponse(result);
    },
  },
];
