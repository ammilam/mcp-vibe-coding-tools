#!/bin/bash
# Test MCP server startup
echo "Testing MCP server..."
timeout 3s node dist/index.js <<EOF || true
EOF
echo "Server test complete. Check for errors above."
