#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { filesystemTools } from "./tools/filesystem.js";
import { cliTools } from "./tools/cli.js";
import { gitTools } from "./tools/git.js";
import { webTools } from "./tools/web.js";
import { nodejsTools } from "./tools/nodejs.js";
import { pythonTools } from "./tools/python.js";
import { testTools } from "./tools/testing.js";
import { automationTools } from "./tools/automation.js";
import { diagnosticsTools } from "./tools/diagnostics.js";

// Create MCP server using modern McpServer class
const server = new McpServer(
  {
    name: "mcp-vibe-coding-tools",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register all tools using the modern API
const allTools = [
  ...filesystemTools,
  ...cliTools,
  ...gitTools,
  ...webTools,
  ...nodejsTools,
  ...pythonTools,
  ...testTools,
  ...automationTools,
  ...diagnosticsTools,
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
  console.error("MCP Vibe Coding Tools server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
