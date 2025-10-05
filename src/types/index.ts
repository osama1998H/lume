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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}