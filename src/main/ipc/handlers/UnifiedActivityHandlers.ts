import { IpcMain } from 'electron';
import { IIPCHandlerContext, IIPCHandlerGroup } from '../types';
import type { UnifiedActivityUpdateOptions, BulkActivityOperation, ActivitySourceType } from '@/types';
import { logger } from '@/services/logging/Logger';

/**
 * UnifiedActivityHandlers - IPC handlers for unified activity log operations
 *
 * Handles:
 * - get-unified-activities: Get all unified activities in a date range with optional filters
 * - get-unified-activity: Get a single unified activity by ID and source type
 * - update-unified-activity: Update a unified activity
 * - delete-unified-activity: Delete a unified activity
 * - bulk-update-activities: Bulk update multiple activities
 * - bulk-delete-activities: Bulk delete multiple activities
 * - get-activity-conflicts: Get activities that overlap in time
 * - get-unified-activity-stats: Get statistics for unified activities
 * - search-activities: Search activities by query string
 * - merge-activities: Merge multiple activities into one
 *
 * Dependencies: DatabaseManager
 */
export class UnifiedActivityHandlers implements IIPCHandlerGroup {
  register(ipcMain: IpcMain, context: IIPCHandlerContext): void {
    // Get unified activities
    // Extracted from main.ts:452-465
    ipcMain.handle('get-unified-activities', async (_, startDate: string, endDate: string, filters?) => {
      try {
        if (!context.dbManager) {
          logger.error('❌ Database manager not initialized');
          return [];
        }
        const activities = context.dbManager.getUnifiedActivities(startDate, endDate, filters);
        return activities;
      } catch (error) {
        logger.error('Failed to get unified activities:', {}, error instanceof Error ? error : undefined);
        return [];
      }
    });

    // Get unified activity
    // Extracted from main.ts:467-480
    ipcMain.handle('get-unified-activity', async (_, id: number, sourceType: ActivitySourceType) => {
      try {
        if (!context.dbManager) {
          logger.error('❌ Database manager not initialized');
          return null;
        }
        const activity = context.dbManager.getUnifiedActivity(id, sourceType);
        return activity;
      } catch (error) {
        logger.error('Failed to get unified activity:', {}, error instanceof Error ? error : undefined);
        return null;
      }
    });

    // Update unified activity
    // Extracted from main.ts:482-500
    ipcMain.handle('update-unified-activity', async (_, options: UnifiedActivityUpdateOptions) => {
      try {
        if (!context.dbManager) {
          logger.error('❌ Database manager not initialized');
          return false;
        }
        const success = context.dbManager.updateUnifiedActivity(options);
        if (!success) {
          logger.error('❌ Failed to update unified activity');
        }
        return success;
      } catch (error) {
        logger.error('Failed to update unified activity:', {}, error instanceof Error ? error : undefined);
        return false;
      }
    });

    // Delete unified activity
    // Extracted from main.ts:502-520
    ipcMain.handle('delete-unified-activity', async (_, id: number, sourceType: ActivitySourceType) => {
      try {
        if (!context.dbManager) {
          logger.error('❌ Database manager not initialized');
          return false;
        }
        const success = context.dbManager.deleteUnifiedActivity(id, sourceType);
        if (!success) {
          logger.error('❌ Failed to delete unified activity');
        }
        return success;
      } catch (error) {
        logger.error('Failed to delete unified activity:', {}, error instanceof Error ? error : undefined);
        return false;
      }
    });

    // Bulk update activities
    // Extracted from main.ts:522-536
    ipcMain.handle('bulk-update-activities', async (_, operation: BulkActivityOperation) => {
      try {
        if (!context.dbManager) {
          logger.error('❌ Database manager not initialized');
          return { success: false, updated: 0, failed: 0 };
        }
        const result = context.dbManager.bulkUpdateActivities(operation);
        return result;
      } catch (error) {
        logger.error('Failed to bulk update activities:', {}, error instanceof Error ? error : undefined);
        return { success: false, updated: 0, failed: 0 };
      }
    });

    // Bulk delete activities
    // Extracted from main.ts:538-552
    ipcMain.handle('bulk-delete-activities', async (_, activityIds) => {
      try {
        if (!context.dbManager) {
          logger.error('❌ Database manager not initialized');
          return { success: false, deleted: 0, failed: 0 };
        }
        const result = context.dbManager.bulkDeleteActivities(activityIds);
        return result;
      } catch (error) {
        logger.error('Failed to bulk delete activities:', {}, error instanceof Error ? error : undefined);
        return { success: false, deleted: 0, failed: 0 };
      }
    });

    // Get activity conflicts
    // Extracted from main.ts:554-567
    ipcMain.handle('get-activity-conflicts', async (_, startDate: string, endDate: string) => {
      try {
        if (!context.dbManager) {
          logger.error('❌ Database manager not initialized');
          return [];
        }
        const conflicts = context.dbManager.getActivityConflicts(startDate, endDate);
        return conflicts;
      } catch (error) {
        logger.error('Failed to get activity conflicts:', {}, error instanceof Error ? error : undefined);
        return [];
      }
    });

    // Get unified activity stats
    // Extracted from main.ts:569-598
    ipcMain.handle('get-unified-activity-stats', async (_, startDate: string, endDate: string) => {
      try {
        if (!context.dbManager) {
          logger.error('❌ Database manager not initialized');
          return {
            totalActivities: 0,
            totalDuration: 0,
            bySourceType: { manual: 0, automatic: 0, pomodoro: 0 },
            byCategory: [],
            editableCount: 0,
            conflictsCount: 0,
            gapsDetected: 0,
          };
        }
        const stats = context.dbManager.getUnifiedActivityStats(startDate, endDate);
        return stats;
      } catch (error) {
        logger.error('Failed to get unified activity stats:', {}, error instanceof Error ? error : undefined);
        return {
          totalActivities: 0,
          totalDuration: 0,
          bySourceType: { manual: 0, automatic: 0, pomodoro: 0 },
          byCategory: [],
          editableCount: 0,
          conflictsCount: 0,
          gapsDetected: 0,
        };
      }
    });

    // Search activities
    // Extracted from main.ts:600-614
    ipcMain.handle('search-activities', async (_, query: string, filters?) => {
      try {
        if (!context.dbManager) {
          logger.error('❌ Database manager not initialized');
          return [];
        }
        const results = context.dbManager.searchActivities(query, filters);
        return results;
      } catch (error) {
        logger.error('Failed to search activities:', {}, error instanceof Error ? error : undefined);
        return [];
      }
    });

    // Merge activities
    // Extracted from main.ts:616-637
    ipcMain.handle('merge-activities', async (_, activityIds: Array<{ id: number; sourceType: ActivitySourceType }>, strategy: 'longest' | 'earliest' | 'latest' = 'longest') => {
      try {
        if (!context.dbManager) {
          logger.error('❌ Database manager not initialized');
          return { success: false, error: 'Database not initialized' };
        }
        const result = await context.dbManager.mergeActivitiesById(
          activityIds,
          strategy
        );
        if (!result.success) {
          logger.error(`❌ Failed to merge activities: ${result.error}`);
        }
        return result;
      } catch (error) {
        logger.error('Failed to merge activities:', {}, error instanceof Error ? error : undefined);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });
  }
}
