import { IpcMain } from 'electron';
import { IIPCHandlerContext, IIPCHandlerGroup } from '../types';
import type { Category } from '@/types';
import { logger } from '@/services/logging/Logger';

/**
 * Args interfaces for type-safe IPC communication
 */
interface AddCategoryArgs {
  category: Category;
}

interface UpdateCategoryArgs {
  id: number;
  updates: Partial<Category>;
}

interface DeleteCategoryArgs {
  id: number;
}

/**
 * CategoriesHandlers - IPC handlers for category management
 *
 * Handles:
 * - get-categories: Get all categories
 * - get-category-by-id: Get a specific category
 * - add-category: Create a new category
 * - update-category: Update an existing category
 * - delete-category: Delete a category
 *
 * Dependencies: CategoriesService
 */
export class CategoriesHandlers implements IIPCHandlerGroup {
  register(ipcMain: IpcMain, context: IIPCHandlerContext): void {
    // Get all categories
    // Extracted from main.ts:663-674
    ipcMain.handle('get-categories', async () => {
      try {
        return (await context.categoriesService?.getCategories()) || [];
      } catch (error) {
        logger.error('Failed to get categories:', {}, error instanceof Error ? error : undefined);
        return [];
      }
    });

    // Get category by ID
    // Extracted from main.ts:676-687
    ipcMain.handle('get-category-by-id', async (_, id: number) => {
      try {
        return (await context.categoriesService?.getCategoryById(id)) || null;
      } catch (error) {
        logger.error('Failed to get category by ID:', {}, error instanceof Error ? error : undefined);
        return null;
      }
    });

    // Add category
    // Extracted from main.ts:689-700
    ipcMain.handle('add-category', async (_, args: AddCategoryArgs) => {
      try {
        const { category } = args;
        return (await context.categoriesService?.addCategory(category)) || null;
      } catch (error) {
        logger.error('Failed to add category:', {}, error instanceof Error ? error : undefined);
        return null;
      }
    });

    // Update category
    // Extracted from main.ts:702-713
    ipcMain.handle('update-category', async (_, args: UpdateCategoryArgs) => {
      try {
        const { id, updates } = args;
        return (await context.categoriesService?.updateCategory(id, updates)) || false;
      } catch (error) {
        logger.error('Failed to update category:', {}, error instanceof Error ? error : undefined);
        return false;
      }
    });

    // Delete category
    // Extracted from main.ts:715-726
    ipcMain.handle('delete-category', async (_, args: DeleteCategoryArgs) => {
      try {
        const { id } = args;
        return (await context.categoriesService?.deleteCategory(id)) || false;
      } catch (error) {
        logger.error('Failed to delete category:', {}, error instanceof Error ? error : undefined);
        return false;
      }
    });
  }
}
