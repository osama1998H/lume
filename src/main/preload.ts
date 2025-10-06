import { contextBridge, ipcRenderer } from 'electron';

// Note: Sentry is initialized in the main process only, not in preload
// Preload script should not initialize Sentry to avoid duplicate tracking

export interface IElectronAPI {
  getTimeEntries: () => Promise<any[]>;
  addTimeEntry: (entry: any) => Promise<number>;
  updateTimeEntry: (id: number, updates: any) => Promise<boolean>;
  getActiveTimeEntry: () => Promise<any | null>;
  getAppUsage: () => Promise<any[]>;
  addAppUsage: (usage: any) => Promise<number>;
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<boolean>;
  startActivityTracking: () => Promise<boolean>;
  stopActivityTracking: () => Promise<boolean>;
  getActivityTrackingStatus: () => Promise<boolean>;
  getCurrentActivitySession: () => Promise<any>;
  getRecentActivitySessions: (limit?: number) => Promise<any[]>;
  getTopApplications: (limit?: number) => Promise<any[]>;
  getTopWebsites: (limit?: number) => Promise<any[]>;
  getLastCrashReport: () => Promise<any>;
  getUploadedCrashReports: () => Promise<any[]>;
  testCrashReporting: () => Promise<boolean>;
}

const electronAPI: IElectronAPI = {
  getTimeEntries: () => ipcRenderer.invoke('get-time-entries'),
  addTimeEntry: (entry) => ipcRenderer.invoke('add-time-entry', entry),
  updateTimeEntry: (id, updates) => ipcRenderer.invoke('update-time-entry', id, updates),
  getActiveTimeEntry: () => ipcRenderer.invoke('get-active-time-entry'),
  getAppUsage: () => ipcRenderer.invoke('get-app-usage'),
  addAppUsage: (usage) => ipcRenderer.invoke('add-app-usage', usage),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  startActivityTracking: () => ipcRenderer.invoke('start-activity-tracking'),
  stopActivityTracking: () => ipcRenderer.invoke('stop-activity-tracking'),
  getActivityTrackingStatus: () => ipcRenderer.invoke('get-activity-tracking-status'),
  getCurrentActivitySession: () => ipcRenderer.invoke('get-current-activity-session'),
  getRecentActivitySessions: (limit) => ipcRenderer.invoke('get-recent-activity-sessions', limit),
  getTopApplications: (limit) => ipcRenderer.invoke('get-top-applications', limit),
  getTopWebsites: (limit) => ipcRenderer.invoke('get-top-websites', limit),
  getLastCrashReport: () => ipcRenderer.invoke('get-last-crash-report'),
  getUploadedCrashReports: () => ipcRenderer.invoke('get-uploaded-crash-reports'),
  testCrashReporting: () => ipcRenderer.invoke('test-crash-reporting'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);