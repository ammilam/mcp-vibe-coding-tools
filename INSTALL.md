# Installation Guide

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git (for git operations)
- Python 3 (for Python tools, optional)

## ⚠️ CRITICAL: MCP SDK Version

**This project requires `@modelcontextprotocol/sdk@^1.24.3` or higher.**

**Common Issue:** If you see `v3Schema.safeParseAsync is not a function`, there's a version mismatch.

**Solution:**
```bash
cd mcp-vibe-coding-tools
npm list @modelcontextprotocol/sdk  # Check version
# If version doesn't match package.json:
npm install  # Reinstall dependencies
npm run build  # Rebuild
```

**Always verify package.json version matches installed version before deploying.**

## Installation Methods

### Method 1: Global Installation (Recommended)

```bash
npm install -g mcp-vibe-coding-tools
```

### Method 2: Local Installation

```bash
git clone <repository-url>
cd mcp-vibe-coding-tools
npm install
npm run build
```

### Method 3: npx (No Installation)

```bash
npx mcp-vibe-coding-tools
```

## Configuration

### Claude Desktop

1. Locate your Claude Desktop config file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. Add the server configuration:

```json
{
  "mcpServers": {
    "vibe-coding-tools": {
      "command": "node",
      "args": ["/path/to/mcp-vibe-coding-tools/dist/index.js"],
      "env": {
        "WORKSPACE_PATH": "/path/to/your/workspace"
      }
    }
  }
}
```

If installed globally:

```json
{
  "mcpServers": {
    "vibe-coding-tools": {
      "command": "mcp-vibe-coding-tools",
      "env": {
        "WORKSPACE_PATH": "/path/to/your/workspace"
      }
    }
  }
}
```

### Cursor

Add to your Cursor settings:

```json
{
  "mcp": {
    "servers": {
      "vibe-coding-tools": {
        "command": "node",
        "args": ["/path/to/mcp-vibe-coding-tools/dist/index.js"],
        "env": {
          "WORKSPACE_PATH": "${workspaceFolder}"
        }
      }
    }
  }
}
```

### Windsurf

Similar to Cursor, add to Windsurf configuration.

### Cline / Continue

These editors support MCP through their respective configuration files. Consult their documentation for exact syntax.

## Environment Variables

- `WORKSPACE_PATH` - The root directory for file operations (required)

## Verification

After configuration, restart your MCP client and verify the server is loaded by asking:

```
What MCP tools do you have available?
```

You should see all the vibe-coding-tools listed.

## Troubleshooting

### Server Not Showing Up

1. Check the config file syntax (must be valid JSON)
2. Verify the path to the server is correct
3. Check logs in your MCP client
4. Ensure Node.js is in your PATH

### Permission Errors

1. Ensure the workspace path is accessible
2. Check file permissions
3. Run with appropriate user permissions

### Tool Execution Failures

1. Verify the WORKSPACE_PATH is set correctly
2. Check that required tools (git, npm, python) are installed
3. Review error messages in the tool responses

## Getting Help

- Check the [README.md](README.md) for usage examples
- Open an issue on GitHub
- Review the [MCP documentation](https://modelcontextprotocol.io)
