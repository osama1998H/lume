import { IpcMain } from 'electron';
import { IIPCHandlerContext, IIPCHandlerGroup } from '../types';

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
    ipcMain.handle('add-time-entry', async (_, entry) => {
      try {
        console.log('Add time entry:', entry);
        return context.dbManager?.addTimeEntry(entry) || null;
      } catch (error) {
        console.error('Failed to add time entry:', error);
        return null;
      }
    });

    // Update time entry
    // Extracted from main.ts:230-241
    ipcMain.handle('update-time-entry', async (_, id: number, updates: any) => {
      try {
        console.log('Update time entry:', id, updates);
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
        console.log('Get active time entry:', activeEntry);
        return activeEntry;
      } catch (error) {
        console.error('Failed to get active time entry:', error);
        return null;
      }
    });
  }
}
