import { IpcMain } from 'electron';
import { IIPCHandlerContext, IIPCHandlerGroup } from '../types';
import { logger } from '@/services/logging/Logger';

/**
 * StatisticsHandlers - IPC handlers for statistics queries
 *
 * Handles:
 * - get-category-stats: Get statistics for categories in a date range
 * - get-tag-stats: Get statistics for tags in a date range
 *
 * Dependencies: CategoriesService
 */
export class StatisticsHandlers implements IIPCHandlerGroup {
  register(ipcMain: IpcMain, context: IIPCHandlerContext): void {
    // Get category stats
    // Extracted from main.ts:430-437
    ipcMain.handle('get-category-stats', async (_, startDate?: string, endDate?: string) => {
      try {
        return await context.categoriesService?.getCategoryStats(startDate, endDate) || [];
      } catch (error) {
        logger.error('Failed to get category stats:', {}, error instanceof Error ? error : undefined);
        return [];
      }
    });

    // Get tag stats
    // Extracted from main.ts:439-446
    ipcMain.handle('get-tag-stats', async (_, startDate?: string, endDate?: string) => {
      try {
        return await context.categoriesService?.getTagStats(startDate, endDate) || [];
      } catch (error) {
        logger.error('Failed to get tag stats:', {}, error instanceof Error ? error : undefined);
        return [];
      }
    });
  }
}
