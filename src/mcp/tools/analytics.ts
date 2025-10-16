import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { callIPC, getTodayDate, formatDuration } from '../utils/httpClient.js';

/**
 * Register analytics tools with the MCP server
 */
export function registerAnalyticsTools(server: McpServer) {
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
        const stats = await callIPC<any>('get-daily-productivity-stats', {
          startDate: today,
          endDate: today,
        });

        return {
          content: [{
            type: 'text',
            text: `📊 Today's Statistics (${today}):

⏱️  Time Entries:
  - Count: ${stats.timeEntries?.count || 0}
  - Total Time: ${stats.timeEntries?.totalDuration ? formatDuration(stats.timeEntries.totalDuration) : '0s'}

✅ Completed Todos: ${stats.completedTodos || 0}

🍅 Pomodoro Sessions:
  - Count: ${stats.pomodoroSessions?.count || 0}
  - Total Time: ${stats.pomodoroSessions?.totalDuration ? formatDuration(stats.pomodoroSessions.totalDuration) : '0s'}`,
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
        const stats = await callIPC<any>('get-weekly-summary', {
          weekOffset: 0,
        });

        if (!stats || !stats.dailyStats || stats.dailyStats.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No data for the past 7 days.',
            }],
          };
        }

        const formatted = stats.dailyStats
          .map((s: any) => `${s.date}: ${s.entries} entries, ${formatDuration(s.totalDuration)}`)
          .join('\n');

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

        // Calculate date range (inclusive)
        const endDate = getTodayDate();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - numDays + 1);
        const startDateStr = startDate.toISOString().split('T')[0];

        const stats = await callIPC<any>('get-analytics-summary', {});

        if (!stats || !stats.categoryBreakdown || stats.categoryBreakdown.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No data for the past ${numDays} days.`,
            }],
          };
        }

        const formatted = stats.categoryBreakdown
          .map((s: any) => `${s.category || 'Uncategorized'}: ${s.entries} entries, ${formatDuration(s.totalDuration)}`)
          .join('\n');

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
