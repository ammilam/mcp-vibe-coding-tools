# VS Code & GitHub Copilot Setup Guide

## How to Use This MCP Server with VS Code/Copilot

### Step 1: Build the Server

```bash
npm install
npm run build
```

### Step 2: Configure MCP Server

**You only need to do this ONCE** - add to your user mcp.json and it works for all projects!

#### Recommended: User Configuration (Global - Works for ALL projects)

1. Open Command Palette: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Run command: `MCP: Open User Configuration`
3. Add this configuration:

```json
{
  "servers": {
    "mcp-vibe-coding-tools": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/path/to/mcp-vibe-coding-tools/dist/index.js"
      ]
    }
  }
}
```

**That's it!** Just replace `/path/to/mcp-vibe-coding-tools/dist/index.js` with the absolute path to where you cloned this repo.

**How it works:**
- The server code lives in one place (wherever you cloned it)
- VS Code automatically sets the working directory to your currently open workspace
- Open any project → Server works in that project
- No per-project configuration needed!
1. In your project, create/edit `.vscode/settings.json`
2. Add the same configuration as above

### Step 3: Restart VS Code

After adding the configuration, restart VS Code for the changes to take effect.

### Step 4: Verify It's Working

1. Open GitHub Copilot Chat
2. Try asking it to use the tools, for example:
   - "Read the contents of package.json"
   - "Show me the git status"
   - "List all TypeScript files in src/"

Copilot should now be able to use all 40+ tools from this MCP server!

## Available Tools

The server provides these tool categories:

- **Filesystem Tools**: read_file, write_file, list_directory, search_files, file_info, create_directory
- **CLI Tools**: execute_command, get_environment, which_command  
- **Git Tools**: git_status, git_log, git_diff, git_branch, git_commit, git_push, git_pull, git_clone, git_stash
- **Web Tools**: fetch_webpage, scrape_webpage, http_request, parse_html
- **Node.js Tools**: npm_install, npm_run_script, npm_outdated, npm_init, read_package_json
- **Python Tools**: pip_install, run_python, create_venv, pip_list, read_requirements
- **Testing Tools**: run_tests, run_jest, run_pytest, test_coverage

## Troubleshooting

### Server Not Appearing
- Check that the path in settings.json is correct and absolute
- Ensure the server is built (`npm run build`)
- Check VS Code's Output panel (View > Output) and select "GitHub Copilot" from the dropdown

### Permission Errors
Make sure the dist/index.js file is executable, or use `node` explicitly in the command.

### Environment Variables
The `WORKSPACE_PATH` environment variable is automatically set to your current workspace folder. Tools use this as their working directory.

## Alternative: Claude Desktop Setup

If you want to use this with Claude Desktop instead, create `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mcp-vibe-coding-tools": {
      "command": "node",
      "args": [
        "/Users/localadmin/github/mcp-vibe-coding-tools/dist/index.js"
      ],
      "env": {
        "WORKSPACE_PATH": "/path/to/your/workspace"
      }
    }
  }
}
```

Then restart Claude Desktop.
