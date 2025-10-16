import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import Database from 'better-sqlite3';
import { getTodayDate } from '../utils/database.js';

/**
 * Register dashboard resources with the MCP server
 */
export function registerDashboardResources(server: McpServer, db: Database.Database) {
  server.resource(
    'dashboard_summary',
    new ResourceTemplate('lume://dashboard/summary', { list: undefined }),
    async (uri) => {
      try {
        const today = getTodayDate();

        // Get today's time entries
        const timeStats = db.prepare(`
          SELECT
            COUNT(*) as count,
            SUM(duration) as total_seconds
          FROM time_entries
          WHERE date(start_time) = ? AND duration IS NOT NULL
        `).get(today) as any;

        // Get completed todos
        const todoStats = db.prepare(`
          SELECT
            COUNT(*) as completed
          FROM todos
          WHERE date(completed_at) = ? AND completed = 1
        `).get(today) as any;

        // Get pomodoro sessions
        const pomodoroStats = db.prepare(`
          SELECT COUNT(*) as sessions
          FROM pomodoro_sessions
          WHERE date(start_time) = ? AND session_type = 'focus'
        `).get(today) as any;

        const summary = {
          date: today,
          time_entries: {
            count: timeStats.count || 0,
            total_seconds: timeStats.total_seconds || 0,
          },
          todos: {
            completed: todoStats.completed || 0,
          },
          pomodoro: {
            sessions: pomodoroStats.sessions || 0,
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
