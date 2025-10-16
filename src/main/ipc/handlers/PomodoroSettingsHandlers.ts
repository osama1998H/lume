import { IpcMain } from 'electron';
import { IIPCHandlerContext, IIPCHandlerGroup } from '../types';
import { logger } from '@/services/logging/Logger';

/**
 * PomodoroSettingsHandlers - IPC handlers for pomodoro settings management
 *
 * Handles:
 * - get-pomodoro-settings: Get current pomodoro settings
 * - save-pomodoro-settings: Save pomodoro settings and update services
 *
 * Dependencies: SettingsManager, PomodoroService, NotificationService
 *
 * Note: save-pomodoro-settings has side effects:
 * - Updates pomodoro service with new settings
 * - Updates notification service sound and notification preferences
 */
export class PomodoroSettingsHandlers implements IIPCHandlerGroup {
  register(ipcMain: IpcMain, context: IIPCHandlerContext): void {
    // Get pomodoro settings
    // Extracted from main.ts:337-355
    ipcMain.handle('get-pomodoro-settings', async () => {
      try {
        const settings = context.settingsManager.getSettings();
        return settings.pomodoro || {
          focusDuration: 25,
          shortBreakDuration: 5,
          longBreakDuration: 15,
          longBreakInterval: 4,
          autoStartBreaks: false,
          autoStartFocus: false,
          soundEnabled: true,
          notificationsEnabled: true,
          dailyGoal: 8,
        };
      } catch (error) {
        logger.error('Failed to get pomodoro settings:', {}, error instanceof Error ? error : undefined);
        return null;
      }
    });

    // Save pomodoro settings
    // Extracted from main.ts:357-379
    ipcMain.handle('save-pomodoro-settings', async (_, pomodoroSettings) => {
      try {
        const settings = context.settingsManager.getSettings();
        settings.pomodoro = pomodoroSettings;
        const success = context.settingsManager.saveSettings(settings);

        // Update running services with new settings
        if (success && context.pomodoroService && context.notificationService) {
          context.pomodoroService.updateSettings(pomodoroSettings);
          context.notificationService.updateSettings(
            pomodoroSettings.soundEnabled,
            pomodoroSettings.notificationsEnabled
          );
        }

        return success;
      } catch (error) {
        logger.error('Failed to save pomodoro settings:', {}, error instanceof Error ? error : undefined);
        return false;
      }
    });
  }
}
