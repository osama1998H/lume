export interface ActivitySession {
  id?: number;
  app_name: string;
  window_title?: string;
  category: 'application' | 'website';
  domain?: string;
  url?: string;
  start_time: string;
  end_time?: string;
  duration?: number;
  is_browser: boolean;
  created_at?: string;
}

export interface ActivityTrackingSettings {
  enabled: boolean;
  trackingInterval: number; // seconds
  idleThreshold: number; // seconds
  trackBrowsers: boolean;
  trackApplications: boolean;
  blacklistedApps: string[];
  blacklistedDomains: string[];
  dataRetentionDays: number;
}

export interface CurrentActivity {
  app_name: string;
  window_title: string;
  pid: number;
  is_browser: boolean;
  domain?: string;
  url?: string;
  timestamp: number;
}

export interface ActivitySummary {
  date: string;
  totalActiveTime: number;
  applications: Array<{
    name: string;
    duration: number;
    percentage: number;
  }>;
  websites: Array<{
    domain: string;
    duration: number;
    percentage: number;
  }>;
  topActivity: {
    name: string;
    duration: number;
    type: 'application' | 'website';
  };
}

export interface ActivityTracker {
  start(): void;
  stop(): void;
  getCurrentActivity(): Promise<CurrentActivity | null>;
  isTracking(): boolean;
}