import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDashboardResources } from './dashboard.js';

/**
 * Register all MCP resources with the server
 */
export function registerAllResources(server: McpServer) {
  console.error('📦 Registering MCP resources...');

  // Register resource groups
  registerDashboardResources(server);

  console.error('✅ All MCP resources registered');
}
