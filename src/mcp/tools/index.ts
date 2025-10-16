import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTodoTools } from './todos.js';
import { registerTimeTrackingTools } from './timeTracking.js';
import { registerCategoryTools } from './categories.js';
import { registerAnalyticsTools } from './analytics.js';
import { registerGoalTools } from './goals.js';
import { registerTagTools } from './tags.js';
import { logger } from '../../services/logging/Logger';

/**
 * Register all MCP tools with the server
 */
export function registerAllTools(server: McpServer) {
  logger.error('📝 Registering MCP tools...');

  // Register tool groups
  registerTodoTools(server);
  registerTimeTrackingTools(server);
  registerCategoryTools(server);
  registerGoalTools(server);
  registerTagTools(server);
  registerAnalyticsTools(server);

  logger.error('✅ All MCP tools registered');
}
