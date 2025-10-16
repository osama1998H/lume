import { IpcMain } from 'electron';
import { IIPCHandlerContext, IIPCHandlerGroup } from '../types';

/**
 * PomodoroTimerHandlers - IPC handlers for pomodoro timer control
 *
 * Handles:
 * - start-pomodoro-session: Start a focus/break session
 * - pause-pomodoro-session: Pause current session
 * - resume-pomodoro-session: Resume paused session
 * - stop-pomodoro-session: Stop current session
 * - skip-pomodoro-session: Skip to next session
 * - get-pomodoro-status: Get current timer status
 *
 * Dependencies: PomodoroService
 */
export class PomodoroTimerHandlers implements IIPCHandlerGroup {
  register(ipcMain: IpcMain, context: IIPCHandlerContext): void {
    // Start pomodoro session
    // Extracted from main.ts:490-499
    ipcMain.handle(
      'start-pomodoro-session',
      async (_, task: string, sessionType: 'focus' | 'shortBreak' | 'longBreak', todoId?: number) => {
        try {
          if (context.pomodoroService) {
            context.pomodoroService.start(task, sessionType, todoId);
          }
        } catch (error) {
          console.error('Failed to start pomodoro session:', error);
        }
      }
    );

    // Pause pomodoro session
    // Extracted from main.ts:501-510
    ipcMain.handle('pause-pomodoro-session', async () => {
      try {
        if (context.pomodoroService) {
          context.pomodoroService.pause();
        }
      } catch (error) {
        console.error('Failed to pause pomodoro session:', error);
      }
    });

    // Resume pomodoro session
    // Extracted from main.ts:512-521
    ipcMain.handle('resume-pomodoro-session', async () => {
      try {
        if (context.pomodoroService) {
          context.pomodoroService.resume();
        }
      } catch (error) {
        console.error('Failed to resume pomodoro session:', error);
      }
    });

    // Stop pomodoro session
    // Extracted from main.ts:523-532
    ipcMain.handle('stop-pomodoro-session', async () => {
      try {
        if (context.pomodoroService) {
          context.pomodoroService.stop();
        }
      } catch (error) {
        console.error('Failed to stop pomodoro session:', error);
      }
    });

    // Skip pomodoro session
    // Extracted from main.ts:534-543
    ipcMain.handle('skip-pomodoro-session', async () => {
      try {
        if (context.pomodoroService) {
          context.pomodoroService.skip();
        }
      } catch (error) {
        console.error('Failed to skip pomodoro session:', error);
      }
    });

    // Get pomodoro status
    // Extracted from main.ts:545-566
    ipcMain.handle('get-pomodoro-status', async () => {
      try {
        return (
          context.pomodoroService?.getStatus() || {
            state: 'idle',
            sessionType: 'focus',
            timeRemaining: 0,
            totalDuration: 0,
            currentTask: '',
            sessionsCompleted: 0,
          }
        );
      } catch (error) {
        console.error('Failed to get pomodoro status:', error);
        return {
          state: 'idle',
          sessionType: 'focus',
          timeRemaining: 0,
          totalDuration: 0,
          currentTask: '',
          sessionsCompleted: 0,
        };
      }
    });
  }
}
