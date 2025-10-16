import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import Database from 'better-sqlite3';
import { registerDashboardResources } from './dashboard.js';

/**
 * Register all MCP resources with the server
 */
export function registerAllResources(server: McpServer, db: Database.Database) {
  console.error('📦 Registering MCP resources...');

  // Register resource groups
  registerDashboardResources(server, db);

  console.error('✅ All MCP resources registered');
}
