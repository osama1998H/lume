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
import { initializeDatabase } from './utils/database.js';
import { registerAllTools } from './tools/index.js';
import { registerAllResources } from './resources/index.js';
import Database from 'better-sqlite3';

// Global database instance
let db: Database.Database | null = null;

/**
 * Main server initialization and startup
 */
async function main() {
  try {
    console.error('🚀 Starting Lume MCP Server...');

    // Initialize database connection
    db = initializeDatabase();

    // Create MCP server instance
    const server = new McpServer({
      name: 'lume',
      version: '3.0.1',
    });

    console.error('📋 Lume MCP Server v3.0.1');
    console.error('📡 Transport: stdio');

    // Register all tools and resources
    registerAllTools(server, db);
    registerAllResources(server, db);

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

  try {
    if (db) {
      db.close();
      console.error('✅ Database connection closed');
    }
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
  }

  console.error('👋 Lume MCP Server stopped');
  process.exit(0);
}

// Register shutdown handlers
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  if (db) {
    db.close();
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled promise rejection at:', promise, 'reason:', reason);
  if (db) {
    db.close();
  }
  process.exit(1);
});

// Start the server
main().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
