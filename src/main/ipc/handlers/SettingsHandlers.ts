import { IpcMain } from 'electron';
import { IIPCHandlerContext, IIPCHandlerGroup } from '../types';
import type { Settings } from '../../core/SettingsManager';

/**
 * SettingsHandlers - IPC handlers for application settings management
 *
 * Handles:
 * - get-settings: Retrieve current settings
 * - save-settings: Save settings and apply changes
 *
 * Dependencies: SettingsManager, TrayManager (indirectly), AutoLaunchManager (indirectly), ActivityTracker (indirectly)
 *
 * Note: save-settings has side effects:
 * - Updates activity tracker settings if changed
 * - Updates tray visibility if minimizeToTray changed
 * - Updates auto-start if autoStartOnLogin changed
 */
export class SettingsHandlers implements IIPCHandlerGroup {
  register(ipcMain: IpcMain, context: IIPCHandlerContext): void {
    // Get settings
    // Extracted from main.ts:269-280
    ipcMain.handle('get-settings', async () => {
      try {
        return context.settingsManager.getSettings();
      } catch (error) {
        console.error('Failed to get settings:', error);
        return null;
      }
    });

    // Save settings
    // Extracted from main.ts:282-313
    ipcMain.handle('save-settings', async (_, settings: Settings) => {
      try {
        // Only log in development to reduce noise in production
        if (process.env.NODE_ENV !== 'production') {
          console.debug('💾 Saving settings:', JSON.stringify(settings, null, 2));
        }

        // Get previous settings before saving
        const previousSettings = context.settingsManager.getSettings();
        const success = context.settingsManager.saveSettings(settings);

        // Update activity tracking settings if present
        if (success && context.activityTracker && settings.activityTracking) {
          context.activityTracker.updateSettings(settings.activityTracking);
        }

        // Update tray when minimizeToTray setting changes
        if (success && settings.minimizeToTray !== previousSettings.minimizeToTray) {
          if (settings.minimizeToTray) {
            context.trayManager?.setup();
          } else {
            context.trayManager?.destroy();
          }
        }

        // Update auto-start when autoStartOnLogin setting changes
        if (success && settings.autoStartOnLogin !== previousSettings.autoStartOnLogin) {
          context.autoLaunchManager.setAutoStart(settings.autoStartOnLogin);
        }

        return success;
      } catch (error) {
        console.error('❌ Failed to save settings:', error);
        return false;
      }
    });
  }
}
