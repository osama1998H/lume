import { IpcMain } from 'electron';
import { IIPCHandlerContext, IIPCHandlerGroup } from '../types';
import { getLastCrashReport, getUploadedReports } from '../../../config/crashReporter';

/**
 * CrashReporterHandlers - IPC handlers for crash reporting
 *
 * Handles:
 * - get-last-crash-report: Get the last crash report
 * - get-uploaded-crash-reports: Get all uploaded crash reports
 * - test-crash-reporting: Test crash reporting (development only)
 *
 * Dependencies: crashReporter module
 */
export class CrashReporterHandlers implements IIPCHandlerGroup {
  register(ipcMain: IpcMain, _context: IIPCHandlerContext): void {
    // Get last crash report
    // Extracted from main.ts:256-263
    ipcMain.handle('get-last-crash-report', async () => {
      try {
        return getLastCrashReport();
      } catch (error) {
        console.error('Failed to get last crash report:', error);
        return null;
      }
    });

    // Get uploaded crash reports
    // Extracted from main.ts:265-272
    ipcMain.handle('get-uploaded-crash-reports', async () => {
      try {
        return getUploadedReports();
      } catch (error) {
        console.error('Failed to get uploaded crash reports:', error);
        return [];
      }
    });

    // Test crash reporting (development only)
    // Extracted from main.ts:274-284
    ipcMain.handle('test-crash-reporting', async () => {
      try {
        const { runAllCrashTests } = await import('../../../test/crashTest');
        await runAllCrashTests();
        return true;
      } catch (error) {
        console.error('Failed to run crash tests:', error);
        return false;
      }
    });
  }
}
