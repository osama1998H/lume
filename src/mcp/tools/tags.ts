import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { callIPC } from '../utils/httpClient.js';

/**
 * Register tag management tools with the MCP server
 */
export function registerTagTools(server: McpServer) {
  // Add a new tag
  server.registerTool(
    'tags_add',
    {
      description: 'Add a new tag with name and color',
      inputSchema: {
        name: z.string().describe('Tag name'),
        color: z.string().describe('Color in hex format (e.g., #3B82F6)'),
      }
    },
    async ({ name, color }) => {
      try {
        const tagId = await callIPC<number>('add-tag', {
          tag: {
            name,
            color,
          }
        });

        if (!tagId) {
          throw new Error('Failed to create tag - no ID returned');
        }

        return {
          content: [{
            type: 'text',
            text: `✅ Created tag: "${name}" (ID: ${tagId})`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to create tag: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // List all tags
  server.registerTool(
    'tags_list',
    {
      description: 'List all tags with their names and colors',
      inputSchema: {}
    },
    async () => {
      try {
        const tags = await callIPC<any[]>('get-tags', {});

        if (tags.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No tags found.',
            }],
          };
        }

        return {
          content: [{
            type: 'text',
            text: `Found ${tags.length} tag(s):\n\n${JSON.stringify(tags, null, 2)}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to list tags: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Update a tag
  server.registerTool(
    'tags_update',
    {
      description: 'Update an existing tag by ID with new name or color',
      inputSchema: {
        id: z.number().describe('Tag ID'),
        name: z.string().optional().describe('New name'),
        color: z.string().optional().describe('New color'),
      }
    },
    async ({ id, name, color }) => {
      try {
        // Check if at least one field is provided
        if (name === undefined && color === undefined) {
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

        const success = await callIPC<boolean>('update-tag', {
          id,
          updates
        });

        if (!success) {
          return {
            content: [{
              type: 'text',
              text: `❌ Tag with ID ${id} not found.`,
            }],
            isError: true,
          };
        }

        return {
          content: [{
            type: 'text',
            text: `✅ Updated tag ID ${id} successfully.`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to update tag: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Delete a tag
  server.registerTool(
    'tags_delete',
    {
      description: 'Delete a tag by ID',
      inputSchema: {
        id: z.number().describe('Tag ID to delete'),
      }
    },
    async ({ id }) => {
      try {
        const success = await callIPC<boolean>('delete-tag', { id });

        if (!success) {
          return {
            content: [{
              type: 'text',
              text: `❌ Tag with ID ${id} not found.`,
            }],
            isError: true,
          };
        }

        return {
          content: [{
            type: 'text',
            text: `✅ Deleted tag ID ${id} successfully.`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to delete tag: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );
}
