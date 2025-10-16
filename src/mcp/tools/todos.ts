import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import Database from 'better-sqlite3';
import { getCurrentTimestamp } from '../utils/database.js';

/**
 * Register todo management tools with the MCP server
 */
export function registerTodoTools(server: McpServer, db: Database.Database) {
  // Add a new todo
  server.registerTool(
    'todos_add',
    {
      description: 'Add a new todo item with title, optional description, category, priority, and due date',
      inputSchema: {
        title: z.string().describe('The todo title/task'),
        description: z.string().optional().describe('Optional todo description'),
        categoryId: z.number().optional().describe('Category ID to assign'),
        priority: z.enum(['low', 'medium', 'high']).optional().describe('Priority level (default: medium)'),
        dueDate: z.string().optional().describe('Due date in ISO format (YYYY-MM-DD)'),
      }
    },
    async ({ title, description, categoryId, priority, dueDate }) => {
      try {
        const stmt = db.prepare(`
          INSERT INTO todos (
            title, description, category_id, priority, status,
            due_date, completed, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
        `);

        const now = getCurrentTimestamp();
        const result = stmt.run(
          title,
          description || null,
          categoryId || null,
          priority || 'medium',
          'todo',
          dueDate || null,
          now,
          now
        );

        return {
          content: [{
            type: 'text',
            text: `✅ Created todo: "${title}" (ID: ${result.lastInsertRowid})`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to create todo: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // List todos with optional filters
  server.registerTool(
    'todos_list',
    {
      description: 'List todos with optional filters by status, priority, or category',
      inputSchema: {
        status: z.enum(['todo', 'in_progress', 'completed']).optional().describe('Filter by status'),
        priority: z.enum(['low', 'medium', 'high']).optional().describe('Filter by priority'),
        categoryId: z.number().optional().describe('Filter by category ID'),
        limit: z.number().optional().describe('Maximum number of todos to return (default: 50)'),
      }
    },
    async ({ status, priority, categoryId, limit }) => {
      try {
        let query = `
          SELECT
            t.*,
            c.name as category_name,
            c.color as category_color
          FROM todos t
          LEFT JOIN categories c ON t.category_id = c.id
          WHERE 1=1
        `;
        const params: any[] = [];

        if (status !== undefined) {
          query += ' AND t.status = ?';
          params.push(status);
        }

        if (priority !== undefined) {
          query += ' AND t.priority = ?';
          params.push(priority);
        }

        if (categoryId !== undefined) {
          query += ' AND t.category_id = ?';
          params.push(categoryId);
        }

        query += ' ORDER BY t.created_at DESC LIMIT ?';
        params.push(limit || 50);

        const todos = db.prepare(query).all(...params);

        if (todos.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No todos found matching the criteria.',
            }],
          };
        }

        const formatted = JSON.stringify(todos, null, 2);
        return {
          content: [{
            type: 'text',
            text: `Found ${todos.length} todo(s):\n\n${formatted}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to list todos: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Update a todo
  server.registerTool(
    'todos_update',
    {
      description: 'Update an existing todo by ID with new values for title, description, status, priority, category, or due date',
      inputSchema: {
        id: z.number().describe('Todo ID to update'),
        title: z.string().optional().describe('New title'),
        description: z.string().optional().describe('New description'),
        status: z.enum(['todo', 'in_progress', 'completed']).optional().describe('New status'),
        priority: z.enum(['low', 'medium', 'high']).optional().describe('New priority'),
        categoryId: z.number().optional().describe('New category ID'),
        dueDate: z.string().optional().describe('New due date in ISO format (YYYY-MM-DD)'),
      }
    },
    async ({ id, title, description, status, priority, categoryId, dueDate }) => {
      try {
        const updates: string[] = [];
        const params: any[] = [];

        if (title !== undefined) {
          updates.push('title = ?');
          params.push(title);
        }
        if (description !== undefined) {
          updates.push('description = ?');
          params.push(description);
        }
        if (status !== undefined) {
          updates.push('status = ?');
          params.push(status);

          // Update completed status and timestamp
          if (status === 'completed') {
            updates.push('completed = 1');
            updates.push('completed_at = ?');
            params.push(getCurrentTimestamp());
          } else {
            updates.push('completed = 0');
            updates.push('completed_at = NULL');
          }
        }
        if (priority !== undefined) {
          updates.push('priority = ?');
          params.push(priority);
        }
        if (categoryId !== undefined) {
          updates.push('category_id = ?');
          params.push(categoryId);
        }
        if (dueDate !== undefined) {
          updates.push('due_date = ?');
          params.push(dueDate);
        }

        if (updates.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No updates provided. Please specify at least one field to update.',
            }],
          };
        }

        updates.push('updated_at = ?');
        params.push(getCurrentTimestamp());
        params.push(id);

        const query = `UPDATE todos SET ${updates.join(', ')} WHERE id = ?`;
        const result = db.prepare(query).run(...params);

        if (result.changes === 0) {
          return {
            content: [{
              type: 'text',
              text: `❌ Todo with ID ${id} not found.`,
            }],
            isError: true,
          };
        }

        return {
          content: [{
            type: 'text',
            text: `✅ Updated todo ID ${id} successfully.`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to update todo: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Delete a todo
  server.registerTool(
    'todos_delete',
    {
      description: 'Delete a todo by ID',
      inputSchema: {
        id: z.number().describe('Todo ID to delete'),
      }
    },
    async ({ id }) => {
      try {
        const result = db.prepare('DELETE FROM todos WHERE id = ?').run(id);

        if (result.changes === 0) {
          return {
            content: [{
              type: 'text',
              text: `❌ Todo with ID ${id} not found.`,
            }],
            isError: true,
          };
        }

        return {
          content: [{
            type: 'text',
            text: `✅ Deleted todo ID ${id} successfully.`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to delete todo: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Mark todo as complete (convenience method)
  server.registerTool(
    'todos_complete',
    {
      description: 'Mark a todo as complete by ID',
      inputSchema: {
        id: z.number().describe('Todo ID to mark as complete'),
      }
    },
    async ({ id }) => {
      try {
        const now = getCurrentTimestamp();
        const result = db.prepare(`
          UPDATE todos
          SET status = 'completed', completed = 1, completed_at = ?, updated_at = ?
          WHERE id = ?
        `).run(now, now, id);

        if (result.changes === 0) {
          return {
            content: [{
              type: 'text',
              text: `❌ Todo with ID ${id} not found.`,
            }],
            isError: true,
          };
        }

        return {
          content: [{
            type: 'text',
            text: `✅ Marked todo ID ${id} as complete.`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to complete todo: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Get todo statistics
  server.registerTool(
    'todos_stats',
    {
      description: 'Get statistics about todos including total count, completed, in progress, and overdue',
      inputSchema: {}
    },
    async () => {
      try {
        const stats = db.prepare(`
          SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo,
            SUM(CASE WHEN due_date IS NOT NULL AND due_date < date('now') AND completed = 0 THEN 1 ELSE 0 END) as overdue
          FROM todos
        `).get() as any;

        return {
          content: [{
            type: 'text',
            text: `📊 Todo Statistics:
- Total: ${stats.total}
- Completed: ${stats.completed}
- In Progress: ${stats.in_progress}
- Todo: ${stats.todo}
- Overdue: ${stats.overdue}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to get todo stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );
}
