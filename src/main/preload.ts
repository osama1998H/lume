import { contextBridge, ipcRenderer } from 'electron';

import * as Sentry from "@sentry/electron";

Sentry.init({
  dsn: "https://e54520cf320b22f34f68ff237ed902d1@o4510136801034240.ingest.de.sentry.io/4510136803590224",
});

export interface IElectronAPI {
  getTimeEntries: () => Promise<any[]>;
  addTimeEntry: (entry: any) => Promise<number>;
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
}

const electronAPI: IElectronAPI = {
  getTimeEntries: () => ipcRenderer.invoke('get-time-entries'),
  addTimeEntry: (entry) => ipcRenderer.invoke('add-time-entry', entry),
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
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);