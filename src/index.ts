#!/usr/bin/env node
// SEOBlogBot MCP Server - Entry Point

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAllTools } from './tools/index.js';

const server = new McpServer({
  name: 'seoblogbot',
  version: '1.0.0',
});

// Register all SEO tools
registerAllTools(server);

// Connect via stdio for Claude Code integration
const transport = new StdioServerTransport();
await server.connect(transport);

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.close();
  process.exit(0);
});
