import { IpcMain } from 'electron';
import { IIPCHandlerContext, IIPCHandlerGroup } from '../types';

/**
 * ActivityTrackingHandlers - IPC handlers for activity tracking service
 *
 * Handles:
 * - start-activity-tracking: Start tracking user activity
 * - stop-activity-tracking: Stop tracking user activity
 * - get-activity-tracking-status: Get current tracking status
 * - get-current-activity-session: Get current activity session
 * - get-recent-activity-sessions: Get recent activity sessions
 * - get-top-applications: Get top used applications
 * - get-top-websites: Get top visited websites
 *
 * Dependencies: ActivityTrackingService
 */
export class ActivityTrackingHandlers implements IIPCHandlerGroup {
  register(ipcMain: IpcMain, context: IIPCHandlerContext): void {
    // Start activity tracking
    // Extracted from main.ts:234-245
    ipcMain.handle('start-activity-tracking', async () => {
      try {
        if (context.activityTracker) {
          context.activityTracker.start();
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to start activity tracking:', error);
        return false;
      }
    });

    // Stop activity tracking
    // Extracted from main.ts:247-258
    ipcMain.handle('stop-activity-tracking', async () => {
      try {
        if (context.activityTracker) {
          context.activityTracker.stop();
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to stop activity tracking:', error);
        return false;
      }
    });

    // Get activity tracking status
    // Extracted from main.ts:260-267
    ipcMain.handle('get-activity-tracking-status', async () => {
      try {
        return context.activityTracker?.isTracking() || false;
      } catch (error) {
        console.error('Failed to get activity tracking status:', error);
        return false;
      }
    });

    // Get current activity session
    // Extracted from main.ts:269-276
    ipcMain.handle('get-current-activity-session', async () => {
      try {
        return context.activityTracker?.getCurrentSession() || null;
      } catch (error) {
        console.error('Failed to get current activity session:', error);
        return null;
      }
    });

    // Get recent activity sessions
    // Extracted from main.ts:278-285
    ipcMain.handle('get-recent-activity-sessions', async (_, limit = 50) => {
      try {
        return context.activityTracker?.getRecentSessions(limit) || [];
      } catch (error) {
        console.error('Failed to get recent activity sessions:', error);
        return [];
      }
    });

    // Get top applications
    // Extracted from main.ts:287-294
    ipcMain.handle('get-top-applications', async (_, limit = 10) => {
      try {
        return await context.activityTracker?.getTopApplications(limit) || [];
      } catch (error) {
        console.error('Failed to get top applications:', error);
        return [];
      }
    });

    // Get top websites
    // Extracted from main.ts:296-303
    ipcMain.handle('get-top-websites', async (_, limit = 10) => {
      try {
        return await context.activityTracker?.getTopWebsites(limit) || [];
      } catch (error) {
        console.error('Failed to get top websites:', error);
        return [];
      }
    });
  }
}
