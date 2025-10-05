declare global {
  interface Window {
    electronAPI: {
      getTimeEntries: () => Promise<any[]>;
      addTimeEntry: (entry: any) => Promise<number>;
      getAppUsage: () => Promise<any[]>;
      addAppUsage: (usage: any) => Promise<number>;
      getSettings: () => Promise<any>;
      saveSettings: (settings: any) => Promise<boolean>;
    };
  }
}

export {};