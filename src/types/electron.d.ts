declare global {
  interface Window {
    electronAPI: {
      getTimeEntries: () => Promise<any[]>;
      addTimeEntry: (entry: any) => Promise<number>;
      getAppUsage: () => Promise<any[]>;
      addAppUsage: (usage: any) => Promise<number>;
      getSettings: () => Promise<any>;
      saveSettings: (settings: any) => Promise<boolean>;
      getActivityTrackingStatus: () => Promise<boolean>;
      startActivityTracking: () => Promise<boolean>;
      stopActivityTracking: () => Promise<boolean>;
      getRecentActivitySessions: (limit?: number) => Promise<any[]>;
      getTopApplications: (limit?: number) => Promise<any[]>;
      getTopWebsites: (limit?: number) => Promise<any[]>;
    };
  }
}

export {};