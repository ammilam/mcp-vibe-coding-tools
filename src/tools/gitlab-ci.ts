import { z } from "zod";
import { formatToolResponse } from "../utils/response.js";

const GITLAB_HOST = process.env.GITLAB_HOST || "https://gitlab.com";
const GITLAB_API_BASE = `${GITLAB_HOST}/api/v4`;

function checkGitLabAuth(): string {
  const token = process.env.GITLAB_API_KEY;
  if (!token) {
    throw new Error("GITLAB_API_KEY environment variable is not set. Please set it to use GitLab CI/CD tools.");
  }
  return token;
}

function getGitLabHeaders(token: string): HeadersInit {
  return {
    "PRIVATE-TOKEN": token,
  };
}

async function makeGitLabRequest(url: string, token: string): Promise<any> {
  const response = await fetch(url, {
    headers: getGitLabHeaders(token),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitLab API error (${response.status}): ${errorText}`);
  }

  return response;
}

// Tool 1: List pipelines
export const gitlab_list_pipelines = {
  name: "gitlab_list_pipelines",
  description: "List pipelines for a GitLab project with optional filters for status, ref, and username",
  inputSchema: z.object({
    project_id: z.string().describe("Project ID or URL-encoded project path (e.g., 'namespace/project')"),
    status: z.enum(["created", "waiting_for_resource", "preparing", "pending", "running", "success", "failed", "canceled", "skipped", "manual", "scheduled"]).optional().describe("Filter by pipeline status"),
    ref: z.string().optional().describe("Filter by git reference (branch/tag)"),
    username: z.string().optional().describe("Filter by username who triggered the pipeline"),
    per_page: z.number().optional().default(20).describe("Results per page (max 100)"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      
      const params = new URLSearchParams();
      if (args.status) params.append("status", args.status);
      if (args.ref) params.append("ref", args.ref);
      if (args.username) params.append("username", args.username);
      params.append("per_page", args.per_page.toString());

      const encodedProjectId = encodeURIComponent(args.project_id);
      const url = `${GITLAB_API_BASE}/projects/${encodedProjectId}/pipelines?${params}`;
      const response = await makeGitLabRequest(url, token);
      const data = await response.json();

      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to list pipelines: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

// Tool 2: Get pipeline details
export const gitlab_get_pipeline = {
  name: "gitlab_get_pipeline",
  description: "Get detailed information about a specific pipeline including status, duration, and commit details",
  inputSchema: z.object({
    project_id: z.string().describe("Project ID or URL-encoded project path"),
    pipeline_id: z.number().describe("Pipeline ID"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      
      const encodedProjectId = encodeURIComponent(args.project_id);
      const url = `${GITLAB_API_BASE}/projects/${encodedProjectId}/pipelines/${args.pipeline_id}`;
      const response = await makeGitLabRequest(url, token);
      const data = await response.json();

      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to get pipeline: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

// Tool 3: List pipeline jobs
export const gitlab_list_pipeline_jobs = {
  name: "gitlab_list_pipeline_jobs",
  description: "List all jobs in a specific pipeline with their status and stage information",
  inputSchema: z.object({
    project_id: z.string().describe("Project ID or URL-encoded project path"),
    pipeline_id: z.number().describe("Pipeline ID"),
    scope: z.array(z.enum(["created", "pending", "running", "failed", "success", "canceled", "skipped", "manual"])).optional().describe("Filter jobs by scope (can specify multiple)"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      
      const params = new URLSearchParams();
      if (args.scope) {
        args.scope.forEach((s: string) => params.append("scope[]", s));
      }

      const encodedProjectId = encodeURIComponent(args.project_id);
      const url = `${GITLAB_API_BASE}/projects/${encodedProjectId}/pipelines/${args.pipeline_id}/jobs?${params}`;
      const response = await makeGitLabRequest(url, token);
      const data = await response.json();

      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to list pipeline jobs: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

// Tool 4: Get job details
export const gitlab_get_job = {
  name: "gitlab_get_job",
  description: "Get detailed information about a specific job including status, duration, artifacts, and runner details",
  inputSchema: z.object({
    project_id: z.string().describe("Project ID or URL-encoded project path"),
    job_id: z.number().describe("Job ID"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      
      const encodedProjectId = encodeURIComponent(args.project_id);
      const url = `${GITLAB_API_BASE}/projects/${encodedProjectId}/jobs/${args.job_id}`;
      const response = await makeGitLabRequest(url, token);
      const data = await response.json();

      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to get job: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

// Tool 5: Get job trace (logs)
export const gitlab_get_job_trace = {
  name: "gitlab_get_job_trace",
  description: "Get the complete trace (logs) of a job as text",
  inputSchema: z.object({
    project_id: z.string().describe("Project ID or URL-encoded project path"),
    job_id: z.number().describe("Job ID"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      
      const encodedProjectId = encodeURIComponent(args.project_id);
      const url = `${GITLAB_API_BASE}/projects/${encodedProjectId}/jobs/${args.job_id}/trace`;
      const response = await fetch(url, {
        headers: getGitLabHeaders(token),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitLab API error (${response.status}): ${errorText}`);
      }

      const trace = await response.text();
      return formatToolResponse({ trace });
    } catch (error) {
      return formatToolResponse({
        error: `Failed to get job trace: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

// Tool 6: List project jobs
export const gitlab_list_project_jobs = {
  name: "gitlab_list_project_jobs",
  description: "List all jobs in a project across all pipelines with optional filtering",
  inputSchema: z.object({
    project_id: z.string().describe("Project ID or URL-encoded project path"),
    scope: z.array(z.enum(["created", "pending", "running", "failed", "success", "canceled", "skipped", "manual"])).optional().describe("Filter jobs by scope (can specify multiple)"),
    per_page: z.number().optional().default(20).describe("Results per page (max 100)"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      
      const params = new URLSearchParams();
      if (args.scope) {
        args.scope.forEach((s: string) => params.append("scope[]", s));
      }
      params.append("per_page", args.per_page.toString());

      const encodedProjectId = encodeURIComponent(args.project_id);
      const url = `${GITLAB_API_BASE}/projects/${encodedProjectId}/jobs?${params}`;
      const response = await makeGitLabRequest(url, token);
      const data = await response.json();

      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to list project jobs: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

// Tool 7: Get pipeline variables
export const gitlab_get_pipeline_variables = {
  name: "gitlab_get_pipeline_variables",
  description: "Get the variables that were used in a specific pipeline run",
  inputSchema: z.object({
    project_id: z.string().describe("Project ID or URL-encoded project path"),
    pipeline_id: z.number().describe("Pipeline ID"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      
      const encodedProjectId = encodeURIComponent(args.project_id);
      const url = `${GITLAB_API_BASE}/projects/${encodedProjectId}/pipelines/${args.pipeline_id}/variables`;
      const response = await makeGitLabRequest(url, token);
      const data = await response.json();

      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to get pipeline variables: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

export const gitlabCITools = [
  gitlab_list_pipelines,
  gitlab_get_pipeline,
  gitlab_list_pipeline_jobs,
  gitlab_get_job,
  gitlab_get_job_trace,
  gitlab_list_project_jobs,
  gitlab_get_pipeline_variables,
]; 