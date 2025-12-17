import { z } from "zod";
import { formatToolResponse } from "../utils/response.js";

const GITLAB_HOST = process.env.GITLAB_HOST || "https://gitlab.com";
const GITLAB_API_BASE = `${GITLAB_HOST}/api/v4`;

function checkGitLabAuth(): string {
  const token = process.env.GITLAB_API_KEY;
  if (!token) {
    throw new Error("GITLAB_API_KEY environment variable is not set. Please set it to use GitLab tools.");
  }
  return token;
}

function getGitLabHeaders(token: string): HeadersInit {
  return {
    "PRIVATE-TOKEN": token,
    "Content-Type": "application/json",
  };
}

async function gitlabGet(url: string, token: string): Promise<any> {
  const response = await fetch(url, {
    headers: getGitLabHeaders(token),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitLab API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

async function gitlabPost(url: string, token: string, body: any): Promise<any> {
  const response = await fetch(url, {
    method: "POST",
    headers: getGitLabHeaders(token),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitLab API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

async function gitlabPut(url: string, token: string, body: any): Promise<any> {
  const response = await fetch(url, {
    method: "PUT",
    headers: getGitLabHeaders(token),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitLab API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// =============================================================================
// GROUP TOOLS
// =============================================================================

export const gitlab_get_group = {
  name: "gitlab_get_group",
  description: "Get detailed information about a GitLab group including description, visibility, and statistics",
  inputSchema: z.object({
    group_id: z.string().describe("Group ID or URL-encoded group path (e.g., 'my-group' or 'parent/child')"),
    with_projects: z.boolean().optional().default(true).describe("Include projects in response"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      const encodedGroupId = encodeURIComponent(args.group_id);
      const params = new URLSearchParams();
      params.append("with_projects", args.with_projects.toString());
      
      const data = await gitlabGet(`${GITLAB_API_BASE}/groups/${encodedGroupId}?${params}`, token);
      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to get group: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

export const gitlab_list_group_subgroups = {
  name: "gitlab_list_group_subgroups",
  description: "List all subgroups (child groups) under a GitLab group",
  inputSchema: z.object({
    group_id: z.string().describe("Group ID or URL-encoded group path"),
    all_available: z.boolean().optional().default(false).describe("Show all groups you have access to"),
    search: z.string().optional().describe("Search subgroups by name"),
    per_page: z.number().optional().default(20).describe("Results per page (max 100)"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      const encodedGroupId = encodeURIComponent(args.group_id);
      const params = new URLSearchParams();
      params.append("per_page", args.per_page.toString());
      if (args.all_available) params.append("all_available", "true");
      if (args.search) params.append("search", args.search);
      
      const data = await gitlabGet(`${GITLAB_API_BASE}/groups/${encodedGroupId}/subgroups?${params}`, token);
      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to list subgroups: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

export const gitlab_list_group_projects = {
  name: "gitlab_list_group_projects",
  description: "List all projects under a GitLab group (including subgroups)",
  inputSchema: z.object({
    group_id: z.string().describe("Group ID or URL-encoded group path"),
    include_subgroups: z.boolean().optional().default(true).describe("Include projects from subgroups"),
    search: z.string().optional().describe("Search projects by name"),
    archived: z.boolean().optional().describe("Filter by archived status"),
    visibility: z.enum(["public", "internal", "private"]).optional().describe("Filter by visibility"),
    per_page: z.number().optional().default(20).describe("Results per page (max 100)"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      const encodedGroupId = encodeURIComponent(args.group_id);
      const params = new URLSearchParams();
      params.append("per_page", args.per_page.toString());
      params.append("include_subgroups", args.include_subgroups.toString());
      if (args.search) params.append("search", args.search);
      if (args.archived !== undefined) params.append("archived", args.archived.toString());
      if (args.visibility) params.append("visibility", args.visibility);
      
      const data = await gitlabGet(`${GITLAB_API_BASE}/groups/${encodedGroupId}/projects?${params}`, token);
      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to list group projects: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

export const gitlab_list_descendant_groups = {
  name: "gitlab_list_descendant_groups",
  description: "List all descendant groups (all nested subgroups at any level) under a GitLab group",
  inputSchema: z.object({
    group_id: z.string().describe("Group ID or URL-encoded group path"),
    search: z.string().optional().describe("Search groups by name"),
    per_page: z.number().optional().default(20).describe("Results per page (max 100)"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      const encodedGroupId = encodeURIComponent(args.group_id);
      const params = new URLSearchParams();
      params.append("per_page", args.per_page.toString());
      if (args.search) params.append("search", args.search);
      
      const data = await gitlabGet(`${GITLAB_API_BASE}/groups/${encodedGroupId}/descendant_groups?${params}`, token);
      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to list descendant groups: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

// =============================================================================
// PROJECT TOOLS
// =============================================================================

export const gitlab_get_project = {
  name: "gitlab_get_project",
  description: "Get detailed information about a GitLab project",
  inputSchema: z.object({
    project_id: z.string().describe("Project ID or URL-encoded project path (e.g., 'namespace/project')"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      const encodedProjectId = encodeURIComponent(args.project_id);
      
      const data = await gitlabGet(`${GITLAB_API_BASE}/projects/${encodedProjectId}`, token);
      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to get project: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

export const gitlab_list_projects = {
  name: "gitlab_list_projects",
  description: "List GitLab projects accessible to the authenticated user",
  inputSchema: z.object({
    search: z.string().optional().describe("Search projects by name"),
    owned: z.boolean().optional().default(false).describe("Only show owned projects"),
    membership: z.boolean().optional().default(false).describe("Only show projects user is member of"),
    archived: z.boolean().optional().describe("Filter by archived status"),
    visibility: z.enum(["public", "internal", "private"]).optional().describe("Filter by visibility"),
    per_page: z.number().optional().default(20).describe("Results per page (max 100)"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      const params = new URLSearchParams();
      params.append("per_page", args.per_page.toString());
      if (args.search) params.append("search", args.search);
      if (args.owned) params.append("owned", "true");
      if (args.membership) params.append("membership", "true");
      if (args.archived !== undefined) params.append("archived", args.archived.toString());
      if (args.visibility) params.append("visibility", args.visibility);
      
      const data = await gitlabGet(`${GITLAB_API_BASE}/projects?${params}`, token);
      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to list projects: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

// =============================================================================
// ISSUE TOOLS
// =============================================================================

export const gitlab_list_issues = {
  name: "gitlab_list_issues",
  description: "List issues in a GitLab project with filtering options",
  inputSchema: z.object({
    project_id: z.string().describe("Project ID or URL-encoded project path"),
    state: z.enum(["opened", "closed", "all"]).optional().default("opened").describe("Filter by issue state"),
    labels: z.string().optional().describe("Comma-separated list of label names"),
    milestone: z.string().optional().describe("Milestone title"),
    assignee_username: z.string().optional().describe("Filter by assignee username"),
    author_username: z.string().optional().describe("Filter by author username"),
    search: z.string().optional().describe("Search in title and description"),
    per_page: z.number().optional().default(20).describe("Results per page (max 100)"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      const encodedProjectId = encodeURIComponent(args.project_id);
      const params = new URLSearchParams();
      params.append("per_page", args.per_page.toString());
      params.append("state", args.state);
      if (args.labels) params.append("labels", args.labels);
      if (args.milestone) params.append("milestone", args.milestone);
      if (args.assignee_username) params.append("assignee_username", args.assignee_username);
      if (args.author_username) params.append("author_username", args.author_username);
      if (args.search) params.append("search", args.search);
      
      const data = await gitlabGet(`${GITLAB_API_BASE}/projects/${encodedProjectId}/issues?${params}`, token);
      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to list issues: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

export const gitlab_get_issue = {
  name: "gitlab_get_issue",
  description: "Get detailed information about a specific issue",
  inputSchema: z.object({
    project_id: z.string().describe("Project ID or URL-encoded project path"),
    issue_iid: z.number().describe("Issue IID (internal ID within the project)"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      const encodedProjectId = encodeURIComponent(args.project_id);
      
      const data = await gitlabGet(`${GITLAB_API_BASE}/projects/${encodedProjectId}/issues/${args.issue_iid}`, token);
      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to get issue: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

export const gitlab_create_issue = {
  name: "gitlab_create_issue",
  description: "Create a new issue in a GitLab project",
  inputSchema: z.object({
    project_id: z.string().describe("Project ID or URL-encoded project path"),
    title: z.string().describe("Issue title"),
    description: z.string().optional().describe("Issue description (supports Markdown)"),
    labels: z.string().optional().describe("Comma-separated list of label names"),
    milestone_id: z.number().optional().describe("Milestone ID to assign"),
    assignee_ids: z.array(z.number()).optional().describe("Array of user IDs to assign"),
    due_date: z.string().optional().describe("Due date in YYYY-MM-DD format"),
    confidential: z.boolean().optional().default(false).describe("Make issue confidential"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      const encodedProjectId = encodeURIComponent(args.project_id);
      
      const body: any = { title: args.title };
      if (args.description) body.description = args.description;
      if (args.labels) body.labels = args.labels;
      if (args.milestone_id) body.milestone_id = args.milestone_id;
      if (args.assignee_ids) body.assignee_ids = args.assignee_ids;
      if (args.due_date) body.due_date = args.due_date;
      if (args.confidential) body.confidential = args.confidential;
      
      const data = await gitlabPost(`${GITLAB_API_BASE}/projects/${encodedProjectId}/issues`, token, body);
      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to create issue: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

export const gitlab_update_issue = {
  name: "gitlab_update_issue",
  description: "Update an existing issue in a GitLab project",
  inputSchema: z.object({
    project_id: z.string().describe("Project ID or URL-encoded project path"),
    issue_iid: z.number().describe("Issue IID (internal ID within the project)"),
    title: z.string().optional().describe("New issue title"),
    description: z.string().optional().describe("New issue description"),
    labels: z.string().optional().describe("Comma-separated list of label names (replaces existing)"),
    milestone_id: z.number().optional().describe("Milestone ID to assign"),
    assignee_ids: z.array(z.number()).optional().describe("Array of user IDs to assign"),
    state_event: z.enum(["close", "reopen"]).optional().describe("Close or reopen the issue"),
    due_date: z.string().optional().describe("Due date in YYYY-MM-DD format"),
    confidential: z.boolean().optional().describe("Make issue confidential"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      const encodedProjectId = encodeURIComponent(args.project_id);
      
      const body: any = {};
      if (args.title) body.title = args.title;
      if (args.description !== undefined) body.description = args.description;
      if (args.labels !== undefined) body.labels = args.labels;
      if (args.milestone_id !== undefined) body.milestone_id = args.milestone_id;
      if (args.assignee_ids) body.assignee_ids = args.assignee_ids;
      if (args.state_event) body.state_event = args.state_event;
      if (args.due_date !== undefined) body.due_date = args.due_date;
      if (args.confidential !== undefined) body.confidential = args.confidential;
      
      const data = await gitlabPut(`${GITLAB_API_BASE}/projects/${encodedProjectId}/issues/${args.issue_iid}`, token, body);
      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to update issue: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

export const gitlab_list_issue_notes = {
  name: "gitlab_list_issue_notes",
  description: "List comments/notes on an issue",
  inputSchema: z.object({
    project_id: z.string().describe("Project ID or URL-encoded project path"),
    issue_iid: z.number().describe("Issue IID"),
    per_page: z.number().optional().default(20).describe("Results per page (max 100)"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      const encodedProjectId = encodeURIComponent(args.project_id);
      const params = new URLSearchParams();
      params.append("per_page", args.per_page.toString());
      
      const data = await gitlabGet(`${GITLAB_API_BASE}/projects/${encodedProjectId}/issues/${args.issue_iid}/notes?${params}`, token);
      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to list issue notes: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

export const gitlab_create_issue_note = {
  name: "gitlab_create_issue_note",
  description: "Add a comment/note to an issue",
  inputSchema: z.object({
    project_id: z.string().describe("Project ID or URL-encoded project path"),
    issue_iid: z.number().describe("Issue IID"),
    body: z.string().describe("Comment body (supports Markdown)"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      const encodedProjectId = encodeURIComponent(args.project_id);
      
      const data = await gitlabPost(
        `${GITLAB_API_BASE}/projects/${encodedProjectId}/issues/${args.issue_iid}/notes`,
        token,
        { body: args.body }
      );
      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to create issue note: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

// =============================================================================
// MERGE REQUEST TOOLS
// =============================================================================

export const gitlab_list_merge_requests = {
  name: "gitlab_list_merge_requests",
  description: "List merge requests in a GitLab project with filtering options",
  inputSchema: z.object({
    project_id: z.string().describe("Project ID or URL-encoded project path"),
    state: z.enum(["opened", "closed", "merged", "all"]).optional().default("opened").describe("Filter by MR state"),
    labels: z.string().optional().describe("Comma-separated list of label names"),
    milestone: z.string().optional().describe("Milestone title"),
    assignee_username: z.string().optional().describe("Filter by assignee username"),
    author_username: z.string().optional().describe("Filter by author username"),
    reviewer_username: z.string().optional().describe("Filter by reviewer username"),
    source_branch: z.string().optional().describe("Filter by source branch"),
    target_branch: z.string().optional().describe("Filter by target branch"),
    search: z.string().optional().describe("Search in title and description"),
    per_page: z.number().optional().default(20).describe("Results per page (max 100)"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      const encodedProjectId = encodeURIComponent(args.project_id);
      const params = new URLSearchParams();
      params.append("per_page", args.per_page.toString());
      params.append("state", args.state);
      if (args.labels) params.append("labels", args.labels);
      if (args.milestone) params.append("milestone", args.milestone);
      if (args.assignee_username) params.append("assignee_username", args.assignee_username);
      if (args.author_username) params.append("author_username", args.author_username);
      if (args.reviewer_username) params.append("reviewer_username", args.reviewer_username);
      if (args.source_branch) params.append("source_branch", args.source_branch);
      if (args.target_branch) params.append("target_branch", args.target_branch);
      if (args.search) params.append("search", args.search);
      
      const data = await gitlabGet(`${GITLAB_API_BASE}/projects/${encodedProjectId}/merge_requests?${params}`, token);
      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to list merge requests: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

export const gitlab_get_merge_request = {
  name: "gitlab_get_merge_request",
  description: "Get detailed information about a specific merge request",
  inputSchema: z.object({
    project_id: z.string().describe("Project ID or URL-encoded project path"),
    merge_request_iid: z.number().describe("Merge request IID (internal ID within the project)"),
    include_diverged_commits_count: z.boolean().optional().default(false).describe("Include diverged commits count"),
    include_rebase_in_progress: z.boolean().optional().default(false).describe("Include rebase in progress status"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      const encodedProjectId = encodeURIComponent(args.project_id);
      const params = new URLSearchParams();
      if (args.include_diverged_commits_count) params.append("include_diverged_commits_count", "true");
      if (args.include_rebase_in_progress) params.append("include_rebase_in_progress", "true");
      
      const data = await gitlabGet(`${GITLAB_API_BASE}/projects/${encodedProjectId}/merge_requests/${args.merge_request_iid}?${params}`, token);
      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to get merge request: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

export const gitlab_create_merge_request = {
  name: "gitlab_create_merge_request",
  description: "Create a new merge request in a GitLab project",
  inputSchema: z.object({
    project_id: z.string().describe("Project ID or URL-encoded project path"),
    source_branch: z.string().describe("Source branch name"),
    target_branch: z.string().describe("Target branch name"),
    title: z.string().describe("Merge request title"),
    description: z.string().optional().describe("MR description (supports Markdown)"),
    labels: z.string().optional().describe("Comma-separated list of label names"),
    milestone_id: z.number().optional().describe("Milestone ID to assign"),
    assignee_ids: z.array(z.number()).optional().describe("Array of user IDs to assign"),
    reviewer_ids: z.array(z.number()).optional().describe("Array of user IDs to request review from"),
    remove_source_branch: z.boolean().optional().default(false).describe("Remove source branch after merge"),
    squash: z.boolean().optional().default(false).describe("Squash commits on merge"),
    draft: z.boolean().optional().default(false).describe("Create as draft/WIP MR"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      const encodedProjectId = encodeURIComponent(args.project_id);
      
      const body: any = {
        source_branch: args.source_branch,
        target_branch: args.target_branch,
        title: args.title,
      };
      if (args.description) body.description = args.description;
      if (args.labels) body.labels = args.labels;
      if (args.milestone_id) body.milestone_id = args.milestone_id;
      if (args.assignee_ids) body.assignee_ids = args.assignee_ids;
      if (args.reviewer_ids) body.reviewer_ids = args.reviewer_ids;
      if (args.remove_source_branch) body.remove_source_branch = args.remove_source_branch;
      if (args.squash) body.squash = args.squash;
      if (args.draft) body.title = `Draft: ${args.title}`;
      
      const data = await gitlabPost(`${GITLAB_API_BASE}/projects/${encodedProjectId}/merge_requests`, token, body);
      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to create merge request: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

export const gitlab_update_merge_request = {
  name: "gitlab_update_merge_request",
  description: "Update an existing merge request",
  inputSchema: z.object({
    project_id: z.string().describe("Project ID or URL-encoded project path"),
    merge_request_iid: z.number().describe("Merge request IID"),
    title: z.string().optional().describe("New MR title"),
    description: z.string().optional().describe("New MR description"),
    labels: z.string().optional().describe("Comma-separated list of label names"),
    milestone_id: z.number().optional().describe("Milestone ID to assign"),
    assignee_ids: z.array(z.number()).optional().describe("Array of user IDs to assign"),
    reviewer_ids: z.array(z.number()).optional().describe("Array of user IDs to request review from"),
    state_event: z.enum(["close", "reopen"]).optional().describe("Close or reopen the MR"),
    target_branch: z.string().optional().describe("Change target branch"),
    remove_source_branch: z.boolean().optional().describe("Remove source branch after merge"),
    squash: z.boolean().optional().describe("Squash commits on merge"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      const encodedProjectId = encodeURIComponent(args.project_id);
      
      const body: any = {};
      if (args.title) body.title = args.title;
      if (args.description !== undefined) body.description = args.description;
      if (args.labels !== undefined) body.labels = args.labels;
      if (args.milestone_id !== undefined) body.milestone_id = args.milestone_id;
      if (args.assignee_ids) body.assignee_ids = args.assignee_ids;
      if (args.reviewer_ids) body.reviewer_ids = args.reviewer_ids;
      if (args.state_event) body.state_event = args.state_event;
      if (args.target_branch) body.target_branch = args.target_branch;
      if (args.remove_source_branch !== undefined) body.remove_source_branch = args.remove_source_branch;
      if (args.squash !== undefined) body.squash = args.squash;
      
      const data = await gitlabPut(`${GITLAB_API_BASE}/projects/${encodedProjectId}/merge_requests/${args.merge_request_iid}`, token, body);
      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to update merge request: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

export const gitlab_merge_merge_request = {
  name: "gitlab_merge_merge_request",
  description: "Merge a merge request (accept and merge)",
  inputSchema: z.object({
    project_id: z.string().describe("Project ID or URL-encoded project path"),
    merge_request_iid: z.number().describe("Merge request IID"),
    merge_commit_message: z.string().optional().describe("Custom merge commit message"),
    squash_commit_message: z.string().optional().describe("Custom squash commit message"),
    squash: z.boolean().optional().describe("Squash commits"),
    should_remove_source_branch: z.boolean().optional().describe("Remove source branch after merge"),
    merge_when_pipeline_succeeds: z.boolean().optional().default(false).describe("Merge when pipeline succeeds"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      const encodedProjectId = encodeURIComponent(args.project_id);
      
      const body: any = {};
      if (args.merge_commit_message) body.merge_commit_message = args.merge_commit_message;
      if (args.squash_commit_message) body.squash_commit_message = args.squash_commit_message;
      if (args.squash !== undefined) body.squash = args.squash;
      if (args.should_remove_source_branch !== undefined) body.should_remove_source_branch = args.should_remove_source_branch;
      if (args.merge_when_pipeline_succeeds) body.merge_when_pipeline_succeeds = args.merge_when_pipeline_succeeds;
      
      const data = await gitlabPut(
        `${GITLAB_API_BASE}/projects/${encodedProjectId}/merge_requests/${args.merge_request_iid}/merge`,
        token,
        body
      );
      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to merge: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

export const gitlab_list_mr_changes = {
  name: "gitlab_list_mr_changes",
  description: "Get the changes (diff) in a merge request",
  inputSchema: z.object({
    project_id: z.string().describe("Project ID or URL-encoded project path"),
    merge_request_iid: z.number().describe("Merge request IID"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      const encodedProjectId = encodeURIComponent(args.project_id);
      
      const data = await gitlabGet(`${GITLAB_API_BASE}/projects/${encodedProjectId}/merge_requests/${args.merge_request_iid}/changes`, token);
      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to get MR changes: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

export const gitlab_list_mr_notes = {
  name: "gitlab_list_mr_notes",
  description: "List comments/notes on a merge request",
  inputSchema: z.object({
    project_id: z.string().describe("Project ID or URL-encoded project path"),
    merge_request_iid: z.number().describe("Merge request IID"),
    per_page: z.number().optional().default(20).describe("Results per page (max 100)"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      const encodedProjectId = encodeURIComponent(args.project_id);
      const params = new URLSearchParams();
      params.append("per_page", args.per_page.toString());
      
      const data = await gitlabGet(`${GITLAB_API_BASE}/projects/${encodedProjectId}/merge_requests/${args.merge_request_iid}/notes?${params}`, token);
      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to list MR notes: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

export const gitlab_create_mr_note = {
  name: "gitlab_create_mr_note",
  description: "Add a comment/note to a merge request",
  inputSchema: z.object({
    project_id: z.string().describe("Project ID or URL-encoded project path"),
    merge_request_iid: z.number().describe("Merge request IID"),
    body: z.string().describe("Comment body (supports Markdown)"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      const encodedProjectId = encodeURIComponent(args.project_id);
      
      const data = await gitlabPost(
        `${GITLAB_API_BASE}/projects/${encodedProjectId}/merge_requests/${args.merge_request_iid}/notes`,
        token,
        { body: args.body }
      );
      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to create MR note: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

export const gitlab_approve_merge_request = {
  name: "gitlab_approve_merge_request",
  description: "Approve a merge request",
  inputSchema: z.object({
    project_id: z.string().describe("Project ID or URL-encoded project path"),
    merge_request_iid: z.number().describe("Merge request IID"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      const encodedProjectId = encodeURIComponent(args.project_id);
      
      const data = await gitlabPost(
        `${GITLAB_API_BASE}/projects/${encodedProjectId}/merge_requests/${args.merge_request_iid}/approve`,
        token,
        {}
      );
      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to approve MR: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

// =============================================================================
// GLOBAL SEARCH TOOLS (across all accessible projects)
// =============================================================================

export const gitlab_search_issues_global = {
  name: "gitlab_search_issues_global",
  description: "Search issues across all accessible projects. Use this to find issues assigned to a user across all projects.",
  inputSchema: z.object({
    assignee_username: z.string().optional().describe("Filter by assignee username"),
    author_username: z.string().optional().describe("Filter by author username"),
    state: z.enum(["opened", "closed", "all"]).optional().default("opened").describe("Filter by issue state"),
    labels: z.string().optional().describe("Comma-separated list of label names"),
    search: z.string().optional().describe("Search in title and description"),
    scope: z.enum(["created_by_me", "assigned_to_me", "all"]).optional().default("all").describe("Filter by scope"),
    per_page: z.number().optional().default(20).describe("Results per page (max 100)"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      const params = new URLSearchParams();
      params.append("per_page", args.per_page.toString());
      params.append("state", args.state);
      params.append("scope", args.scope);
      if (args.assignee_username) params.append("assignee_username", args.assignee_username);
      if (args.author_username) params.append("author_username", args.author_username);
      if (args.labels) params.append("labels", args.labels);
      if (args.search) params.append("search", args.search);
      
      const data = await gitlabGet(`${GITLAB_API_BASE}/issues?${params}`, token);
      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to search issues: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

export const gitlab_search_merge_requests_global = {
  name: "gitlab_search_merge_requests_global",
  description: "Search merge requests across all accessible projects. Use this to find MRs assigned to or authored by a user.",
  inputSchema: z.object({
    assignee_username: z.string().optional().describe("Filter by assignee username"),
    author_username: z.string().optional().describe("Filter by author username"),
    reviewer_username: z.string().optional().describe("Filter by reviewer username"),
    state: z.enum(["opened", "closed", "merged", "all"]).optional().default("opened").describe("Filter by MR state"),
    labels: z.string().optional().describe("Comma-separated list of label names"),
    search: z.string().optional().describe("Search in title and description"),
    scope: z.enum(["created_by_me", "assigned_to_me", "all"]).optional().default("all").describe("Filter by scope"),
    per_page: z.number().optional().default(20).describe("Results per page (max 100)"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      const params = new URLSearchParams();
      params.append("per_page", args.per_page.toString());
      params.append("state", args.state);
      params.append("scope", args.scope);
      if (args.assignee_username) params.append("assignee_username", args.assignee_username);
      if (args.author_username) params.append("author_username", args.author_username);
      if (args.reviewer_username) params.append("reviewer_username", args.reviewer_username);
      if (args.labels) params.append("labels", args.labels);
      if (args.search) params.append("search", args.search);
      
      const data = await gitlabGet(`${GITLAB_API_BASE}/merge_requests?${params}`, token);
      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to search merge requests: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

export const gitlab_search_group_issues = {
  name: "gitlab_search_group_issues",
  description: "Search issues across all projects in a group (including subgroups)",
  inputSchema: z.object({
    group_id: z.string().describe("Group ID or URL-encoded group path"),
    assignee_username: z.string().optional().describe("Filter by assignee username"),
    author_username: z.string().optional().describe("Filter by author username"),
    state: z.enum(["opened", "closed", "all"]).optional().default("opened").describe("Filter by issue state"),
    labels: z.string().optional().describe("Comma-separated list of label names"),
    search: z.string().optional().describe("Search in title and description"),
    per_page: z.number().optional().default(20).describe("Results per page (max 100)"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      const encodedGroupId = encodeURIComponent(args.group_id);
      const params = new URLSearchParams();
      params.append("per_page", args.per_page.toString());
      params.append("state", args.state);
      if (args.assignee_username) params.append("assignee_username", args.assignee_username);
      if (args.author_username) params.append("author_username", args.author_username);
      if (args.labels) params.append("labels", args.labels);
      if (args.search) params.append("search", args.search);
      
      const data = await gitlabGet(`${GITLAB_API_BASE}/groups/${encodedGroupId}/issues?${params}`, token);
      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to search group issues: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

export const gitlab_search_group_merge_requests = {
  name: "gitlab_search_group_merge_requests",
  description: "Search merge requests across all projects in a group (including subgroups)",
  inputSchema: z.object({
    group_id: z.string().describe("Group ID or URL-encoded group path"),
    assignee_username: z.string().optional().describe("Filter by assignee username"),
    author_username: z.string().optional().describe("Filter by author username"),
    reviewer_username: z.string().optional().describe("Filter by reviewer username"),
    state: z.enum(["opened", "closed", "merged", "all"]).optional().default("opened").describe("Filter by MR state"),
    labels: z.string().optional().describe("Comma-separated list of label names"),
    search: z.string().optional().describe("Search in title and description"),
    per_page: z.number().optional().default(20).describe("Results per page (max 100)"),
  }),
  handler: async (args: any) => {
    try {
      const token = checkGitLabAuth();
      const encodedGroupId = encodeURIComponent(args.group_id);
      const params = new URLSearchParams();
      params.append("per_page", args.per_page.toString());
      params.append("state", args.state);
      if (args.assignee_username) params.append("assignee_username", args.assignee_username);
      if (args.author_username) params.append("author_username", args.author_username);
      if (args.reviewer_username) params.append("reviewer_username", args.reviewer_username);
      if (args.labels) params.append("labels", args.labels);
      if (args.search) params.append("search", args.search);
      
      const data = await gitlabGet(`${GITLAB_API_BASE}/groups/${encodedGroupId}/merge_requests?${params}`, token);
      return formatToolResponse(data);
    } catch (error) {
      return formatToolResponse({
        error: `Failed to search group merge requests: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};

// Export all tools
export const gitlabAPITools = [
  // Groups
  gitlab_get_group,
  gitlab_list_group_subgroups,
  gitlab_list_group_projects,
  gitlab_list_descendant_groups,
  // Projects
  gitlab_get_project,
  gitlab_list_projects,
  // Issues
  gitlab_list_issues,
  gitlab_get_issue,
  gitlab_create_issue,
  gitlab_update_issue,
  gitlab_list_issue_notes,
  gitlab_create_issue_note,
  // Merge Requests
  gitlab_list_merge_requests,
  gitlab_get_merge_request,
  gitlab_create_merge_request,
  gitlab_update_merge_request,
  gitlab_merge_merge_request,
  gitlab_list_mr_changes,
  gitlab_list_mr_notes,
  gitlab_create_mr_note,
  gitlab_approve_merge_request,
  // Global Search
  gitlab_search_issues_global,
  gitlab_search_merge_requests_global,
  gitlab_search_group_issues,
  gitlab_search_group_merge_requests,
];
