import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { callIPC, formatDuration } from '../utils/httpClient.js';

/**
 * Register time tracking tools with the MCP server
 */
export function registerTimeTrackingTools(server: McpServer) {
  // Start tracking time
  server.registerTool(
    'time_entries_start',
    {
      description: 'Start tracking time for a task with optional category',
      inputSchema: {
        task: z.string().describe('The task/activity name'),
        categoryId: z.number().optional().describe('Category ID'),
      }
    },
    async ({ task, categoryId }) => {
      try {
        // Check if there's already an active entry
        const active = await callIPC<any>('get-active-time-entry', {});

        if (active) {
          return {
            content: [{
              type: 'text',
              text: `⚠️  There's already an active time entry: "${active.task}" (ID: ${active.id}). Stop it first before starting a new one.`,
            }],
          };
        }

        const entryId = await callIPC<number>('add-time-entry', {
          task,
          categoryId: categoryId || null,
          startTime: new Date().toISOString(),
        });

        if (!entryId) {
          throw new Error('Failed to start tracking - no ID returned');
        }

        return {
          content: [{
            type: 'text',
            text: `✅ Started tracking: "${task}" (ID: ${entryId})`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to start tracking: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Stop tracking time
  server.registerTool(
    'time_entries_stop',
    {
      description: 'Stop the currently active time tracking entry',
      inputSchema: {}
    },
    async () => {
      try {
        const active = await callIPC<any>('get-active-time-entry', {});

        if (!active) {
          return {
            content: [{
              type: 'text',
              text: '⚠️  No active time entry found to stop.',
            }],
          };
        }

        const now = new Date().toISOString();
        const startTime = new Date(active.start_time).getTime();
        const endTime = new Date(now).getTime();
        const duration = Math.floor((endTime - startTime) / 1000);

        const success = await callIPC<boolean>('update-time-entry', {
          id: active.id,
          updates: {
            endTime: now,
          }
        });

        if (!success) {
          throw new Error('Failed to update time entry');
        }

        return {
          content: [{
            type: 'text',
            text: `✅ Stopped tracking: "${active.task}"\nDuration: ${formatDuration(duration)}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to stop tracking: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Get active time entry
  server.registerTool(
    'time_entries_active',
    {
      description: 'Get the currently active time tracking entry with elapsed time',
      inputSchema: {}
    },
    async () => {
      try {
        const active = await callIPC<any>('get-active-time-entry', {});

        if (!active) {
          return {
            content: [{
              type: 'text',
              text: 'No active time entry.',
            }],
          };
        }

        const elapsed = Math.floor((Date.now() - new Date(active.start_time).getTime()) / 1000);

        return {
          content: [{
            type: 'text',
            text: `⏱️  Active: "${active.task}"\nElapsed: ${formatDuration(elapsed)}\nCategory: ${active.category_name || 'None'}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to get active entry: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // List recent time entries
  server.registerTool(
    'time_entries_list',
    {
      description: 'List recent time entries with optional filters by category and limit',
      inputSchema: {
        limit: z.number().optional().describe('Maximum number of entries to return (default: 20)'),
        categoryId: z.number().optional().describe('Filter by category ID'),
      }
    },
    async ({ limit, categoryId: _categoryId }) => {
      try {
        // TODO: This requires a dedicated IPC handler for listing time entries
        // For now, using get-unified-activities as a workaround
        const entries = await callIPC<any[]>('get-unified-activities', {
          type: 'time_entry',
          limit: limit || 20,
        });

        if (entries.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No time entries found.',
            }],
          };
        }

        const formatted = entries.map(e => ({
          ...e,
          duration_formatted: e.duration ? formatDuration(e.duration) : 'In progress',
        }));

        return {
          content: [{
            type: 'text',
            text: `Found ${entries.length} time entry/entries:\n\n${JSON.stringify(formatted, null, 2)}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to list time entries: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Update time entry
  server.registerTool(
    'time_entries_update',
    {
      description: 'Update an existing time entry by ID with new task name, category, or time range',
      inputSchema: {
        id: z.number().describe('Time entry ID'),
        task: z.string().optional().describe('New task name'),
        categoryId: z.number().optional().describe('New category ID'),
        startTime: z.string().optional().describe('New start time (ISO format)'),
        endTime: z.string().optional().describe('New end time (ISO format)'),
      }
    },
    async ({ id, task, categoryId, startTime, endTime }) => {
      try {
        // Check if at least one field is provided
        if (task === undefined && categoryId === undefined &&
            startTime === undefined && endTime === undefined) {
          return {
            content: [{
              type: 'text',
              text: 'No updates provided.',
            }],
          };
        }

        const updates: any = {};
        if (task !== undefined) updates.task = task;
        if (categoryId !== undefined) updates.categoryId = categoryId;
        if (startTime !== undefined) updates.startTime = startTime;
        if (endTime !== undefined) updates.endTime = endTime;

        const success = await callIPC<boolean>('update-time-entry', {
          id,
          updates,
        });

        if (!success) {
          return {
            content: [{
              type: 'text',
              text: `❌ Time entry with ID ${id} not found.`,
            }],
            isError: true,
          };
        }

        return {
          content: [{
            type: 'text',
            text: `✅ Updated time entry ID ${id} successfully.`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to update time entry: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );
}
