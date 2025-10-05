/**
 * Unit tests for preload.ts
 * Tests the Electron preload script and IPC API exposure
 */

import { contextBridge, ipcRenderer } from 'electron';

// Mock electron modules
jest.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: jest.fn(),
  },
  ipcRenderer: {
    invoke: jest.fn(),
  },
}));

describe('preload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('API exposure', () => {
    it('should expose electronAPI to the main world', () => {
      require('../preload');
      
      expect(contextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        'electronAPI',
        expect.any(Object)
      );
    });

    it('should expose correct API methods', () => {
      require('../preload');
      
      const [, api] = (contextBridge.exposeInMainWorld as jest.Mock).mock.calls[0];
      
      // Existing methods
      expect(api.getTimeEntries).toBeDefined();
      expect(api.addTimeEntry).toBeDefined();
      expect(api.getAppUsage).toBeDefined();
      expect(api.addAppUsage).toBeDefined();
      expect(api.getSettings).toBeDefined();
      expect(api.saveSettings).toBeDefined();
      expect(api.startActivityTracking).toBeDefined();
      expect(api.stopActivityTracking).toBeDefined();
      expect(api.getActivityTrackingStatus).toBeDefined();
      expect(api.getCurrentActivitySession).toBeDefined();
      expect(api.getRecentActivitySessions).toBeDefined();
      expect(api.getTopApplications).toBeDefined();
      expect(api.getTopWebsites).toBeDefined();
      
      // New crash reporting methods
      expect(api.getLastCrashReport).toBeDefined();
      expect(api.getUploadedCrashReports).toBeDefined();
      expect(api.testCrashReporting).toBeDefined();
    });

    it('should have all methods as functions', () => {
      require('../preload');
      
      const [, api] = (contextBridge.exposeInMainWorld as jest.Mock).mock.calls[0];
      
      Object.values(api).forEach(method => {
        expect(typeof method).toBe('function');
      });
    });
  });

  describe('IPC method implementations', () => {
    let api: any;

    beforeEach(() => {
      require('../preload');
      [, api] = (contextBridge.exposeInMainWorld as jest.Mock).mock.calls[0];
    });

    describe('getLastCrashReport', () => {
      it('should invoke correct IPC channel', async () => {
        (ipcRenderer.invoke as jest.Mock).mockResolvedValue({ id: 'crash-123' });
        
        await api.getLastCrashReport();
        
        expect(ipcRenderer.invoke).toHaveBeenCalledWith('get-last-crash-report');
      });

      it('should return crash report data', async () => {
        const mockReport = { id: 'crash-123', date: new Date() };
        (ipcRenderer.invoke as jest.Mock).mockResolvedValue(mockReport);
        
        const result = await api.getLastCrashReport();
        
        expect(result).toEqual(mockReport);
      });

      it('should handle null response', async () => {
        (ipcRenderer.invoke as jest.Mock).mockResolvedValue(null);
        
        const result = await api.getLastCrashReport();
        
        expect(result).toBeNull();
      });

      it('should handle errors', async () => {
        (ipcRenderer.invoke as jest.Mock).mockRejectedValue(new Error('IPC error'));
        
        await expect(api.getLastCrashReport()).rejects.toThrow('IPC error');
      });
    });

    describe('getUploadedCrashReports', () => {
      it('should invoke correct IPC channel', async () => {
        (ipcRenderer.invoke as jest.Mock).mockResolvedValue([]);
        
        await api.getUploadedCrashReports();
        
        expect(ipcRenderer.invoke).toHaveBeenCalledWith('get-uploaded-crash-reports');
      });

      it('should return array of reports', async () => {
        const mockReports = [
          { id: 'crash-123', date: new Date() },
          { id: 'crash-456', date: new Date() },
        ];
        (ipcRenderer.invoke as jest.Mock).mockResolvedValue(mockReports);
        
        const result = await api.getUploadedCrashReports();
        
        expect(result).toEqual(mockReports);
      });

      it('should handle empty array', async () => {
        (ipcRenderer.invoke as jest.Mock).mockResolvedValue([]);
        
        const result = await api.getUploadedCrashReports();
        
        expect(result).toEqual([]);
      });

      it('should handle errors', async () => {
        (ipcRenderer.invoke as jest.Mock).mockRejectedValue(new Error('IPC error'));
        
        await expect(api.getUploadedCrashReports()).rejects.toThrow('IPC error');
      });
    });

    describe('testCrashReporting', () => {
      it('should invoke correct IPC channel', async () => {
        (ipcRenderer.invoke as jest.Mock).mockResolvedValue(true);
        
        await api.testCrashReporting();
        
        expect(ipcRenderer.invoke).toHaveBeenCalledWith('test-crash-reporting');
      });

      it('should return true on success', async () => {
        (ipcRenderer.invoke as jest.Mock).mockResolvedValue(true);
        
        const result = await api.testCrashReporting();
        
        expect(result).toBe(true);
      });

      it('should return false on failure', async () => {
        (ipcRenderer.invoke as jest.Mock).mockResolvedValue(false);
        
        const result = await api.testCrashReporting();
        
        expect(result).toBe(false);
      });

      it('should handle errors', async () => {
        (ipcRenderer.invoke as jest.Mock).mockRejectedValue(new Error('IPC error'));
        
        await expect(api.testCrashReporting()).rejects.toThrow('IPC error');
      });
    });

    describe('Existing IPC methods', () => {
      it('should call getTimeEntries correctly', async () => {
        (ipcRenderer.invoke as jest.Mock).mockResolvedValue([]);
        
        await api.getTimeEntries();
        
        expect(ipcRenderer.invoke).toHaveBeenCalledWith('get-time-entries');
      });

      it('should call addTimeEntry with correct arguments', async () => {
        const entry = { task: 'Test', duration: 3600 };
        (ipcRenderer.invoke as jest.Mock).mockResolvedValue(1);
        
        await api.addTimeEntry(entry);
        
        expect(ipcRenderer.invoke).toHaveBeenCalledWith('add-time-entry', entry);
      });

      it('should call saveSettings with correct arguments', async () => {
        const settings = { theme: 'dark' };
        (ipcRenderer.invoke as jest.Mock).mockResolvedValue(true);
        
        await api.saveSettings(settings);
        
        expect(ipcRenderer.invoke).toHaveBeenCalledWith('save-settings', settings);
      });

      it('should call getRecentActivitySessions with limit', async () => {
        (ipcRenderer.invoke as jest.Mock).mockResolvedValue([]);
        
        await api.getRecentActivitySessions(10);
        
        expect(ipcRenderer.invoke).toHaveBeenCalledWith('get-recent-activity-sessions', 10);
      });

      it('should call getTopApplications with limit', async () => {
        (ipcRenderer.invoke as jest.Mock).mockResolvedValue([]);
        
        await api.getTopApplications(5);
        
        expect(ipcRenderer.invoke).toHaveBeenCalledWith('get-top-applications', 5);
      });

      it('should call getTopWebsites with limit', async () => {
        (ipcRenderer.invoke as jest.Mock).mockResolvedValue([]);
        
        await api.getTopWebsites(5);
        
        expect(ipcRenderer.invoke).toHaveBeenCalledWith('get-top-websites', 5);
      });
    });
  });

  describe('TypeScript interface compliance', () => {
    it('should match IElectronAPI interface', () => {
      require('../preload');
      
      const [, api] = (contextBridge.exposeInMainWorld as jest.Mock).mock.calls[0];
      
      // Check that all expected methods exist
      const expectedMethods = [
        'getTimeEntries',
        'addTimeEntry',
        'getAppUsage',
        'addAppUsage',
        'getSettings',
        'saveSettings',
        'startActivityTracking',
        'stopActivityTracking',
        'getActivityTrackingStatus',
        'getCurrentActivitySession',
        'getRecentActivitySessions',
        'getTopApplications',
        'getTopWebsites',
        'getLastCrashReport',
        'getUploadedCrashReports',
        'testCrashReporting',
      ];
      
      expectedMethods.forEach(method => {
        expect(api[method]).toBeDefined();
        expect(typeof api[method]).toBe('function');
      });
    });

    it('should return promises for all async methods', async () => {
      require('../preload');
      
      const [, api] = (contextBridge.exposeInMainWorld as jest.Mock).mock.calls[0];
      (ipcRenderer.invoke as jest.Mock).mockResolvedValue(null);
      
      const promises = [
        api.getLastCrashReport(),
        api.getUploadedCrashReports(),
        api.testCrashReporting(),
        api.getTimeEntries(),
        api.getSettings(),
      ];
      
      promises.forEach(promise => {
        expect(promise).toBeInstanceOf(Promise);
      });
      
      await Promise.all(promises);
    });
  });

  describe('Security considerations', () => {
    it('should use contextBridge for secure API exposure', () => {
      require('../preload');
      
      expect(contextBridge.exposeInMainWorld).toHaveBeenCalled();
    });

    it('should only expose whitelisted IPC channels', () => {
      require('../preload');
      
      const [, api] = (contextBridge.exposeInMainWorld as jest.Mock).mock.calls[0];
      
      // Verify that the API doesn't expose raw ipcRenderer
      expect(api.ipcRenderer).toBeUndefined();
      expect(api.require).toBeUndefined();
      expect(api.process).toBeUndefined();
    });
  });
});