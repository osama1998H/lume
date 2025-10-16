import { IpcMain } from 'electron';
import { IIPCHandlerContext, IIPCHandlerGroup } from '../types';
import { logger } from '@/services/logging/Logger';

/**
 * TimelineHandlers - IPC handlers for timeline data
 *
 * Handles:
 * - get-timeline-activities: Get activities for timeline view in a date range
 * - get-timeline-summary: Get summary statistics for timeline in a date range
 *
 * Dependencies: DatabaseManager, CategoriesService
 */
export class TimelineHandlers implements IIPCHandlerGroup {
  register(ipcMain: IpcMain, context: IIPCHandlerContext): void {
    // Get timeline activities
    // Extracted from main.ts:450-463
    ipcMain.handle('get-timeline-activities', async (_, startDate: string, endDate: string) => {
      try {
        if (!context.dbManager) {
          logger.error('❌ Database manager not initialized');
          return [];
        }
        const activities = context.dbManager.getTimelineActivities(startDate, endDate);
        return activities;
      } catch (error) {
        logger.error('Failed to get timeline activities:', {}, error instanceof Error ? error : undefined);
        return [];
      }
    });

    // Get timeline summary
    // Extracted from main.ts:465-513
    ipcMain.handle('get-timeline-summary', async (_, startDate: string, endDate: string) => {
      try {
        if (!context.dbManager) {
          logger.error('❌ Database manager not initialized');
          return {
            totalActivities: 0,
            totalDuration: 0,
            averageDuration: 0,
            longestActivity: null,
            categoryBreakdown: []
          };
        }

        const activities = context.dbManager.getTimelineActivities(startDate, endDate);

        // Calculate summary statistics
        const totalActivities = activities.length;
        const totalDuration = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
        const averageDuration = totalActivities > 0 ? totalDuration / totalActivities : 0;

        // Find longest activity
        const longestActivity = activities.reduce((longest, current) => {
          if (!longest || (current.duration || 0) > (longest.duration || 0)) {
            return current;
          }
          return longest;
        }, null as any);

        // Get category breakdown using existing service
        const categoryBreakdown = await context.categoriesService?.getCategoryStats(startDate, endDate) || [];

        return {
          totalActivities,
          totalDuration,
          averageDuration,
          longestActivity,
          categoryBreakdown
        };
      } catch (error) {
        logger.error('Failed to get timeline summary:', {}, error instanceof Error ? error : undefined);
        return {
          totalActivities: 0,
          totalDuration: 0,
          averageDuration: 0,
          longestActivity: null,
          categoryBreakdown: []
        };
      }
    });
  }
}
