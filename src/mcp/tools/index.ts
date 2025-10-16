import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import Database from 'better-sqlite3';
import { registerTodoTools } from './todos.js';
import { registerTimeTrackingTools } from './timeTracking.js';
import { registerCategoryTools } from './categories.js';
import { registerAnalyticsTools } from './analytics.js';

/**
 * Register all MCP tools with the server
 */
export function registerAllTools(server: McpServer, db: Database.Database) {
  console.error('📝 Registering MCP tools...');

  // Register tool groups
  registerTodoTools(server, db);
  registerTimeTrackingTools(server, db);
  registerCategoryTools(server, db);
  registerAnalyticsTools(server, db);

  console.error('✅ All MCP tools registered');
}
