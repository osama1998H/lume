import { IpcMain } from 'electron';
import { IIPCHandlerContext, IIPCHandlerGroup } from '../types';

/**
 * AppUsageHandlers - IPC handlers for application usage tracking
 *
 * Handles:
 * - add-app-usage: Record application usage data
 *
 * Dependencies: DatabaseManager
 */
export class AppUsageHandlers implements IIPCHandlerGroup {
  register(ipcMain: IpcMain, context: IIPCHandlerContext): void {
    // Add app usage
    // Extracted from main.ts:256-267
    ipcMain.handle('add-app-usage', async (_, usage) => {
      try {
        console.log('Add app usage:', usage);
        return context.dbManager?.addAppUsage(usage) || null;
      } catch (error) {
        console.error('Failed to add app usage:', error);
        return null;
      }
    });
  }
}
