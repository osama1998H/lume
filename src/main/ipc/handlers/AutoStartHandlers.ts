import { IpcMain } from 'electron';
import { IIPCHandlerContext, IIPCHandlerGroup } from '../types';

/**
 * AutoStartHandlers - IPC handlers for auto-start management
 *
 * Handles:
 * - get-auto-start-status: Get current auto-start status
 * - set-auto-start: Enable or disable auto-start on login
 *
 * Dependencies: AutoLaunchManager
 */
export class AutoStartHandlers implements IIPCHandlerGroup {
  register(ipcMain: IpcMain, context: IIPCHandlerContext): void {
    // Get auto-start status
    // Extracted from main.ts:622-629
    ipcMain.handle('get-auto-start-status', async () => {
      try {
        return context.autoLaunchManager.getStatus();
      } catch (error) {
        console.error('Failed to get auto-start status:', error);
        return false;
      }
    });

    // Set auto-start
    // Extracted from main.ts:631-638
    ipcMain.handle('set-auto-start', async (_, enabled: boolean) => {
      try {
        return context.autoLaunchManager.setAutoStart(enabled);
      } catch (error) {
        console.error('Failed to set auto-start:', error);
        return false;
      }
    });
  }
}
