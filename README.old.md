# MCP Vibe Coding Tools

A comprehensive Model Context Protocol (MCP) server that unchains AI coding assistants like Claude, Cursor, Windsurf, and others by providing extensive filesystem, CLI, git, web scraping, and project management capabilities.

## 🚀 Features

### Filesystem Operations
- **Read files** - Read file contents with encoding support
- **Write files** - Create and update files (no deletion without user confirmation)
- **List directories** - Browse directory structures
- **Search files** - Find files using glob patterns
- **File info** - Get file metadata and stats

### CLI & Process Execution
- **Execute commands** - Run shell commands safely
- **Process management** - Monitor running processes
- **Environment variables** - Access and set environment variables
- **Working directory** - Change and manage current working directory

### Git Operations
- **Status** - Check repository status
- **Log** - View commit history
- **Diff** - See changes in files
- **Branch** - List, create, and switch branches
- **Commit** - Create commits
- **Push/Pull** - Sync with remote repositories
- **Clone** - Clone repositories
- **Stash** - Stash and apply changes

### Web Operations
- **Fetch webpage** - Download web content
- **Parse HTML** - Extract data from HTML
- **Follow links** - Navigate web pages
- **Download files** - Save web resources

### Node.js Project Tools
- **Package management** - Install, update, remove packages
- **Script execution** - Run npm scripts
- **Dependency analysis** - Check for outdated packages
- **Project initialization** - Create new projects

### Python Project Tools
- **Virtual environments** - Create and manage venvs
- **Package management** - Install packages with pip
- **Requirements** - Generate and install from requirements.txt
- **Script execution** - Run Python scripts

### Testing & Execution
- **Run tests** - Execute test suites (Jest, pytest, etc.)
- **Build projects** - Compile and build applications
- **Start servers** - Launch development servers
- **Debug support** - Access debugging information

## 📦 Installation

```bash
git clone https://github.com/yourusername/mcp-vibe-coding-tools.git
cd mcp-vibe-coding-tools
npm install
npm run build
```

## 🔧 Configuration

### For VS Code & GitHub Copilot

**See [VSCODE_SETUP.md](./VSCODE_SETUP.md) for detailed setup instructions.**

**Quick setup:** Run `MCP: Open User Configuration` from Command Palette and add:

```json
{
  "servers": {
    "mcp-vibe-coding-tools": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/mcp-vibe-coding-tools/dist/index.js"]
    }
  }
}
```

Replace `/path/to/mcp-vibe-coding-tools/dist/index.js` with the absolute path to where you cloned this repo. Then it works in **any project** you open in VS Code!

### For Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "vibe-coding-tools": {
      "command": "node",
      "args": ["/path/to/mcp-vibe-coding-tools/dist/index.js"],
      "env": {
        "WORKSPACE_PATH": "/path/to/your/current/project"
      }
    }
  }
}
```

For Claude, you may want to update `WORKSPACE_PATH` per project, or use a default working directory.

### For Other MCP Clients

The server uses **stdio transport** (standard for MCP) - configure similarly in:
- Cursor
- Windsurf  
- Cline
- Continue
- Any MCP-compatible client

Same pattern: `node /path/to/server/dist/index.js` with optional `WORKSPACE_PATH` env var.

## 🎯 Usage Examples

### Read a File
```
Can you read the README.md file?
```

### Execute a Command
```
Run npm test in the current directory
```

### Git Operations
```
Show me the git status and recent commits
```

### Web Scraping
```
Fetch the content from example.com and extract all the links
```

### Install Dependencies
```
Install the axios package for this Node.js project
```

## 🔒 Security Features

- **No deletion without confirmation** - Files are never deleted automatically
- **Sandboxed execution** - Commands run in controlled environments
- **Path validation** - Prevents directory traversal attacks
- **Safe defaults** - Conservative permissions by default

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Watch mode for development
npm run watch

# Test with MCP Inspector
npm run inspector
```

## 📚 Architecture

The server is built using:
- **@modelcontextprotocol/sdk** - Official MCP SDK
- **TypeScript** - Type-safe development
- **Node.js** - Runtime environment
- **Modular design** - Easy to extend and maintain

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT

## 🌟 Auto-Discovery

This MCP server is designed to be easily discoverable by AI coding tools that support MCP integration. It provides:

- Comprehensive tool descriptions
- JSON Schema validation
- Standardized error handling
- Consistent response formats

## 🆘 Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

Built with ❤️ for the MCP community
