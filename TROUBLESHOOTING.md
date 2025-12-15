# Troubleshooting Guide

## Error: `v3Schema.safeParseAsync is not a function`

This error occurs when there's a version mismatch between the MCP SDK or cached client data.

### Solution Steps:

#### 1. Clean Server Build
```bash
cd mcp-vibe-coding-tools
rm -rf dist node_modules
npm install
npm run build
```

#### 2. Restart MCP Client

**For Claude Desktop:**
1. Completely quit Claude Desktop (Cmd+Q on macOS)
2. Clear cache (optional but recommended):
   ```bash
   # macOS
   rm -rf ~/Library/Caches/Claude
   rm -rf ~/Library/Application\ Support/Claude/logs
   
   # Windows
   rmdir /s "%LOCALAPPDATA%\Claude\Cache"
   
   # Linux
   rm -rf ~/.cache/Claude
   ```
3. Restart Claude Desktop
4. Test with a simple command like "list the tools available"

**For Cursor:**
1. Reload window: Cmd+Shift+P → "Developer: Reload Window"
2. If that doesn't work, quit and restart Cursor completely

**For Windsurf:**
1. Reload window or restart application
2. Check MCP server logs in the output panel

**For Cline/Continue:**
1. Restart VS Code
2. Check the extension logs

#### 3. Verify Server is Running

Check your MCP client config is pointing to the correct path:

```json
{
  "mcpServers": {
    "vibe-coding-tools": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/mcp-vibe-coding-tools/dist/index.js"],
      "env": {
        "WORKSPACE_PATH": "/your/workspace/path"
      }
    }
  }
}
```

**IMPORTANT:** Use absolute paths, not relative paths!

#### 4. Check Node Version

```bash
node --version  # Should be 18.0.0 or higher
```

If your Node version is too old, update it:
```bash
# macOS (with Homebrew)
brew install node

# Or use nvm
nvm install 18
nvm use 18
```

#### 5. Verify Package Versions

```bash
cd mcp-vibe-coding-tools
npm list @modelcontextprotocol/sdk
```

Should show `@modelcontextprotocol/sdk@1.24.3` or higher.

If it shows a different version, update package.json to match and rebuild.

## Still Not Working?

### Check Server Logs

**Claude Desktop logs:**
```bash
# macOS
tail -f ~/Library/Logs/Claude/mcp*.log

# Windows
type %USERPROFILE%\AppData\Roaming\Claude\logs\mcp*.log

# Linux
tail -f ~/.config/Claude/logs/mcp*.log
```

### Test Server Manually

```bash
cd mcp-vibe-coding-tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js
```

If you see an error here, the server itself has an issue.

### Common Issues

**Issue:** "Cannot find module '@modelcontextprotocol/sdk'"
**Fix:** Run `npm install` in the mcp-vibe-coding-tools directory

**Issue:** "Permission denied"
**Fix:** Make sure dist/index.js exists and is readable:
```bash
ls -la dist/index.js
chmod +x dist/index.js
```

**Issue:** "WORKSPACE_PATH not set"
**Fix:** Add env variable to your client config:
```json
"env": {
  "WORKSPACE_PATH": "/absolute/path/to/workspace"
}
```

## Getting Help

If none of these solutions work:

1. Check the GitHub issues: [repository issues page]
2. Verify you're using the latest version: `git pull && npm install && npm run build`
3. Try with MCP Inspector to debug: `npm run inspector`

## Prevention

To avoid this issue in the future:

1. **Always use absolute paths** in client configs
2. **Always rebuild after pulling updates:** `npm install && npm run build`
3. **Restart your MCP client** after rebuilding the server
4. **Keep package.json SDK version in sync** with installed version
