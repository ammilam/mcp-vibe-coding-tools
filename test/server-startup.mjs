#!/usr/bin/env node

/**
 * Simple test to verify the MCP server starts correctly
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Testing MCP server startup...\n');

const serverPath = join(__dirname, '..', 'dist', 'index.js');
const server = spawn('node', [serverPath], {
  env: {
    ...process.env,
    WORKSPACE_PATH: process.cwd()
  }
});

let output = '';

server.stderr.on('data', (data) => {
  output += data.toString();
  console.log('Server output:', data.toString().trim());
});

server.stdout.on('data', (data) => {
  console.log('Server stdout:', data.toString().trim());
});

// Give it 2 seconds to start
setTimeout(() => {
  if (output.includes('MCP Vibe Coding Tools server running on stdio')) {
    console.log('\n✅ Server started successfully!');
    console.log('\nThe server is ready to use with:');
    console.log('  - VS Code GitHub Copilot');
    console.log('  - Claude Desktop');
    console.log('  - Cursor, Windsurf, Cline, Continue, etc.\n');
    console.log('See VSCODE_SETUP.md for configuration instructions.');
    process.exit(0);
  } else {
    console.log('\n❌ Server did not start correctly');
    console.log('Output received:', output);
    process.exit(1);
  }
  
  server.kill();
}, 2000);

server.on('error', (error) => {
  console.error('\n❌ Failed to start server:', error.message);
  process.exit(1);
});
