import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import Database from 'better-sqlite3';
import { getTodayDate, formatDuration } from '../utils/database.js';

/**
 * Register analytics tools with the MCP server
 */
export function registerAnalyticsTools(server: McpServer, db: Database.Database) {
  // Get today's statistics
  server.registerTool(
    'analytics_today',
    {
      description: 'Get statistics for today including time entries, completed todos, and pomodoro sessions',
      inputSchema: {}
    },
    async () => {
      try {
        const today = getTodayDate();

        // Get time entries for today
        const timeStats = db.prepare(`
          SELECT
            COUNT(*) as count,
            SUM(duration) as total_duration
          FROM time_entries
          WHERE date(start_time) = ? AND duration IS NOT NULL
        `).get(today) as any;

        // Get completed todos for today
        const todoStats = db.prepare(`
          SELECT COUNT(*) as count
          FROM todos
          WHERE date(completed_at) = ? AND completed = 1
        `).get(today) as any;

        // Get pomodoro sessions for today
        const pomodoroStats = db.prepare(`
          SELECT COUNT(*) as count, SUM(duration) as total_duration
          FROM pomodoro_sessions
          WHERE date(start_time) = ? AND session_type = 'focus'
        `).get(today) as any;

        return {
          content: [{
            type: 'text',
            text: `📊 Today's Statistics (${today}):

⏱️  Time Entries:
  - Count: ${timeStats.count || 0}
  - Total Time: ${timeStats.total_duration ? formatDuration(timeStats.total_duration) : '0s'}

✅ Completed Todos: ${todoStats.count || 0}

🍅 Pomodoro Sessions:
  - Count: ${pomodoroStats.count || 0}
  - Total Time: ${pomodoroStats.total_duration ? formatDuration(pomodoroStats.total_duration) : '0s'}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to get today's statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Get weekly summary
  server.registerTool(
    'analytics_weekly',
    {
      description: 'Get weekly summary of time entries for the past 7 days',
      inputSchema: {}
    },
    async () => {
      try {
        const stats = db.prepare(`
          SELECT
            date(start_time) as date,
            COUNT(*) as entries,
            SUM(duration) as total_duration
          FROM time_entries
          WHERE date(start_time) >= date('now', '-7 days')
            AND duration IS NOT NULL
          GROUP BY date(start_time)
          ORDER BY date DESC
        `).all() as any[];

        if (stats.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No data for the past 7 days.',
            }],
          };
        }

        const formatted = stats.map(s => `${s.date}: ${s.entries} entries, ${formatDuration(s.total_duration)}`).join('\n');

        return {
          content: [{
            type: 'text',
            text: `📅 Weekly Summary (Last 7 Days):\n\n${formatted}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to get weekly summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Get category breakdown
  server.registerTool(
    'analytics_categories',
    {
      description: 'Get breakdown of time entries by category for a specified number of days',
      inputSchema: {
        days: z.number().optional().describe('Number of days to analyze (default: 7)'),
      }
    },
    async ({ days }) => {
      try {
        const numDays = days || 7;
        const stats = db.prepare(`
          SELECT
            c.name as category,
            c.color,
            COUNT(*) as entries,
            SUM(te.duration) as total_duration
          FROM time_entries te
          LEFT JOIN categories c ON te.category_id = c.id
          WHERE date(te.start_time) >= date('now', '-${numDays} days')
            AND te.duration IS NOT NULL
          GROUP BY c.id, c.name, c.color
          ORDER BY total_duration DESC
        `).all() as any[];

        if (stats.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No data for the past ${numDays} days.`,
            }],
          };
        }

        const formatted = stats.map(s =>
          `${s.category || 'Uncategorized'}: ${s.entries} entries, ${formatDuration(s.total_duration)}`
        ).join('\n');

        return {
          content: [{
            type: 'text',
            text: `📊 Category Breakdown (Last ${numDays} Days):\n\n${formatted}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to get category breakdown: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );
}
