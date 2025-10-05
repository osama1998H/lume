export interface TimeEntry {
  id?: number;
  task: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  category?: string;
  createdAt?: string;
}

export interface AppUsage {
  id?: number;
  appName: string;
  windowTitle: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  createdAt?: string;
}

export interface ElectronAPI {
  getTimeEntries: () => Promise<TimeEntry[]>;
  addTimeEntry: (entry: TimeEntry) => Promise<number>;
  getAppUsage: () => Promise<AppUsage[]>;
  addAppUsage: (usage: AppUsage) => Promise<number>;
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<boolean>;
  getActivityTrackingStatus: () => Promise<boolean>;
  startActivityTracking: () => Promise<boolean>;
  stopActivityTracking: () => Promise<boolean>;
  getRecentActivitySessions: (limit?: number) => Promise<any[]>;
  getTopApplications: (limit?: number) => Promise<any[]>;
  getTopWebsites: (limit?: number) => Promise<any[]>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}