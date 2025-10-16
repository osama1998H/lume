import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import Database from 'better-sqlite3';
import { getCurrentTimestamp, formatDuration } from '../utils/database.js';

/**
 * Register time tracking tools with the MCP server
 */
export function registerTimeTrackingTools(server: McpServer, db: Database.Database) {
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
        const active = db.prepare(`
          SELECT id, task FROM time_entries WHERE end_time IS NULL
        `).get() as any;

        if (active) {
          return {
            content: [{
              type: 'text',
              text: `⚠️  There's already an active time entry: "${active.task}" (ID: ${active.id}). Stop it first before starting a new one.`,
            }],
          };
        }

        const now = getCurrentTimestamp();
        const stmt = db.prepare(`
          INSERT INTO time_entries (task, category_id, start_time, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `);

        const result = stmt.run(task, categoryId || null, now, now, now);

        return {
          content: [{
            type: 'text',
            text: `✅ Started tracking: "${task}" (ID: ${result.lastInsertRowid})`,
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
        const active = db.prepare(`
          SELECT id, task, start_time
          FROM time_entries
          WHERE end_time IS NULL
        `).get() as any;

        if (!active) {
          return {
            content: [{
              type: 'text',
              text: '⚠️  No active time entry found to stop.',
            }],
          };
        }

        const now = getCurrentTimestamp();
        const startTime = new Date(active.start_time).getTime();
        const endTime = new Date(now).getTime();
        const duration = Math.floor((endTime - startTime) / 1000);

        db.prepare(`
          UPDATE time_entries
          SET end_time = ?, duration = ?, updated_at = ?
          WHERE id = ?
        `).run(now, duration, now, active.id);

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
        const active = db.prepare(`
          SELECT
            te.id,
            te.task,
            te.start_time,
            te.category_id,
            c.name as category_name,
            c.color as category_color
          FROM time_entries te
          LEFT JOIN categories c ON te.category_id = c.id
          WHERE te.end_time IS NULL
        `).get() as any;

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
    async ({ limit, categoryId }) => {
      try {
        let query = `
          SELECT
            te.id,
            te.task,
            te.start_time,
            te.end_time,
            te.duration,
            c.name as category_name,
            c.color as category_color
          FROM time_entries te
          LEFT JOIN categories c ON te.category_id = c.id
          WHERE 1=1
        `;
        const params: any[] = [];

        if (categoryId !== undefined) {
          query += ' AND te.category_id = ?';
          params.push(categoryId);
        }

        query += ' ORDER BY te.start_time DESC LIMIT ?';
        params.push(limit || 20);

        const entries = db.prepare(query).all(...params) as any[];

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
        const updates: string[] = [];
        const params: any[] = [];

        if (task !== undefined) {
          updates.push('task = ?');
          params.push(task);
        }
        if (categoryId !== undefined) {
          updates.push('category_id = ?');
          params.push(categoryId);
        }
        if (startTime !== undefined) {
          updates.push('start_time = ?');
          params.push(startTime);
        }
        if (endTime !== undefined) {
          updates.push('end_time = ?');
          params.push(endTime);

          // Recalculate duration if both times are present
          if (startTime !== undefined) {
            const duration = Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000);
            updates.push('duration = ?');
            params.push(duration);
          }
        }

        if (updates.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No updates provided.',
            }],
          };
        }

        updates.push('updated_at = ?');
        params.push(getCurrentTimestamp());
        params.push(id);

        const result = db.prepare(`UPDATE time_entries SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        if (result.changes === 0) {
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
