import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { callIPC } from '../utils/httpClient.js';

/**
 * Register todo management tools with the MCP server
 */
export function registerTodoTools(server: McpServer) {
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
        const todoId = await callIPC<number>('add-todo', {
          todo: {
            title,
            description: description || null,
            categoryId: categoryId || null,
            priority: priority || 'medium',
            dueDate: dueDate || null,
          }
        });

        if (!todoId) {
          throw new Error('Failed to create todo - no ID returned');
        }

        return {
          content: [{
            type: 'text',
            text: `✅ Created todo: "${title}" (ID: ${todoId})`,
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
        const todos = await callIPC<any[]>('get-todos', {
          status,
          priority,
          categoryId,
          limit: limit || 50,
        });

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
        // Check if at least one field is provided
        if (title === undefined && description === undefined && status === undefined &&
            priority === undefined && categoryId === undefined && dueDate === undefined) {
          return {
            content: [{
              type: 'text',
              text: 'No updates provided. Please specify at least one field to update.',
            }],
          };
        }

        const updates: any = {};
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (status !== undefined) updates.status = status;
        if (priority !== undefined) updates.priority = priority;
        if (categoryId !== undefined) updates.categoryId = categoryId;
        if (dueDate !== undefined) updates.dueDate = dueDate;

        const success = await callIPC<boolean>('update-todo', {
          id,
          updates
        });

        if (!success) {
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
        const success = await callIPC<boolean>('delete-todo', { id });

        if (!success) {
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
        const success = await callIPC<boolean>('update-todo', {
          id,
          updates: {
            status: 'completed',
          }
        });

        if (!success) {
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
        const stats = await callIPC<any>('get-todo-stats', {});

        return {
          content: [{
            type: 'text',
            text: `📊 Todo Statistics:
- Total: ${stats.total || 0}
- Completed: ${stats.completed || 0}
- In Progress: ${stats.in_progress || 0}
- Todo: ${stats.todo || 0}
- Overdue: ${stats.overdue || 0}`,
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
