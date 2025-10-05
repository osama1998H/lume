import { ActivityMonitor } from './ActivityMonitor';
import { DatabaseManager } from '../database/DatabaseManager';
import { ActivitySession, CurrentActivity, ActivityTrackingSettings } from '../types/activity';

export class ActivityTrackingService {
  private monitor: ActivityMonitor;
  private dbManager: DatabaseManager;
  private currentSession: ActivitySession | null = null;
  private settings: ActivityTrackingSettings;
  private sessionStartTime: number = 0;
  private lastActivity: CurrentActivity | null = null;
  private idleTimer: NodeJS.Timeout | null = null;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
    this.monitor = new ActivityMonitor();
    this.settings = this.getDefaultSettings();
  }

  private getDefaultSettings(): ActivityTrackingSettings {
    return {
      enabled: false,
      trackingInterval: 30,
      idleThreshold: 300, // 5 minutes
      trackBrowsers: true,
      trackApplications: true,
      blacklistedApps: [],
      blacklistedDomains: [],
      dataRetentionDays: 90
    };
  }

  updateSettings(newSettings: Partial<ActivityTrackingSettings>): void {
    this.settings = { ...this.settings, ...newSettings };

    if (this.settings.enabled && !this.monitor.isTracking()) {
      this.start();
    } else if (!this.settings.enabled && this.monitor.isTracking()) {
      this.stop();
    }

    if (this.monitor.isTracking()) {
      this.monitor.setInterval(this.settings.trackingInterval * 1000);
    }
  }

  getSettings(): ActivityTrackingSettings {
    return { ...this.settings };
  }

  start(): void {
    if (!this.settings.enabled) {
      console.log('⚠️  Activity tracking is disabled in settings - cannot start');
      return;
    }

    console.log(`🚀 Starting activity tracking service with interval: ${this.settings.trackingInterval}s`);
    this.monitor.setInterval(this.settings.trackingInterval * 1000);
    this.monitor.start();
    this.startActivityPolling();
    console.log('✅ Activity tracking service started successfully');
  }

  stop(): void {
    console.log('🛑 Stopping activity tracking service');
    this.monitor.stop();
    this.finishCurrentSession();
    this.clearIdleTimer();
    console.log('✅ Activity tracking service stopped successfully');
  }

  private startActivityPolling(): void {
    const poll = async () => {
      if (!this.monitor.isTracking()) return;

      try {
        const currentActivity = await this.monitor.getCurrentActivity();

        if (currentActivity) {
          await this.handleActivityChange(currentActivity);
        }

        this.resetIdleTimer();
      } catch (error) {
        console.error('Error polling activity:', error);
      }

      // Schedule next poll
      setTimeout(poll, this.settings.trackingInterval * 1000);
    };

    poll();
  }

  private async handleActivityChange(activity: CurrentActivity): Promise<void> {
    // Check if app is blacklisted
    if (this.isAppBlacklisted(activity.app_name)) {
      console.log(`🚫 App blacklisted: ${activity.app_name}`);
      this.finishCurrentSession();
      return;
    }

    // Check if domain is blacklisted (for browsers)
    if (activity.is_browser && activity.domain && this.isDomainBlacklisted(activity.domain)) {
      console.log(`🚫 Domain blacklisted: ${activity.domain}`);
      this.finishCurrentSession();
      return;
    }

    // Check tracking preferences
    if (activity.is_browser && !this.settings.trackBrowsers) {
      console.log('🚫 Browser tracking disabled');
      this.finishCurrentSession();
      return;
    }

    if (!activity.is_browser && !this.settings.trackApplications) {
      console.log('🚫 Application tracking disabled');
      this.finishCurrentSession();
      return;
    }

    const now = Date.now();

    // Check if this is a new activity or continuation of current session
    if (this.shouldStartNewSession(activity)) {
      // Finish current session if exists
      this.finishCurrentSession();

      // Start new session
      this.currentSession = {
        app_name: activity.app_name,
        window_title: activity.window_title,
        category: activity.is_browser ? 'website' : 'application',
        domain: activity.domain,
        url: activity.url,
        start_time: new Date(now).toISOString(),
        is_browser: activity.is_browser
      };

      this.sessionStartTime = now;
      this.lastActivity = activity;

      console.log(`📝 Started new session: ${activity.app_name}${activity.domain ? ` (${activity.domain})` : ''}`);
    } else {
      // Update last activity timestamp
      this.lastActivity = activity;
    }
  }

  private shouldStartNewSession(activity: CurrentActivity): boolean {
    if (!this.currentSession || !this.lastActivity) {
      return true;
    }

    // Different app
    if (this.currentSession.app_name !== activity.app_name) {
      return true;
    }

    // Different domain for browsers
    if (activity.is_browser && this.currentSession.domain !== activity.domain) {
      return true;
    }

    // Significant window title change for non-browsers
    if (!activity.is_browser &&
        this.currentSession.window_title !== activity.window_title &&
        this.isSignificantTitleChange(this.currentSession.window_title || '', activity.window_title)) {
      return true;
    }

    return false;
  }

  private isSignificantTitleChange(oldTitle: string, newTitle: string): boolean {
    // Consider it significant if the titles are completely different
    // This helps track different documents/projects within the same app
    if (!oldTitle || !newTitle) return false;

    // Simple similarity check - if less than 30% similar, consider it significant
    const similarity = this.calculateStringSimilarity(oldTitle, newTitle);
    return similarity < 0.3;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private finishCurrentSession(): void {
    if (!this.currentSession || !this.sessionStartTime) {
      return;
    }

    const now = Date.now();
    const duration = Math.floor((now - this.sessionStartTime) / 1000); // in seconds

    // Only save sessions longer than 10 seconds
    if (duration >= 10) {
      this.currentSession.end_time = new Date(now).toISOString();
      this.currentSession.duration = duration;

      try {
        const sessionId = this.dbManager.addActivitySession(this.currentSession);
        console.log(`💾 Saved session ${sessionId}: ${this.currentSession.app_name} (${duration}s) to database`);
      } catch (error) {
        console.error('❌ Failed to save activity session:', error);
      }
    } else {
      console.log(`⏭️  Skipping session (too short): ${this.currentSession.app_name} (${duration}s < 10s)`);
    }

    this.currentSession = null;
    this.sessionStartTime = 0;
  }

  private isAppBlacklisted(appName: string): boolean {
    return this.settings.blacklistedApps.some(blacklisted =>
      appName.toLowerCase().includes(blacklisted.toLowerCase())
    );
  }

  private isDomainBlacklisted(domain: string): boolean {
    return this.settings.blacklistedDomains.some(blacklisted =>
      domain.toLowerCase().includes(blacklisted.toLowerCase())
    );
  }

  private resetIdleTimer(): void {
    this.clearIdleTimer();

    this.idleTimer = setTimeout(() => {
      console.log('😴 User appears idle, pausing current session');
      this.finishCurrentSession();
    }, this.settings.idleThreshold * 1000);
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  // Public methods for getting tracking data
  getCurrentSession(): ActivitySession | null {
    return this.currentSession;
  }

  async getRecentSessions(limit = 50): Promise<ActivitySession[]> {
    return this.dbManager.getActivitySessions(limit);
  }

  async getTopApplications(limit = 10): Promise<Array<{name: string, totalDuration: number}>> {
    return this.dbManager.getTopApplications(limit);
  }

  async getTopWebsites(limit = 10): Promise<Array<{domain: string, totalDuration: number}>> {
    return this.dbManager.getTopWebsites(limit);
  }

  isTracking(): boolean {
    return this.monitor.isTracking();
  }
}