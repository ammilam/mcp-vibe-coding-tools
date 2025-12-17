#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { githubActionsTools } from "./tools/github-actions.js";
import { gitlabCITools } from "./tools/gitlab-ci.js";
import { gitlabAPITools } from "./tools/gitlab-api.js";

// Create MCP server for remote GitOps operations (GitHub & GitLab)
const server = new McpServer(
  {
    name: "mcp-gitops-tools",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register all GitOps tools (GitHub Actions, GitLab CI, GitLab API)
const allTools = [
  ...githubActionsTools,
  ...gitlabCITools,
  ...gitlabAPITools,
];

// Register each tool with the server
for (const tool of allTools) {
  server.registerTool(
    tool.name,
    {
      description: tool.description,
      inputSchema: tool.inputSchema as any,
    },
    tool.handler
  );
}

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP GitOps Tools server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
