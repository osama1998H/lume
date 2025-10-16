import { IpcMain, dialog } from 'electron';
import * as fsPromises from 'fs/promises';
import { IIPCHandlerContext, IIPCHandlerGroup } from '../types';

/**
 * DataManagementHandlers - IPC handlers for data import/export and cleanup
 *
 * Handles:
 * - clear-all-data: Clear all data from the database
 * - export-data: Export data to JSON or CSV format
 * - import-data: Import data from JSON or CSV format
 *
 * Dependencies: DatabaseManager
 */
export class DataManagementHandlers implements IIPCHandlerGroup {
  register(ipcMain: IpcMain, context: IIPCHandlerContext): void {
    // Clear all data
    // Extracted from main.ts:289-310
    ipcMain.handle('clear-all-data', async () => {
      try {
        if (!context.dbManager) {
          console.error('❌ Database manager not initialized');
          return false;
        }

        const success = context.dbManager.clearAllData();

        if (!success) {
          console.error('❌ Failed to clear all data');
        }

        return success;
      } catch (error) {
        console.error('Failed to clear all data:', error);
        return false;
      }
    });

    // Export data
    // Extracted from main.ts:312-370
    ipcMain.handle('export-data', async (_, format: 'json' | 'csv') => {
      try {
        if (!context.dbManager) {
          console.error('❌ Database manager not initialized');
          return { success: false, error: 'Database not initialized' };
        }


        // Show save dialog
        const defaultFileName = `lume-data-export-${new Date().toISOString().split('T')[0]}-${Date.now()}`;
        const extension = format === 'json' ? 'json' : 'zip';

        const result = await dialog.showSaveDialog(context.windowManager.getWindow()!, {
          title: 'Export Data',
          defaultPath: `${defaultFileName}.${extension}`,
          filters: [
            format === 'json'
              ? { name: 'JSON Files', extensions: ['json'] }
              : { name: 'ZIP Files', extensions: ['zip'] }
          ],
        });

        if (result.canceled || !result.filePath) {
          return { success: false, error: 'Export canceled' };
        }

        const filePath = result.filePath;

        // Export data from database
        const exportData = context.dbManager.exportAllData();

        if (format === 'json') {
          // Write JSON file
          await fsPromises.writeFile(
            filePath,
            JSON.stringify(exportData, null, 2),
            'utf8'
          );
          return { success: true, filePath };
        } else {
          // CSV format: Create multiple CSV files and zip them
          // For now, we'll just save as JSON and show a message
          // TODO: Implement CSV export with multiple files in a ZIP
          return {
            success: false,
            error: 'CSV export not yet implemented. Please use JSON format.'
          };
        }
      } catch (error) {
        console.error('Failed to export data:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // Import data
    // Extracted from main.ts:372-448
    ipcMain.handle('import-data', async (_, format: 'json' | 'csv', options?) => {
      try {
        if (!context.dbManager) {
          console.error('❌ Database manager not initialized');
          return {
            success: false,
            recordsImported: 0,
            recordsSkipped: 0,
            recordsUpdated: 0,
            errors: ['Database not initialized'],
            warnings: []
          };
        }


        // Show open dialog
        const result = await dialog.showOpenDialog(context.windowManager.getWindow()!, {
          title: 'Import Data',
          filters: [
            format === 'json'
              ? { name: 'JSON Files', extensions: ['json'] }
              : { name: 'ZIP Files', extensions: ['zip'] }
          ],
          properties: ['openFile'],
        });

        if (result.canceled || result.filePaths.length === 0) {
          return {
            success: false,
            recordsImported: 0,
            recordsSkipped: 0,
            recordsUpdated: 0,
            errors: ['Import canceled'],
            warnings: []
          };
        }

        const filePath = result.filePaths[0];

        if (format === 'json') {
          // Read JSON file
          const fileContent = await fsPromises.readFile(filePath, 'utf8');
          const importData = JSON.parse(fileContent);

          // Import data into database
          const importOptions = options || { strategy: 'merge' };
          const importResult = context.dbManager.importAllData(importData, importOptions);


          return importResult;
        } else {
          // CSV format: Not yet implemented
          return {
            success: false,
            recordsImported: 0,
            recordsSkipped: 0,
            recordsUpdated: 0,
            errors: ['CSV import not yet implemented. Please use JSON format.'],
            warnings: []
          };
        }
      } catch (error) {
        console.error('Failed to import data:', error);
        return {
          success: false,
          recordsImported: 0,
          recordsSkipped: 0,
          recordsUpdated: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          warnings: []
        };
      }
    });
  }
}
