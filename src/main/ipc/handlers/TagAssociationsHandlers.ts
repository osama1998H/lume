import { IpcMain } from 'electron';
import { IIPCHandlerContext, IIPCHandlerGroup } from '../types';

/**
 * TagAssociationsHandlers - IPC handlers for tag associations
 *
 * Handles:
 * - get-time-entry-tags: Get tags for a time entry
 * - add-time-entry-tags: Add tags to a time entry
 * - get-app-usage-tags: Get tags for an app usage record
 * - add-app-usage-tags: Add tags to an app usage record
 * - get-pomodoro-session-tags: Get tags for a pomodoro session
 * - add-pomodoro-session-tags: Add tags to a pomodoro session
 * - set-pomodoro-session-tags: Replace all tags for a pomodoro session
 * - get-productivity-goal-tags: Get tags for a productivity goal
 * - add-productivity-goal-tags: Add tags to a productivity goal
 * - set-productivity-goal-tags: Replace all tags for a productivity goal
 * - get-todo-tags: Get tags for a todo
 * - add-todo-tags: Add tags to a todo
 * - set-todo-tags: Replace all tags for a todo
 *
 * Dependencies: CategoriesService, DatabaseManager
 */
export class TagAssociationsHandlers implements IIPCHandlerGroup {
  register(ipcMain: IpcMain, context: IIPCHandlerContext): void {
    // Get time entry tags
    // Extracted from main.ts:333-340
    ipcMain.handle('get-time-entry-tags', async (_, timeEntryId: number) => {
      try {
        return await context.categoriesService?.getTimeEntryTags(timeEntryId) || [];
      } catch (error) {
        console.error('Failed to get time entry tags:', error);
        return [];
      }
    });

    // Add time entry tags
    // Extracted from main.ts:342-350
    ipcMain.handle('add-time-entry-tags', async (_, timeEntryId: number, tagIds: number[]) => {
      try {
        await context.categoriesService?.addTimeEntryTags(timeEntryId, tagIds);
        return true;
      } catch (error) {
        console.error('Failed to add time entry tags:', error);
        return false;
      }
    });

    // Get app usage tags
    // Extracted from main.ts:352-359
    ipcMain.handle('get-app-usage-tags', async (_, appUsageId: number) => {
      try {
        return await context.categoriesService?.getAppUsageTags(appUsageId) || [];
      } catch (error) {
        console.error('Failed to get app usage tags:', error);
        return [];
      }
    });

    // Add app usage tags
    // Extracted from main.ts:361-369
    ipcMain.handle('add-app-usage-tags', async (_, appUsageId: number, tagIds: number[]) => {
      try {
        await context.categoriesService?.addAppUsageTags(appUsageId, tagIds);
        return true;
      } catch (error) {
        console.error('Failed to add app usage tags:', error);
        return false;
      }
    });

    // Get pomodoro session tags
    // Extracted from main.ts:371-378
    ipcMain.handle('get-pomodoro-session-tags', async (_, pomodoroSessionId: number) => {
      try {
        return context.dbManager?.getPomodoroSessionTags(pomodoroSessionId) || [];
      } catch (error) {
        console.error('Failed to get pomodoro session tags:', error);
        return [];
      }
    });

    // Add pomodoro session tags
    // Extracted from main.ts:380-388
    ipcMain.handle('add-pomodoro-session-tags', async (_, pomodoroSessionId: number, tagIds: number[]) => {
      try {
        context.dbManager?.addPomodoroSessionTags(pomodoroSessionId, tagIds);
        return true;
      } catch (error) {
        console.error('Failed to add pomodoro session tags:', error);
        return false;
      }
    });

    // Set pomodoro session tags
    // Extracted from main.ts:390-398
    ipcMain.handle('set-pomodoro-session-tags', async (_, pomodoroSessionId: number, tagIds: number[]) => {
      try {
        context.dbManager?.setPomodoroSessionTags(pomodoroSessionId, tagIds);
        return true;
      } catch (error) {
        console.error('Failed to set pomodoro session tags:', error);
        return false;
      }
    });

    // Get productivity goal tags
    // Extracted from main.ts:400-407
    ipcMain.handle('get-productivity-goal-tags', async (_, productivityGoalId: number) => {
      try {
        return context.dbManager?.getProductivityGoalTags(productivityGoalId) || [];
      } catch (error) {
        console.error('Failed to get productivity goal tags:', error);
        return [];
      }
    });

    // Add productivity goal tags
    // Extracted from main.ts:409-417
    ipcMain.handle('add-productivity-goal-tags', async (_, productivityGoalId: number, tagIds: number[]) => {
      try {
        context.dbManager?.addProductivityGoalTags(productivityGoalId, tagIds);
        return true;
      } catch (error) {
        console.error('Failed to add productivity goal tags:', error);
        return false;
      }
    });

    // Set productivity goal tags
    // Extracted from main.ts:419-427
    ipcMain.handle('set-productivity-goal-tags', async (_, productivityGoalId: number, tagIds: number[]) => {
      try {
        context.dbManager?.setProductivityGoalTags(productivityGoalId, tagIds);
        return true;
      } catch (error) {
        console.error('Failed to set productivity goal tags:', error);
        return false;
      }
    });

    // Get todo tags
    ipcMain.handle('get-todo-tags', async (_, todoId: number) => {
      try {
        return context.dbManager?.getTodoTags(todoId) || [];
      } catch (error) {
        console.error('Failed to get todo tags:', error);
        return [];
      }
    });

    // Add todo tags
    ipcMain.handle('add-todo-tags', async (_, todoId: number, tagIds: number[]) => {
      try {
        context.dbManager?.addTodoTags(todoId, tagIds);
        return true;
      } catch (error) {
        console.error('Failed to add todo tags:', error);
        return false;
      }
    });

    // Set todo tags
    ipcMain.handle('set-todo-tags', async (_, todoId: number, tagIds: number[]) => {
      try {
        context.dbManager?.setTodoTags(todoId, tagIds);
        return true;
      } catch (error) {
        console.error('Failed to set todo tags:', error);
        return false;
      }
    });
  }
}
