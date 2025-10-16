import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import Database from 'better-sqlite3';
import { getCurrentTimestamp } from '../utils/database.js';

/**
 * Register category management tools with the MCP server
 */
export function registerCategoryTools(server: McpServer, db: Database.Database) {
  // List all categories
  server.registerTool(
    'categories_list',
    {
      description: 'List all categories with their names, colors, and icons',
      inputSchema: {}
    },
    async () => {
      try {
        const categories = db.prepare(`
          SELECT id, name, color, icon, created_at, updated_at
          FROM categories
          ORDER BY name ASC
        `).all();

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
        const now = getCurrentTimestamp();
        const stmt = db.prepare(`
          INSERT INTO categories (name, color, icon, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `);

        const result = stmt.run(name, color || '#3B82F6', icon || null, now, now);

        return {
          content: [{
            type: 'text',
            text: `✅ Created category: "${name}" (ID: ${result.lastInsertRowid})`,
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
        const updates: string[] = [];
        const params: any[] = [];

        if (name !== undefined) {
          updates.push('name = ?');
          params.push(name);
        }
        if (color !== undefined) {
          updates.push('color = ?');
          params.push(color);
        }
        if (icon !== undefined) {
          updates.push('icon = ?');
          params.push(icon);
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

        const result = db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        if (result.changes === 0) {
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
}
