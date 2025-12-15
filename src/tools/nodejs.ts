import { exec } from "child_process";
import { formatToolResponse } from "../utils/response.js";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { z } from "zod";

const execAsync = promisify(exec);
const workspacePath = process.env.WORKSPACE_PATH || process.cwd();

export const nodejsTools = [
  {
    name: "npm_install",
    description: "Install npm packages",
    inputSchema: z.object({
      packages: z.array(z.string()).describe("Package names to install").optional(),
      dev: z.boolean().describe("Install as dev dependencies").default(false).optional(),
      global: z.boolean().describe("Install globally").default(false).optional(),
    }),
    handler: async (args: any) => {
      let command = "npm install";
      
      if (args.global) {
        command += " -g";
      }
      if (args.dev) {
        command += " --save-dev";
      }
      if (args.packages && args.packages.length > 0) {
        command += " " + args.packages.join(" ");
      }
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: workspacePath,
        timeout: 300000, // 5 minutes
      });
      
      const result = {
        success: true,
        command,
        packages: args.packages || ["all dependencies"],
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      };
      return formatToolResponse(result);
    },
  },
  {
    name: "npm_run_script",
    description: "Run an npm script from package.json",
    inputSchema: z.object({
      script: z.string().describe("Script name to run"),
    }),
    handler: async (args: any) => {
      const { stdout, stderr } = await execAsync(`npm run ${args.script}`, {
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
    name: "npm_outdated",
    description: "Check for outdated packages",
    inputSchema: z.object({}),
    handler: async () => {
      try {
        const { stdout } = await execAsync("npm outdated --json", {
          cwd: workspacePath,
        });
        
        const outdated = JSON.parse(stdout);
        const result = {
          success: true,
          outdated,
          count: Object.keys(outdated).length,
        };
        return formatToolResponse(result);
      } catch (error: any) {
        // npm outdated returns exit code 1 when there are outdated packages
        if (error.stdout) {
          try {
            const outdated = JSON.parse(error.stdout);
            const result = {
              success: true,
              outdated,
              count: Object.keys(outdated).length,
            };
            return formatToolResponse(result);
          } catch {
            const result = {
              success: true,
              outdated: {},
              count: 0,
            };
            return formatToolResponse(result);
          }
        }
        throw error;
      }
    },
  },
  {
    name: "npm_init",
    description: "Initialize a new npm project",
    inputSchema: z.object({
      name: z.string().describe("Project name").optional(),
      version: z.string().describe("Initial version").default("1.0.0").optional(),
      description: z.string().describe("Project description").optional(),
    }),
    handler: async (args: any) => {
      const packageJson = {
        name: args.name || path.basename(workspacePath),
        version: args.version || "1.0.0",
        description: args.description || "",
        main: "index.js",
        scripts: {
          test: 'echo "Error: no test specified" && exit 1',
        },
        keywords: [],
        author: "",
        license: "ISC",
      };
      
      const packagePath = path.join(workspacePath, "package.json");
      await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2));
      
      const result = {
        success: true,
        path: "package.json",
        content: packageJson,
      };
      return formatToolResponse(result);
    },
  },
  {
    name: "read_package_json",
    description: "Read and parse package.json",
    inputSchema: z.object({}),
    handler: async () => {
      const packagePath = path.join(workspacePath, "package.json");
      const content = await fs.readFile(packagePath, "utf8");
      const packageJson = JSON.parse(content);
      
      const result = {
        success: true,
        packageJson,
        dependencies: packageJson.dependencies || {},
        devDependencies: packageJson.devDependencies || {},
        scripts: packageJson.scripts || {},
      };
      return formatToolResponse(result);
    },
  },
];
