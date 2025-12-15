import { simpleGit, SimpleGit } from "simple-git";
import * as path from "path";
import { formatToolResponse } from "../utils/response.js";
import { z } from "zod";

const workspacePath = process.env.WORKSPACE_PATH || process.cwd();
const git: SimpleGit = simpleGit(workspacePath);

export const gitTools = [
  {
    name: "git_status",
    description: "Get the current git repository status",
    inputSchema: z.object({}),
    handler: async () => {
      const status = await git.status();
      return formatToolResponse({
        success: true,
        current: status.current,
        tracking: status.tracking,
        ahead: status.ahead,
        behind: status.behind,
        modified: status.modified,
        created: status.created,
        deleted: status.deleted,
        renamed: status.renamed,
        conflicted: status.conflicted,
        isClean: status.isClean(),
      });
    },
  },
  {
    name: "git_log",
    description: "Get git commit history",
    inputSchema: z.object({
      maxCount: z.number().describe("Maximum number of commits to retrieve (default: 10)").default(10).optional(),
      file: z.string().describe("Filter commits by file path").optional(),
    }),
    handler: async (args: any) => {
      const options: any = {
        maxCount: args.maxCount || 10,
      };
      
      if (args.file) {
        options.file = args.file;
      }
      
      const log = await git.log(options);
      const result = {
        success: true,
        total: log.total,
        commits: log.all.map((commit) => ({
          hash: commit.hash,
          date: commit.date,
          message: commit.message,
          author: commit.author_name,
          email: commit.author_email,
        })),
      };
      return formatToolResponse(result);
    },
  },
  {
    name: "git_diff",
    description: "Show differences in files",
    inputSchema: z.object({
      file: z.string().describe("Specific file to diff (or all if not specified)").optional(),
      staged: z.boolean().describe("Show staged changes (--cached)").default(false).optional(),
    }),
    handler: async (args: any) => {
      const options = args.staged ? ["--cached"] : [];
      if (args.file) {
        options.push(args.file);
      }
      
      const diff = await git.diff(options);
      const result = {
        success: true,
        diff,
      };
      return formatToolResponse(result);
    },
  },
  {
    name: "git_branch",
    description: "List, create, or switch branches",
    inputSchema: z.object({
      action: z.enum(["list", "create", "switch", "delete"]).describe("Action to perform"),
      name: z.string().describe("Branch name (for create/switch/delete)").optional(),
    }),
    handler: async (args: any) => {
      switch (args.action) {
        case "list": {
          const branches = await git.branch();
          const result = {
            success: true,
            current: branches.current,
            all: branches.all,
          };
          return formatToolResponse(result);
        }
        case "create": {
          if (!args.name) throw new Error("Branch name required");
          await git.checkoutLocalBranch(args.name);
          const result = {
            success: true,
            action: "created",
            branch: args.name,
          };
          return formatToolResponse(result);
        }
        case "switch": {
          if (!args.name) throw new Error("Branch name required");
          await git.checkout(args.name);
          const result = {
            success: true,
            action: "switched",
            branch: args.name,
          };
          return formatToolResponse(result);
        }
        case "delete": {
          if (!args.name) throw new Error("Branch name required");
          await git.deleteLocalBranch(args.name);
          const result = {
            success: true,
            action: "deleted",
            branch: args.name,
          };
          return formatToolResponse(result);
        }
        default:
          throw new Error(`Unknown action: ${args.action}`);
      }
    },
  },
  {
    name: "git_commit",
    description: "Create a git commit",
    inputSchema: z.object({
      message: z.string().describe("Commit message"),
      files: z.array(z.string()).describe("Files to add (or all if not specified)").optional(),
    }),
    handler: async (args: any) => {
      if (args.files && args.files.length > 0) {
        await git.add(args.files);
      } else {
        await git.add(".");
      }
      
      const commitResult = await git.commit(args.message);
      const result = {
        success: true,
        commit: commitResult.commit,
        summary: commitResult.summary,
      };
      return formatToolResponse(result);
    },
  },
  {
    name: "git_push",
    description: "Push commits to remote repository",
    inputSchema: z.object({
      remote: z.string().describe("Remote name (default: origin)").default("origin").optional(),
      branch: z.string().describe("Branch to push (default: current)").optional(),
    }),
    handler: async (args: any) => {
      const remote = args.remote || "origin";
      const branch = args.branch || (await git.branch()).current;
      
      await git.push(remote, branch);
      const result = {
        success: true,
        remote,
        branch,
      };
      return formatToolResponse(result);
    },
  },
  {
    name: "git_pull",
    description: "Pull changes from remote repository",
    inputSchema: z.object({
      remote: z.string().describe("Remote name (default: origin)").default("origin").optional(),
      branch: z.string().describe("Branch to pull (default: current)").optional(),
    }),
    handler: async (args: any) => {
      const remote = args.remote || "origin";
      const branch = args.branch || (await git.branch()).current;
      
      const pullResult = await git.pull(remote, branch);
      const result = {
        success: true,
        remote,
        branch,
        summary: pullResult.summary,
      };
      return formatToolResponse(result);
    },
  },
  {
    name: "git_clone",
    description: "Clone a git repository",
    inputSchema: z.object({
      url: z.string().describe("Repository URL to clone"),
      directory: z.string().describe("Target directory name").optional(),
    }),
    handler: async (args: any) => {
      const targetPath = args.directory 
        ? path.join(workspacePath, args.directory)
        : workspacePath;
      
      await git.clone(args.url, targetPath);
      const result = {
        success: true,
        url: args.url,
        directory: args.directory || ".",
      };
      return formatToolResponse(result);
    },
  },
  {
    name: "git_stash",
    description: "Stash or apply stashed changes",
    inputSchema: z.object({
      action: z.enum(["save", "pop", "list"]).describe("Stash action to perform"),
      message: z.string().describe("Stash message (for save)").optional(),
    }),
    handler: async (args: any) => {
      switch (args.action) {
        case "save": {
          const message = args.message || "WIP";
          await git.stash(["save", message]);
          const result = {
            success: true,
            action: "saved",
            message,
          };
          return formatToolResponse(result);
        }
        case "pop": {
          await git.stash(["pop"]);
          const result = {
            success: true,
            action: "popped",
          };
          return formatToolResponse(result);
        }
        case "list": {
          const stashList = await git.stashList();
          const result = {
            success: true,
            stashes: stashList.all,
          };
          return formatToolResponse(result);
        }
        default:
          throw new Error(`Unknown action: ${args.action}`);
      }
    },
  },
];
