import { ActivityTrackingService } from '../ActivityTrackingService';
import { ActivityMonitor } from '../ActivityMonitor';
import { DatabaseManager } from '../../../database/DatabaseManager';
import { CurrentActivity, ActivitySession } from '../../../types/activity';

// Mock ActivityMonitor
jest.mock('../ActivityMonitor');

// Mock DatabaseManager
jest.mock('../../../database/DatabaseManager');

describe('ActivityTrackingService', () => {
  let service: ActivityTrackingService;
  let mockDbManager: jest.Mocked<DatabaseManager>;
  let mockMonitor: jest.Mocked<ActivityMonitor>;
  let consoleLog: jest.SpyInstance;
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    consoleLog = jest.spyOn(console, 'log').mockImplementation();
    consoleError = jest.spyOn(console, 'error').mockImplementation();

    // Create mock database manager
    mockDbManager = {
      addActivitySession: jest.fn().mockReturnValue(123),
      getActivitySessions: jest.fn().mockResolvedValue([]),
      getTopApplications: jest.fn().mockResolvedValue([]),
      getTopWebsites: jest.fn().mockResolvedValue([]),
    } as any;

    // Create mock monitor
    mockMonitor = {
      start: jest.fn(),
      stop: jest.fn(),
      isTracking: jest.fn().mockReturnValue(false),
      getCurrentActivity: jest.fn().mockResolvedValue(null),
      setInterval: jest.fn(),
    } as any;

    (ActivityMonitor as jest.Mock).mockImplementation(() => mockMonitor);

    service = new ActivityTrackingService(mockDbManager);
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleLog.mockRestore();
    consoleError.mockRestore();
  });

  describe('Constructor', () => {
    it('should create ActivityMonitor instance', () => {
      expect(ActivityMonitor).toHaveBeenCalled();
    });

    it('should initialize with default settings', () => {
      const settings = service.getSettings();
      expect(settings).toEqual({
        enabled: false,
        trackingInterval: 30,
        idleThreshold: 300,
        trackBrowsers: true,
        trackApplications: true,
        blacklistedApps: [],
        blacklistedDomains: [],
        dataRetentionDays: 90,
      });
    });
  });

  describe('updateSettings', () => {
    it('should update settings with new values', () => {
      service.updateSettings({ trackingInterval: 60 });
      
      const settings = service.getSettings();
      expect(settings.trackingInterval).toBe(60);
    });

    it('should start tracking if enabled is set to true', () => {
      service.updateSettings({ enabled: true });
      
      expect(mockMonitor.start).toHaveBeenCalled();
    });

    it('should stop tracking if enabled is set to false when currently tracking', () => {
      mockMonitor.isTracking.mockReturnValue(true);
      
      service.updateSettings({ enabled: false });
      
      expect(mockMonitor.stop).toHaveBeenCalled();
    });

    it('should update monitor interval if tracking is active', () => {
      mockMonitor.isTracking.mockReturnValue(true);
      
      service.updateSettings({ trackingInterval: 45 });
      
      expect(mockMonitor.setInterval).toHaveBeenCalledWith(45000);
    });

    it('should merge new settings with existing ones', () => {
      service.updateSettings({ trackingInterval: 45, idleThreshold: 600 });
      
      const settings = service.getSettings();
      expect(settings.trackingInterval).toBe(45);
      expect(settings.idleThreshold).toBe(600);
      expect(settings.trackBrowsers).toBe(true); // unchanged
    });
  });

  describe('start', () => {
    it('should not start if tracking is disabled', () => {
      service.start();
      
      expect(consoleLog).toHaveBeenCalledWith('⚠️  Activity tracking is disabled in settings - cannot start');
      expect(mockMonitor.start).not.toHaveBeenCalled();
    });

    it('should start monitor when enabled', () => {
      service.updateSettings({ enabled: true });
      mockMonitor.start.mockClear();
      consoleLog.mockClear();
      
      service.start();
      
      expect(consoleLog).toHaveBeenCalledWith('🚀 Starting activity tracking service with interval: 30s');
      expect(mockMonitor.setInterval).toHaveBeenCalledWith(30000);
      expect(mockMonitor.start).toHaveBeenCalled();
      expect(consoleLog).toHaveBeenCalledWith('✅ Activity tracking service started successfully');
    });

    it('should set correct interval on monitor', () => {
      service.updateSettings({ enabled: true, trackingInterval: 45 });
      mockMonitor.setInterval.mockClear();
      
      service.start();
      
      expect(mockMonitor.setInterval).toHaveBeenCalledWith(45000);
    });
  });

  describe('stop', () => {
    it('should stop monitor', () => {
      service.updateSettings({ enabled: true });
      service.start();
      
      consoleLog.mockClear();
      service.stop();
      
      expect(consoleLog).toHaveBeenCalledWith('🛑 Stopping activity tracking service');
      expect(mockMonitor.stop).toHaveBeenCalled();
      expect(consoleLog).toHaveBeenCalledWith('✅ Activity tracking service stopped successfully');
    });

    it('should finish current session when stopping', () => {
      service.updateSettings({ enabled: true });
      service.start();
      
      // Simulate active session
      (service as any).currentSession = {
        app_name: 'TestApp',
        category: 'application',
        start_time: new Date().toISOString(),
        is_browser: false,
      };
      (service as any).sessionStartTime = Date.now() - 60000; // 60 seconds ago
      
      service.stop();
      
      expect(mockDbManager.addActivitySession).toHaveBeenCalled();
    });
  });

  describe('Activity Change Handling', () => {
    const mockActivity: CurrentActivity = {
      app_name: 'TestApp',
      window_title: 'Test Window',
      pid: 1234,
      is_browser: false,
      timestamp: Date.now(),
    };

    beforeEach(() => {
      service.updateSettings({ enabled: true });
    });

    it('should reject blacklisted applications', async () => {
      service.updateSettings({ blacklistedApps: ['TestApp'] });
      
      await (service as any).handleActivityChange(mockActivity);
      
      expect(consoleLog).toHaveBeenCalledWith('🚫 App blacklisted: TestApp');
      expect((service as any).currentSession).toBeNull();
    });

    it('should reject blacklisted domains for browsers', async () => {
      const browserActivity: CurrentActivity = {
        ...mockActivity,
        is_browser: true,
        domain: 'blocked.com',
      };
      
      service.updateSettings({ blacklistedDomains: ['blocked.com'] });
      
      await (service as any).handleActivityChange(browserActivity);
      
      expect(consoleLog).toHaveBeenCalledWith('🚫 Domain blacklisted: blocked.com');
      expect((service as any).currentSession).toBeNull();
    });

    it('should reject browsers when trackBrowsers is false', async () => {
      const browserActivity: CurrentActivity = {
        ...mockActivity,
        is_browser: true,
      };
      
      service.updateSettings({ trackBrowsers: false });
      
      await (service as any).handleActivityChange(browserActivity);
      
      expect(consoleLog).toHaveBeenCalledWith('🚫 Browser tracking disabled');
      expect((service as any).currentSession).toBeNull();
    });

    it('should reject applications when trackApplications is false', async () => {
      service.updateSettings({ trackApplications: false });
      
      await (service as any).handleActivityChange(mockActivity);
      
      expect(consoleLog).toHaveBeenCalledWith('🚫 Application tracking disabled');
      expect((service as any).currentSession).toBeNull();
    });

    it('should start new session for new activity', async () => {
      await (service as any).handleActivityChange(mockActivity);
      
      expect(consoleLog).toHaveBeenCalledWith('📝 Started new session: TestApp');
      expect((service as any).currentSession).not.toBeNull();
      expect((service as any).currentSession.app_name).toBe('TestApp');
      expect((service as any).currentSession.category).toBe('application');
    });

    it('should start new session for browser with domain', async () => {
      const browserActivity: CurrentActivity = {
        ...mockActivity,
        is_browser: true,
        domain: 'example.com',
      };
      
      await (service as any).handleActivityChange(browserActivity);
      
      expect(consoleLog).toHaveBeenCalledWith('📝 Started new session: TestApp (example.com)');
      expect((service as any).currentSession.category).toBe('website');
      expect((service as any).currentSession.domain).toBe('example.com');
    });

    it('should finish previous session when starting new one', async () => {
      // Start first session
      await (service as any).handleActivityChange(mockActivity);
      (service as any).sessionStartTime = Date.now() - 60000; // 60 seconds ago
      
      mockDbManager.addActivitySession.mockClear();
      
      // Start second session
      const newActivity: CurrentActivity = {
        ...mockActivity,
        app_name: 'DifferentApp',
      };
      await (service as any).handleActivityChange(newActivity);
      
      expect(mockDbManager.addActivitySession).toHaveBeenCalled();
    });

    it('should not start new session for same app', async () => {
      await (service as any).handleActivityChange(mockActivity);
      const sessionId = (service as any).sessionStartTime;
      
      await (service as any).handleActivityChange(mockActivity);
      
      expect((service as any).sessionStartTime).toBe(sessionId);
    });

    it('should start new session when browser domain changes', async () => {
      const browserActivity1: CurrentActivity = {
        ...mockActivity,
        is_browser: true,
        domain: 'site1.com',
      };
      
      await (service as any).handleActivityChange(browserActivity1);
      (service as any).sessionStartTime = Date.now() - 15000;
      
      mockDbManager.addActivitySession.mockClear();
      
      const browserActivity2: CurrentActivity = {
        ...mockActivity,
        is_browser: true,
        domain: 'site2.com',
      };
      
      await (service as any).handleActivityChange(browserActivity2);
      
      expect(mockDbManager.addActivitySession).toHaveBeenCalled();
      expect((service as any).currentSession.domain).toBe('site2.com');
    });
  });

  describe('Session Management', () => {
    it('should save session with duration >= 10 seconds', async () => {
      const session: ActivitySession = {
        app_name: 'TestApp',
        category: 'application',
        start_time: new Date().toISOString(),
        is_browser: false,
      };
      
      (service as any).currentSession = session;
      (service as any).sessionStartTime = Date.now() - 15000; // 15 seconds ago
      
      (service as any).finishCurrentSession();
      
      expect(mockDbManager.addActivitySession).toHaveBeenCalled();
      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('💾 Saved session')
      );
    });

    it('should not save session shorter than 10 seconds', async () => {
      const session: ActivitySession = {
        app_name: 'TestApp',
        category: 'application',
        start_time: new Date().toISOString(),
        is_browser: false,
      };
      
      (service as any).currentSession = session;
      (service as any).sessionStartTime = Date.now() - 5000; // 5 seconds
      
      (service as any).finishCurrentSession();
      
      expect(mockDbManager.addActivitySession).not.toHaveBeenCalled();
      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('⏭️  Skipping session (too short)')
      );
    });

    it('should set end_time and duration when finishing session', async () => {
      const startTime = Date.now() - 30000; // 30 seconds ago
      
      (service as any).currentSession = {
        app_name: 'TestApp',
        category: 'application',
        start_time: new Date(startTime).toISOString(),
        is_browser: false,
      };
      (service as any).sessionStartTime = startTime;

      (service as any).finishCurrentSession();

      const savedSession = mockDbManager.addActivitySession.mock.calls[0]![0];
      expect(savedSession.end_time).toBeDefined();
      expect(savedSession.duration).toBeGreaterThanOrEqual(29);
      expect(savedSession.duration).toBeLessThanOrEqual(31);
    });

    it('should handle database errors gracefully', async () => {
      mockDbManager.addActivitySession.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      (service as any).currentSession = {
        app_name: 'TestApp',
        category: 'application',
        start_time: new Date().toISOString(),
        is_browser: false,
      };
      (service as any).sessionStartTime = Date.now() - 15000;
      
      (service as any).finishCurrentSession();
      
      expect(consoleError).toHaveBeenCalledWith(
        '❌ Failed to save activity session:',
        expect.any(Error)
      );
    });

    it('should clear current session after finishing', async () => {
      (service as any).currentSession = {
        app_name: 'TestApp',
        category: 'application',
        start_time: new Date().toISOString(),
        is_browser: false,
      };
      (service as any).sessionStartTime = Date.now() - 15000;
      
      (service as any).finishCurrentSession();
      
      expect((service as any).currentSession).toBeNull();
      expect((service as any).sessionStartTime).toBe(0);
    });

    it('should not throw error when no session to finish', () => {
      expect(() => {
        (service as any).finishCurrentSession();
      }).not.toThrow();
    });
  });

  describe('Idle Detection', () => {
    beforeEach(() => {
      service.updateSettings({ enabled: true, idleThreshold: 10 });
    });

    it('should finish session after idle timeout', async () => {
      const mockActivity: CurrentActivity = {
        app_name: 'TestApp',
        window_title: 'Test',
        pid: 123,
        is_browser: false,
        timestamp: Date.now(),
      };
      
      await (service as any).handleActivityChange(mockActivity);
      (service as any).sessionStartTime = Date.now() - 15000;
      
      mockDbManager.addActivitySession.mockClear();
      consoleLog.mockClear();
      
      // Trigger idle timeout
      (service as any).resetIdleTimer();
      jest.advanceTimersByTime(10000);
      
      expect(consoleLog).toHaveBeenCalledWith('😴 User appears idle, pausing current session');
      expect(mockDbManager.addActivitySession).toHaveBeenCalled();
    });

    it('should clear previous idle timer when resetting', () => {
      (service as any).resetIdleTimer();
      (service as any).resetIdleTimer();

      expect((service as any).idleTimer).not.toBeNull();
    });

    it('should clear idle timer when stopping', () => {
      service.updateSettings({ enabled: true });
      service.start();
      (service as any).resetIdleTimer();
      
      service.stop();
      
      expect((service as any).idleTimer).toBeNull();
    });
  });

  describe('Blacklist Detection', () => {
    it('should detect partial app name match in blacklist', () => {
      service.updateSettings({ blacklistedApps: ['slack', 'discord'] });
      
      expect((service as any).isAppBlacklisted('Slack')).toBe(true);
      expect((service as any).isAppBlacklisted('Discord App')).toBe(true);
      expect((service as any).isAppBlacklisted('VSCode')).toBe(false);
    });

    it('should be case insensitive for app blacklist', () => {
      service.updateSettings({ blacklistedApps: ['Slack'] });
      
      expect((service as any).isAppBlacklisted('slack')).toBe(true);
      expect((service as any).isAppBlacklisted('SLACK')).toBe(true);
    });

    it('should detect partial domain match in blacklist', () => {
      service.updateSettings({ blacklistedDomains: ['facebook.com', 'twitter.com'] });
      
      expect((service as any).isDomainBlacklisted('www.facebook.com')).toBe(true);
      expect((service as any).isDomainBlacklisted('mobile.twitter.com')).toBe(true);
      expect((service as any).isDomainBlacklisted('github.com')).toBe(false);
    });

    it('should be case insensitive for domain blacklist', () => {
      service.updateSettings({ blacklistedDomains: ['Facebook.com'] });
      
      expect((service as any).isDomainBlacklisted('FACEBOOK.COM')).toBe(true);
      expect((service as any).isDomainBlacklisted('facebook.com')).toBe(true);
    });
  });

  describe('String Similarity', () => {
    it('should detect significant title changes', () => {
      const oldTitle = 'Document1.txt';
      const newTitle = 'CompletelyDifferentFile.docx';
      
      const result = (service as any).isSignificantTitleChange(oldTitle, newTitle);
      expect(result).toBe(true);
    });

    it('should not detect minor title changes as significant', () => {
      const oldTitle = 'Document v1.txt';
      const newTitle = 'Document v2.txt';
      
      const result = (service as any).isSignificantTitleChange(oldTitle, newTitle);
      expect(result).toBe(false);
    });

    it('should handle empty strings', () => {
      expect((service as any).isSignificantTitleChange('', 'test')).toBe(false);
      expect((service as any).isSignificantTitleChange('test', '')).toBe(false);
    });

    it('should calculate string similarity correctly', () => {
      const similarity = (service as any).calculateStringSimilarity('hello', 'hello');
      expect(similarity).toBe(1.0);
    });

    it('should handle completely different strings', () => {
      const similarity = (service as any).calculateStringSimilarity('abc', 'xyz');
      expect(similarity).toBeLessThan(0.3);
    });

    it('should calculate levenshtein distance', () => {
      const distance = (service as any).levenshteinDistance('kitten', 'sitting');
      expect(distance).toBe(3);
    });
  });

  describe('Public API Methods', () => {
    it('getCurrentSession should return current session', () => {
      const mockSession: ActivitySession = {
        app_name: 'TestApp',
        category: 'application',
        start_time: new Date().toISOString(),
        is_browser: false,
      };
      
      (service as any).currentSession = mockSession;
      
      expect(service.getCurrentSession()).toBe(mockSession);
    });

    it('getCurrentSession should return null when no session', () => {
      expect(service.getCurrentSession()).toBeNull();
    });

    it('getRecentSessions should call database manager', async () => {
      await service.getRecentSessions(25);
      
      expect(mockDbManager.getActivitySessions).toHaveBeenCalledWith(25);
    });

    it('getTopApplications should call database manager', async () => {
      await service.getTopApplications(15);
      
      expect(mockDbManager.getTopApplications).toHaveBeenCalledWith(15);
    });

    it('getTopWebsites should call database manager', async () => {
      await service.getTopWebsites(20);
      
      expect(mockDbManager.getTopWebsites).toHaveBeenCalledWith(20);
    });

    it('isTracking should return monitor tracking status', () => {
      mockMonitor.isTracking.mockReturnValue(true);
      
      expect(service.isTracking()).toBe(true);
      expect(mockMonitor.isTracking).toHaveBeenCalled();
    });
  });
});