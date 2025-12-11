import { simpleGit, SimpleGit } from "simple-git";
import * as path from "path";
import { formatToolResponse } from "../utils/response.js";

const workspacePath = process.env.WORKSPACE_PATH || process.cwd();
const git: SimpleGit = simpleGit(workspacePath);

export const gitTools = [
  {
    name: "git_status",
    description: "Get the current git repository status",
    inputSchema: {
      type: "object",
      properties: {},
    },
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
    inputSchema: {
      type: "object",
      properties: {
        maxCount: {
          type: "number",
          description: "Maximum number of commits to retrieve (default: 10)",
          default: 10,
        },
        file: {
          type: "string",
          description: "Filter commits by file path",
        },
      },
    },
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
    inputSchema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          description: "Specific file to diff (or all if not specified)",
        },
        staged: {
          type: "boolean",
          description: "Show staged changes (--cached)",
          default: false,
        },
      },
    },
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
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "create", "switch", "delete"],
          description: "Action to perform",
        },
        name: {
          type: "string",
          description: "Branch name (for create/switch/delete)",
        },
      },
      required: ["action"],
    },
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
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Commit message",
        },
        files: {
          type: "array",
          items: { type: "string" },
          description: "Files to add (or all if not specified)",
        },
      },
      required: ["message"],
    },
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
    inputSchema: {
      type: "object",
      properties: {
        remote: {
          type: "string",
          description: "Remote name (default: origin)",
          default: "origin",
        },
        branch: {
          type: "string",
          description: "Branch to push (default: current)",
        },
      },
    },
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
    inputSchema: {
      type: "object",
      properties: {
        remote: {
          type: "string",
          description: "Remote name (default: origin)",
          default: "origin",
        },
        branch: {
          type: "string",
          description: "Branch to pull (default: current)",
        },
      },
    },
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
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Repository URL to clone",
        },
        directory: {
          type: "string",
          description: "Target directory name",
        },
      },
      required: ["url"],
    },
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
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["save", "pop", "list"],
          description: "Stash action to perform",
        },
        message: {
          type: "string",
          description: "Stash message (for save)",
        },
      },
      required: ["action"],
    },
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
