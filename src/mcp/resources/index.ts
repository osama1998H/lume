import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDashboardResources } from './dashboard.js';
import { logger } from '../../services/logging/Logger';

/**
 * Register all MCP resources with the server
 */
export function registerAllResources(server: McpServer) {
  logger.error('📦 Registering MCP resources...');

  // Register resource groups
  registerDashboardResources(server);

  logger.error('✅ All MCP resources registered');
}
