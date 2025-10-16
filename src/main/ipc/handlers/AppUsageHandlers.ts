import { IpcMain } from 'electron';
import { IIPCHandlerContext, IIPCHandlerGroup } from '../types';
import type { AppUsage } from '@/types';
import { logger } from '@/services/logging/Logger';

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
    ipcMain.handle('add-app-usage', async (_, usage: Partial<AppUsage>) => {
      try {
        // Only log in development; redact PII fields (url, windowTitle)
        if (process.env.NODE_ENV !== 'production') {
          logger.debug('Add app usage:', {
            ...usage,
            url: usage.url ? '[redacted]' : undefined,
            windowTitle: usage.windowTitle ? '[redacted]' : undefined,
          });
        }
        return context.dbManager?.addAppUsage(usage as AppUsage) || null;
      } catch (error) {
        logger.error('Failed to add app usage:', {}, error instanceof Error ? error : undefined);
        return null;
      }
    });
  }
}
