import { IpcMain } from 'electron';
import { IIPCHandlerContext, IIPCHandlerGroup } from '../types';
import type { TimeEntry } from '../../../types';

/**
 * TimeEntryHandlers - IPC handlers for manual time entry operations
 *
 * Handles:
 * - add-time-entry: Add a new manual time entry
 * - update-time-entry: Update an existing time entry
 * - get-active-time-entry: Get currently active time entry
 *
 * Dependencies: DatabaseManager
 */
export class TimeEntryHandlers implements IIPCHandlerGroup {
  register(ipcMain: IpcMain, context: IIPCHandlerContext): void {
    // Add time entry
    // Extracted from main.ts:217-228
    ipcMain.handle('add-time-entry', async (_, args: Record<string, any>) => {
      try {
        // Extract parameters from args object
        const { task, categoryId, startTime, endTime, todoId } = args;

        // Build entry object, excluding undefined and null values
        const entry: Partial<TimeEntry> = { task };
        if (categoryId !== undefined && categoryId !== null) entry.categoryId = categoryId;
        if (startTime !== undefined && startTime !== null) entry.startTime = startTime;
        if (endTime !== undefined && endTime !== null) entry.endTime = endTime;
        if (todoId !== undefined && todoId !== null) entry.todoId = todoId;

        // Only log in development; redact task description
        if (process.env.NODE_ENV !== 'production') {
          console.debug('Add time entry:', {
            ...entry,
            task: entry.task ? '[redacted]' : undefined,
          });
        }
        return context.dbManager?.addTimeEntry(entry as TimeEntry) || null;
      } catch (error) {
        console.error('Failed to add time entry:', error);
        return null;
      }
    });

    // Update time entry
    // Extracted from main.ts:230-241
    ipcMain.handle('update-time-entry', async (_, args: Record<string, any>) => {
      try {
        const { id, updates } = args;

        // Only log in development; redact task description
        if (process.env.NODE_ENV !== 'production') {
          console.debug('Update time entry:', id, {
            ...updates,
            task: updates?.task ? '[redacted]' : undefined,
          });
        }
        return context.dbManager?.updateTimeEntry(id, updates) || false;
      } catch (error) {
        console.error('Failed to update time entry:', error);
        return false;
      }
    });

    // Get active time entry
    // Extracted from main.ts:243-254
    ipcMain.handle('get-active-time-entry', async () => {
      try {
        const activeEntry = context.dbManager?.getActiveTimeEntry() || null;
        return activeEntry;
      } catch (error) {
        console.error('Failed to get active time entry:', error);
        return null;
      }
    });
  }
}
