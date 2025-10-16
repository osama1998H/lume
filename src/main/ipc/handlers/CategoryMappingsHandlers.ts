import { IpcMain } from 'electron';
import { IIPCHandlerContext, IIPCHandlerGroup } from '../types';
import { logger } from '@/services/logging/Logger';

/**
 * CategoryMappingsHandlers - IPC handlers for category mappings
 *
 * Handles:
 * - get-app-category-mappings: Get all app-to-category mappings
 * - add-app-category-mapping: Create app-to-category mapping
 * - delete-app-category-mapping: Delete app-to-category mapping
 * - get-domain-category-mappings: Get all domain-to-category mappings
 * - add-domain-category-mapping: Create domain-to-category mapping
 * - delete-domain-category-mapping: Delete domain-to-category mapping
 *
 * Dependencies: CategoriesService
 */
export class CategoryMappingsHandlers implements IIPCHandlerGroup {
  register(ipcMain: IpcMain, context: IIPCHandlerContext): void {
    // Get app category mappings
    // Extracted from main.ts:277-284
    ipcMain.handle('get-app-category-mappings', async () => {
      try {
        return await context.categoriesService?.getAppCategoryMappings() || [];
      } catch (error) {
        logger.error('Failed to get app category mappings:', {}, error instanceof Error ? error : undefined);
        return [];
      }
    });

    // Add app category mapping
    // Extracted from main.ts:286-293
    ipcMain.handle('add-app-category-mapping', async (_, appName: string, categoryId: number) => {
      try {
        return await context.categoriesService?.addAppCategoryMapping(appName, categoryId) || null;
      } catch (error) {
        logger.error('Failed to add app category mapping:', {}, error instanceof Error ? error : undefined);
        return null;
      }
    });

    // Delete app category mapping
    // Extracted from main.ts:295-302
    ipcMain.handle('delete-app-category-mapping', async (_, id: number) => {
      try {
        return await context.categoriesService?.deleteAppCategoryMapping(id) || false;
      } catch (error) {
        logger.error('Failed to delete app category mapping:', {}, error instanceof Error ? error : undefined);
        return false;
      }
    });

    // Get domain category mappings
    // Extracted from main.ts:304-311
    ipcMain.handle('get-domain-category-mappings', async () => {
      try {
        return await context.categoriesService?.getDomainCategoryMappings() || [];
      } catch (error) {
        logger.error('Failed to get domain category mappings:', {}, error instanceof Error ? error : undefined);
        return [];
      }
    });

    // Add domain category mapping
    // Extracted from main.ts:313-320
    ipcMain.handle('add-domain-category-mapping', async (_, domain: string, categoryId: number) => {
      try {
        return await context.categoriesService?.addDomainCategoryMapping(domain, categoryId) || null;
      } catch (error) {
        logger.error('Failed to add domain category mapping:', {}, error instanceof Error ? error : undefined);
        return null;
      }
    });

    // Delete domain category mapping
    // Extracted from main.ts:322-329
    ipcMain.handle('delete-domain-category-mapping', async (_, id: number) => {
      try {
        return await context.categoriesService?.deleteDomainCategoryMapping(id) || false;
      } catch (error) {
        logger.error('Failed to delete domain category mapping:', {}, error instanceof Error ? error : undefined);
        return false;
      }
    });
  }
}
