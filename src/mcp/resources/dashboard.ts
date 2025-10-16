import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { callIPC, getTodayDate } from '../utils/httpClient.js';

/**
 * Register dashboard resources with the MCP server
 */
export function registerDashboardResources(server: McpServer) {
  server.resource(
    'dashboard_summary',
    new ResourceTemplate('lume://dashboard/summary', { list: undefined }),
    async (uri) => {
      try {
        const today = getTodayDate();

        // Get daily productivity stats via HTTP Bridge
        const stats = await callIPC<any>('get-daily-productivity-stats', {
          date: today,
        });

        const summary = {
          date: today,
          time_entries: {
            count: stats.timeEntries?.count || 0,
            total_seconds: stats.timeEntries?.totalDuration || 0,
          },
          todos: {
            completed: stats.completedTodos || 0,
          },
          pomodoro: {
            sessions: stats.pomodoroSessions?.count || 0,
          },
        };

        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(summary, null, 2),
          }],
        };
      } catch (error) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'text/plain',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
        };
      }
    }
  );
}
