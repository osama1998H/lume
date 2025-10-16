#!/usr/bin/env node

/**
 * Lume MCP Server
 *
 * Provides MCP (Model Context Protocol) access to Lume's time tracking,
 * todo management, and productivity features via stdio transport.
 *
 * Usage:
 *   node dist/mcp/server.js
 *
 * Configuration for Claude Desktop:
 *   Add to ~/.config/Claude/claude_desktop_config.json (or equivalent):
 *   {
 *     "mcpServers": {
 *       "lume": {
 *         "command": "node",
 *         "args": ["/path/to/dist/mcp/server.js"]
 *       }
 *     }
 *   }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAllTools } from './tools/index.js';
import { registerAllResources } from './resources/index.js';
import { checkBridgeHealth } from './utils/httpClient.js';

/**
 * Wait for HTTP Bridge to be available with retry logic
 */
async function waitForBridge(maxRetries: number = 10, retryDelay: number = 2000): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.error(`🔍 Checking HTTP Bridge availability (attempt ${attempt}/${maxRetries})...`);

    const isHealthy = await checkBridgeHealth();
    if (isHealthy) {
      console.error('✅ HTTP Bridge is available');
      return;
    }

    if (attempt < maxRetries) {
      console.error(`⏳ Bridge not ready yet, waiting ${retryDelay / 1000}s before retry...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  // All retries exhausted
  console.error('❌ HTTP Bridge is not available after multiple attempts.');
  console.error('💡 Please ensure:');
  console.error('   1. The Lume desktop application is running');
  console.error('   2. The HTTP Bridge has started (check Lume logs)');
  console.error('   3. The port file exists and is readable');
  process.exit(1);
}

/**
 * Main server initialization and startup
 */
async function main() {
  try {
    console.error('🚀 Starting Lume MCP Server...');

    // Wait for HTTP Bridge to be available (with retries)
    await waitForBridge();

    // Create MCP server instance
    const server = new McpServer({
      name: 'lume',
      version: '3.0.1',
    });

    console.error('📋 Lume MCP Server v3.0.1');
    console.error('📡 Transport: stdio');
    console.error('🌉 Using HTTP Bridge to communicate with Lume app');

    // Register all tools and resources
    registerAllTools(server);
    registerAllResources(server);

    // Setup stdio transport
    const transport = new StdioServerTransport();

    // Connect server to transport
    await server.connect(transport);

    console.error('✅ Lume MCP Server started successfully');
    console.error('⏳ Waiting for requests...');
  } catch (error) {
    console.error('❌ Fatal error during server startup:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
function shutdown(signal: string) {
  console.error(`\n📡 Received ${signal}, shutting down gracefully...`);
  console.error('👋 Lume MCP Server stopped');
  process.exit(0);
}

// Register shutdown handlers
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled promise rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
main().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
