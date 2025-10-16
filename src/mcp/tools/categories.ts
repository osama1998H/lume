import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { callIPC } from '../utils/httpClient.js';

/**
 * Register category management tools with the MCP server
 */
export function registerCategoryTools(server: McpServer) {
  // List all categories
  server.registerTool(
    'categories_list',
    {
      description: 'List all categories with their names, colors, and icons',
      inputSchema: {}
    },
    async () => {
      try {
        const categories = await callIPC<any[]>('get-categories', {});

        if (categories.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No categories found.',
            }],
          };
        }

        return {
          content: [{
            type: 'text',
            text: `Found ${categories.length} category/categories:\n\n${JSON.stringify(categories, null, 2)}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to list categories: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Add a new category
  server.registerTool(
    'categories_add',
    {
      description: 'Add a new category with name, optional color, and optional icon',
      inputSchema: {
        name: z.string().describe('Category name'),
        color: z.string().optional().describe('Color in hex format (e.g., #3B82F6)'),
        icon: z.string().optional().describe('Icon name or emoji'),
      }
    },
    async ({ name, color, icon }) => {
      try {
        const categoryId = await callIPC<number>('add-category', {
          category: {
            name,
            color: color || '#3B82F6',
            icon: icon || null,
          }
        });

        if (!categoryId) {
          throw new Error('Failed to create category - no ID returned');
        }

        return {
          content: [{
            type: 'text',
            text: `✅ Created category: "${name}" (ID: ${categoryId})`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to create category: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Update a category
  server.registerTool(
    'categories_update',
    {
      description: 'Update an existing category by ID with new name, color, or icon',
      inputSchema: {
        id: z.number().describe('Category ID'),
        name: z.string().optional().describe('New name'),
        color: z.string().optional().describe('New color'),
        icon: z.string().optional().describe('New icon'),
      }
    },
    async ({ id, name, color, icon }) => {
      try {
        // Check if at least one field is provided
        if (name === undefined && color === undefined && icon === undefined) {
          return {
            content: [{
              type: 'text',
              text: 'No updates provided.',
            }],
          };
        }

        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (color !== undefined) updates.color = color;
        if (icon !== undefined) updates.icon = icon;

        const success = await callIPC<boolean>('update-category', {
          id,
          updates
        });

        if (!success) {
          return {
            content: [{
              type: 'text',
              text: `❌ Category with ID ${id} not found.`,
            }],
            isError: true,
          };
        }

        return {
          content: [{
            type: 'text',
            text: `✅ Updated category ID ${id} successfully.`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to update category: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Delete a category
  server.registerTool(
    'categories_delete',
    {
      description: 'Delete a category by ID',
      inputSchema: {
        id: z.number().describe('Category ID to delete'),
      }
    },
    async ({ id }) => {
      try {
        const success = await callIPC<boolean>('delete-category', { id });

        if (!success) {
          return {
            content: [{
              type: 'text',
              text: `❌ Category with ID ${id} not found.`,
            }],
            isError: true,
          };
        }

        return {
          content: [{
            type: 'text',
            text: `✅ Deleted category ID ${id} successfully.`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to delete category: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );
}
