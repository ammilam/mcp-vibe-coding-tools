# Quick Start Guide

## What You've Built

You now have a comprehensive MCP server called **mcp-vibe-coding-tools** that provides AI coding assistants with powerful capabilities:

✅ **Filesystem Operations** - Read, write, search files
✅ **CLI Execution** - Run shell commands safely  
✅ **Git Integration** - Full git workflow support
✅ **Web Scraping** - Fetch and parse web content
✅ **Node.js Tools** - Package management, scripts
✅ **Python Tools** - Virtual envs, pip, script execution
✅ **Testing Tools** - Run tests, build, lint

## Next Steps

### 1. Test the Server Locally

You can test the server using the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

This will open a web interface where you can test all the tools.

### 2. Configure Claude Desktop

**macOS:** Edit `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:** Edit `%APPDATA%\Claude\claude_desktop_config.json`

**Linux:** Edit `~/.config/Claude/claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "vibe-coding-tools": {
      "command": "node",
      "args": ["/Users/localadmin/github/mcp-vibe-coding-tools/dist/index.js"],
      "env": {
        "WORKSPACE_PATH": "/Users/localadmin/github"
      }
    }
  }
}
```

**Important:** Replace the paths with your actual paths!

### 3. Restart Claude Desktop

After saving the configuration, completely restart Claude Desktop (quit and reopen).

### 4. Test It Out

Open Claude Desktop and try these prompts:

```
What tools do you have available?
```

```
List all files in my workspace
```

```
Show me the git status
```

```
Read the README.md file
```

## Configure Other MCP Clients

### Cursor

Add to your Cursor settings (`.cursor/settings.json` or user settings):

```json
{
  "mcp": {
    "servers": {
      "vibe-coding-tools": {
        "command": "node",
        "args": ["/Users/localadmin/github/mcp-vibe-coding-tools/dist/index.js"],
        "env": {
          "WORKSPACE_PATH": "${workspaceFolder}"
        }
      }
    }
  }
}
```

### Windsurf

Similar to Cursor - check Windsurf's MCP documentation for exact configuration location.

### Cline (VS Code Extension)

Add to VS Code settings or workspace settings:

```json
{
  "cline.mcpServers": {
    "vibe-coding-tools": {
      "command": "node",
      "args": ["/Users/localadmin/github/mcp-vibe-coding-tools/dist/index.js"],
      "env": {
        "WORKSPACE_PATH": "${workspaceFolder}"
      }
    }
  }
}
```

## Available Tools (40+ Tools!)

### Filesystem (6 tools)
- `read_file` - Read file contents
- `write_file` - Create/update files
- `list_directory` - Browse directories
- `search_files` - Find files by pattern
- `file_info` - Get file metadata
- `create_directory` - Create directories

### CLI (3 tools)
- `execute_command` - Run shell commands
- `get_environment` - Get env variables
- `which_command` - Find command paths

### Git (9 tools)
- `git_status` - Check status
- `git_log` - View history
- `git_diff` - See changes
- `git_branch` - Manage branches
- `git_commit` - Create commits
- `git_push` - Push to remote
- `git_pull` - Pull from remote
- `git_clone` - Clone repositories
- `git_stash` - Stash changes

### Web (4 tools)
- `fetch_webpage` - Download pages
- `parse_html` - Extract data
- `extract_links` - Get all links
- `download_file` - Download files

### Node.js (5 tools)
- `npm_install` - Install packages
- `npm_run_script` - Run scripts
- `npm_outdated` - Check updates
- `npm_init` - Initialize projects
- `read_package_json` - Read package.json

### Python (5 tools)
- `python_create_venv` - Create venv
- `pip_install` - Install packages
- `pip_freeze` - Generate requirements
- `python_run_script` - Run scripts
- `python_version` - Check version

### Testing (4 tools)
- `run_tests` - Execute test suites
- `build_project` - Build projects
- `start_dev_server` - Start servers
- `lint_code` - Run linters

## Security Features

✅ **Path Validation** - Prevents directory traversal
✅ **No Deletion** - Files are never deleted automatically
✅ **Sandboxed Execution** - Commands run in controlled environments
✅ **Workspace Scoping** - All operations scoped to workspace

## Troubleshooting

### "Server not found" in Claude Desktop

1. Check the config file path is correct
2. Verify JSON syntax is valid
3. Make sure paths use forward slashes (/) even on Windows
4. Restart Claude Desktop completely

### "Permission denied" errors

1. Check the WORKSPACE_PATH is accessible
2. Verify file permissions
3. Ensure the Node.js process has appropriate permissions

### Tools not working

1. Verify required tools are installed (git, npm, python3)
2. Check that tools are in your PATH
3. Review the tool response for specific error messages

## Publishing (Optional)

To publish this server to npm so others can use it:

1. Create an npm account at npmjs.com
2. Update package.json with your details
3. Run: `npm login`
4. Run: `npm publish`

Then anyone can install with:
```bash
npm install -g mcp-vibe-coding-tools
```

## Further Development

Want to add more tools? Check out:

- `src/tools/` - Add new tool files
- `src/index.ts` - Register new tools
- [MCP Documentation](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

## Resources

- 📚 [Full Documentation](README.md)
- 🔧 [Installation Guide](INSTALL.md)
- 📖 [Tool Reference](TOOLS.md)
- 💡 [Examples](EXAMPLES.md)

---

**Congratulations!** 🎉 You now have a powerful MCP server that gives AI assistants unprecedented access to your development environment!
