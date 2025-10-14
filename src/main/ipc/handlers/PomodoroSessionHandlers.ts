import { IpcMain } from 'electron';
import { IIPCHandlerContext, IIPCHandlerGroup } from '../types';

/**
 * PomodoroSessionHandlers - IPC handlers for pomodoro session management
 *
 * Handles:
 * - add-pomodoro-session: Add a pomodoro session record
 * - update-pomodoro-session: Update an existing pomodoro session
 * - get-pomodoro-stats: Get pomodoro statistics for a date range
 *
 * Dependencies: DatabaseManager
 */
export class PomodoroSessionHandlers implements IIPCHandlerGroup {
  register(ipcMain: IpcMain, context: IIPCHandlerContext): void {
    // Add pomodoro session
    // Extracted from main.ts:381-409
    ipcMain.handle('add-pomodoro-session', async (_, session) => {
      try {
        // Validate session data
        const requiredFields = [
          { key: 'startTime', type: 'number' },
          { key: 'endTime', type: 'number' },
          { key: 'duration', type: 'number' },
          { key: 'type', type: 'string' }
        ];

        for (const field of requiredFields) {
          if (
            !(field.key in session) ||
            typeof session[field.key] !== field.type
          ) {
            console.error(
              `Invalid pomodoro session: missing or invalid field '${field.key}'`
            );
            return null;
          }
        }

        console.log('Add pomodoro session:', session);
        return context.dbManager?.addPomodoroSession(session) || null;
      } catch (error) {
        console.error('Failed to add pomodoro session:', error);
        return null;
      }
    });

    // Update pomodoro session
    // Extracted from main.ts:411-419
    ipcMain.handle('update-pomodoro-session', async (_, id: number, updates: any) => {
      try {
        console.log('Update pomodoro session:', id, updates);
        return context.dbManager?.updatePomodoroSession(id, updates) || false;
      } catch (error) {
        console.error('Failed to update pomodoro session:', error);
        return false;
      }
    });

    // Get pomodoro stats
    // Extracted from main.ts:421-442
    ipcMain.handle('get-pomodoro-stats', async (_, startDate?: string, endDate?: string) => {
      try {
        return context.dbManager?.getPomodoroStats(startDate, endDate) || {
          totalSessions: 0,
          completedSessions: 0,
          totalFocusTime: 0,
          totalBreakTime: 0,
          completionRate: 0,
          currentStreak: 0,
        };
      } catch (error) {
        console.error('Failed to get pomodoro stats:', error);
        return {
          totalSessions: 0,
          completedSessions: 0,
          totalFocusTime: 0,
          totalBreakTime: 0,
          completionRate: 0,
          currentStreak: 0,
        };
      }
    });
  }
}
