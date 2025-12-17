import { z } from "zod";
import { formatToolResponse } from "../utils/response.js";

const GITHUB_API_BASE = "https://api.github.com";

function checkGitHubAuth(): string {
  const token = process.env.GITHUB_API_KEY;
  if (!token) {
    throw new Error("GITHUB_API_KEY environment variable is not set. Please set it to use GitHub Actions tools.");
  }
  return token;
}

function getGitHubHeaders(token: string): HeadersInit {
  return {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function makeGitHubRequest(url: string, token: string): Promise<any> {
  const response = await fetch(url, {
    headers: getGitHubHeaders(token),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${errorText}`);
  }

  return response;
}

// Tool 1: List workflow runs
export const github_list_workflow_runs = {
  name: "github_list_workflow_runs",
  description: "List workflow runs for a repository with optional filters for branch, status, event, and actor",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    branch: z.string().optional().describe("Filter by branch name"),
    status: z.enum(["completed", "action_required", "cancelled", "failure", "neutral", "skipped", "stale", "success", "timed_out", "in_progress", "queued", "requested", "waiting", "pending"]).optional().describe("Filter by status"),
    event: z.string().optional().describe("Filter by event (e.g., push, pull_request)"),
    actor: z.string().optional().describe("Filter by actor (username)"),
    per_page: z.number().optional().default(30).describe("Results per page (max 100)"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitHubAuth();
      
      const params = new URLSearchParams();
      if (args.branch) params.append("branch", args.branch);
      if (args.status) params.append("status", args.status);
      if (args.event) params.append("event", args.event);
      if (args.actor) params.append("actor", args.actor);
      params.append("per_page", args.per_page.toString());

      const url = `${GITHUB_API_BASE}/repos/${args.owner}/${args.repo}/actions/runs?${params}`;
      const response = await makeGitHubRequest(url, token);
      const data = await response.json();

      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to list workflow runs: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

// Tool 2: Get workflow run details
export const github_get_workflow_run = {
  name: "github_get_workflow_run",
  description: "Get details of a specific workflow run including status, conclusion, and timing information",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    run_id: z.number().describe("Workflow run ID"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitHubAuth();
      
      const url = `${GITHUB_API_BASE}/repos/${args.owner}/${args.repo}/actions/runs/${args.run_id}`;
      const response = await makeGitHubRequest(url, token);
      const data = await response.json();

      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to get workflow run: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

// Tool 3: List workflow jobs
export const github_list_workflow_jobs = {
  name: "github_list_workflow_jobs",
  description: "List all jobs for a specific workflow run with their status and steps",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    run_id: z.number().describe("Workflow run ID"),
    filter: z.enum(["latest", "all"]).optional().default("latest").describe("Filter jobs to latest or all attempts"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitHubAuth();
      
      const params = new URLSearchParams();
      params.append("filter", args.filter);

      const url = `${GITHUB_API_BASE}/repos/${args.owner}/${args.repo}/actions/runs/${args.run_id}/jobs?${params}`;
      const response = await makeGitHubRequest(url, token);
      const data = await response.json();

      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to list workflow jobs: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

// Tool 4: Get job logs
export const github_get_job_logs = {
  name: "github_get_job_logs",
  description: "Get the complete logs for a specific job as text",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    job_id: z.number().describe("Job ID"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitHubAuth();
      
      const url = `${GITHUB_API_BASE}/repos/${args.owner}/${args.repo}/actions/jobs/${args.job_id}/logs`;
      const response = await fetch(url, {
        headers: getGitHubHeaders(token),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub API error (${response.status}): ${errorText}`);
      }

      const logs = await response.text();
      return formatToolResponse({ logs });
    } catch (error) {
      return formatToolResponse({
        error: `Failed to get job logs: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

// Tool 5: List workflows
export const github_list_workflows = {
  name: "github_list_workflows",
  description: "List all workflows in a repository",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    per_page: z.number().optional().default(30).describe("Results per page (max 100)"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitHubAuth();
      
      const params = new URLSearchParams();
      params.append("per_page", args.per_page.toString());

      const url = `${GITHUB_API_BASE}/repos/${args.owner}/${args.repo}/actions/workflows?${params}`;
      const response = await makeGitHubRequest(url, token);
      const data = await response.json();

      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to list workflows: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

// Tool 6: Get workflow run logs (base64-encoded zip)
export const github_get_workflow_run_logs = {
  name: "github_get_workflow_run_logs",
  description: "Download the complete logs archive for a workflow run as base64-encoded zip file",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    run_id: z.number().describe("Workflow run ID"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitHubAuth();
      
      const url = `${GITHUB_API_BASE}/repos/${args.owner}/${args.repo}/actions/runs/${args.run_id}/logs`;
      const response = await fetch(url, {
        headers: getGitHubHeaders(token),
        redirect: "follow",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub API error (${response.status}): ${errorText}`);
      }

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");

      return formatToolResponse({
        logs_archive_base64: base64,
        size_bytes: buffer.byteLength,
        note: "Decode base64 and extract ZIP to access logs",
      });
    } catch (error) {
      return formatToolResponse({
        error: `Failed to get workflow run logs: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

export const githubActionsTools = [
  github_list_workflow_runs,
  github_get_workflow_run,
  github_list_workflow_jobs,
  github_get_job_logs,
  github_list_workflows,
  github_get_workflow_run_logs,
];