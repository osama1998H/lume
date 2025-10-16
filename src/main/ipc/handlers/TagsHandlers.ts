import { IpcMain } from 'electron';
import { IIPCHandlerContext, IIPCHandlerGroup } from '../types';
import type { Tag } from '../../../types';

/**
 * Args interfaces for type-safe IPC communication
 */
interface AddTagArgs {
  tag: Tag;
}

interface UpdateTagArgs {
  id: number;
  updates: Partial<Tag>;
}

interface DeleteTagArgs {
  id: number;
}

/**
 * TagsHandlers - IPC handlers for tag management
 *
 * Handles:
 * - get-tags: Get all tags
 * - add-tag: Create a new tag
 * - update-tag: Update an existing tag
 * - delete-tag: Delete a tag
 *
 * Dependencies: CategoriesService
 */
export class TagsHandlers implements IIPCHandlerGroup {
  register(ipcMain: IpcMain, context: IIPCHandlerContext): void {
    // Get all tags
    // Extracted from main.ts:728-739
    ipcMain.handle('get-tags', async () => {
      try {
        return (await context.categoriesService?.getTags()) || [];
      } catch (error) {
        console.error('Failed to get tags:', error);
        return [];
      }
    });

    // Add tag
    // Extracted from main.ts:741-752
    ipcMain.handle('add-tag', async (_, args: AddTagArgs) => {
      try {
        const { tag } = args;
        return (await context.categoriesService?.addTag(tag)) || null;
      } catch (error) {
        console.error('Failed to add tag:', error);
        return null;
      }
    });

    // Update tag
    // Extracted from main.ts:754-765
    ipcMain.handle('update-tag', async (_, args: UpdateTagArgs) => {
      try {
        const { id, updates } = args;
        return (await context.categoriesService?.updateTag(id, updates)) || false;
      } catch (error) {
        console.error('Failed to update tag:', error);
        return false;
      }
    });

    // Delete tag
    // Extracted from main.ts:767-778
    ipcMain.handle('delete-tag', async (_, args: DeleteTagArgs) => {
      try {
        const { id } = args;
        return (await context.categoriesService?.deleteTag(id)) || false;
      } catch (error) {
        console.error('Failed to delete tag:', error);
        return false;
      }
    });
  }
}
