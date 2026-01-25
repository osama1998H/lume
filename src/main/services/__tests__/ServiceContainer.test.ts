import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Settings } from '@/types';

// Mock all service dependencies
mock.module('../../../database/DatabaseManager', () => ({
  DatabaseManager: mock(() => ({ initialize: mock(() => {}) })),
}));
mock.module('../../../services/activity/ActivityTrackingService', () => ({
  ActivityTrackingService: mock(() => ({
    updateSettings: mock(() => {}),
    isTracking: mock(() => false),
    stop: mock(() => Promise.resolve()),
  })),
}));
mock.module('../../../services/pomodoro/PomodoroService', () => ({
  PomodoroService: mock(() => ({ destroy: mock(() => {}) })),
}));
mock.module('../../../services/notifications/NotificationService', () => ({
  NotificationService: mock(() => ({ updateSettings: mock(() => {}) })),
}));
mock.module('../../../services/goals/GoalsService', () => ({
  GoalsService: mock(() => ({ setNotificationService: mock(() => {}) })),
}));
mock.module('../../../services/categories/CategoriesService', () => ({
  CategoriesService: mock(() => ({
    initializeDefaultCategories: mock(() => Promise.resolve()),
  })),
}));
mock.module('../../../services/activity/ActivityValidationService', () => ({
  ActivityValidationService: mock(() => ({})),
}));
mock.module('../../../services/activity/ActivityMergeService', () => ({
  ActivityMergeService: mock(() => ({})),
}));

import { ServiceContainer } from '../ServiceContainer';
import { DatabaseManager } from '@/database/DatabaseManager';
import { ActivityTrackingService } from '@/services/activity/ActivityTrackingService';
import { PomodoroService } from '@/services/pomodoro/PomodoroService';
import { NotificationService } from '@/services/notifications/NotificationService';
import { GoalsService } from '@/services/goals/GoalsService';
import { CategoriesService } from '@/services/categories/CategoriesService';
import { ActivityValidationService } from '@/services/activity/ActivityValidationService';
import { ActivityMergeService } from '@/services/activity/ActivityMergeService';

describe('ServiceContainer', () => {
  let container: ServiceContainer;
  let consoleLog: ReturnType<typeof spyOn>;
  let consoleError: ReturnType<typeof spyOn>;
  let consoleWarn: ReturnType<typeof spyOn>;

  const mockSettings: Settings = {
    pomodoro: {
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      longBreakInterval: 4,
      autoStartBreaks: false,
      autoStartFocus: false,
      soundEnabled: true,
      notificationsEnabled: true,
      dailyGoal: 8,
    },
    activityTracking: {
      enabled: false,
      trackingInterval: 30,
      idleThreshold: 300,
      trackBrowsers: true,
      trackApplications: true,
      blacklistedApps: [],
      blacklistedDomains: [],
      dataRetentionDays: 90,
    },
    minimizeToTray: false,
    autoStart: false,
  };

  beforeEach(() => {
    container = new ServiceContainer();

    consoleLog = spyOn(console, 'log').mockImplementation(() => {});
    consoleError = spyOn(console, 'error').mockImplementation(() => {});
    consoleWarn = spyOn(console, 'warn').mockImplementation(() => {});

    // Mock DatabaseManager
    (DatabaseManager as any) = mock(() => ({
      initialize: mock(() => {}),
    }));

    // Mock NotificationService
    (NotificationService as any) = mock(() => ({
      updateSettings: mock(() => {}),
    }));

    // Mock GoalsService
    (GoalsService as any) = mock(() => ({
      setNotificationService: mock(() => {}),
    }));

    // Mock CategoriesService with async method
    (CategoriesService as any) = mock(() => ({
      initializeDefaultCategories: mock(() => Promise.resolve()),
    }));

    // Mock ActivityValidationService
    (ActivityValidationService as any) = mock(() => ({}));

    // Mock ActivityMergeService
    (ActivityMergeService as any) = mock(() => ({}));

    // Mock ActivityTrackingService
    (ActivityTrackingService as any) = mock(() => ({
      updateSettings: mock(() => {}),
      isTracking: mock(() => false),
      stop: mock(() => Promise.resolve()),
    }));

    // Mock PomodoroService
    (PomodoroService as any) = mock(() => ({
      destroy: mock(() => {}),
    }));
  });

  afterEach(() => {
    consoleLog.mockRestore();
    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });

  describe('Constructor and Initialization', () => {
    it('should create a service container instance', () => {
      expect(container).toBeDefined();
      expect(container.isInitialized()).toBe(false);
    });

    it('should initialize all services in correct order', async () => {
      await container.initialize('/test/path', mockSettings);

      expect(container.isInitialized()).toBe(true);
      expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('Initializing ServiceContainer'));
      expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('ServiceContainer initialized successfully'));
    });

    it('should initialize database manager first', async () => {
      await container.initialize('/test/path', mockSettings);

      const dbManager = container.getDatabaseManager();
      expect(dbManager).toBeDefined();
      expect(DatabaseManager).toHaveBeenCalled();
    });

    it('should initialize notification service', async () => {
      await container.initialize('/test/path', mockSettings);

      const notificationService = container.getNotificationService();
      expect(notificationService).toBeDefined();
      expect(NotificationService).toHaveBeenCalledWith(true, true);
    });

    it('should initialize goals service with dependencies', async () => {
      await container.initialize('/test/path', mockSettings);

      const goalsService = container.getGoalsService();
      expect(goalsService).toBeDefined();
      expect(GoalsService).toHaveBeenCalled();
    });

    it('should initialize categories service', async () => {
      await container.initialize('/test/path', mockSettings);

      const categoriesService = container.getCategoriesService();
      expect(categoriesService).toBeDefined();
      expect(CategoriesService).toHaveBeenCalled();
    });

    it('should initialize activity validation service', async () => {
      await container.initialize('/test/path', mockSettings);

      const validationService = container.getActivityValidationService();
      expect(validationService).toBeDefined();
      expect(ActivityValidationService).toHaveBeenCalled();
    });

    it('should initialize activity merge service with dependencies', async () => {
      await container.initialize('/test/path', mockSettings);

      const mergeService = container.getActivityMergeService();
      expect(mergeService).toBeDefined();
      expect(ActivityMergeService).toHaveBeenCalled();
    });

    it('should initialize activity tracking service', async () => {
      await container.initialize('/test/path', mockSettings);

      const trackingService = container.getActivityTrackingService();
      expect(trackingService).toBeDefined();
      expect(ActivityTrackingService).toHaveBeenCalled();
    });

    it('should initialize pomodoro service with settings', async () => {
      await container.initialize('/test/path', mockSettings);

      const pomodoroService = container.getPomodoroService();
      expect(pomodoroService).toBeDefined();
      expect(PomodoroService).toHaveBeenCalled();
    });

    it('should be idempotent (calling initialize twice should warn)', async () => {
      await container.initialize('/test/path', mockSettings);
      await container.initialize('/test/path', mockSettings);

      expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('already initialized'));
    });
  });

  describe('Service Retrieval', () => {
    it('should return null for services before initialization', () => {
      expect(container.getDatabaseManager()).toBeNull();
      expect(container.getNotificationService()).toBeNull();
      expect(container.getGoalsService()).toBeNull();
      expect(container.getCategoriesService()).toBeNull();
      expect(container.getActivityValidationService()).toBeNull();
      expect(container.getActivityMergeService()).toBeNull();
      expect(container.getActivityTrackingService()).toBeNull();
      expect(container.getPomodoroService()).toBeNull();
    });

    it('should return service instances after initialization', async () => {
      await container.initialize('/test/path', mockSettings);

      expect(container.getDatabaseManager()).not.toBeNull();
      expect(container.getNotificationService()).not.toBeNull();
      expect(container.getGoalsService()).not.toBeNull();
      expect(container.getCategoriesService()).not.toBeNull();
      expect(container.getActivityValidationService()).not.toBeNull();
      expect(container.getActivityMergeService()).not.toBeNull();
      expect(container.getActivityTrackingService()).not.toBeNull();
      expect(container.getPomodoroService()).not.toBeNull();
    });

    it('should return same instance on multiple calls (singleton)', async () => {
      await container.initialize('/test/path', mockSettings);

      const dbManager1 = container.getDatabaseManager();
      const dbManager2 = container.getDatabaseManager();
      expect(dbManager1).toBe(dbManager2);

      const notificationService1 = container.getNotificationService();
      const notificationService2 = container.getNotificationService();
      expect(notificationService1).toBe(notificationService2);
    });
  });

  describe('Error Handling', () => {
    it('should handle database initialization failure', async () => {
      (DatabaseManager as any) = mock(() => {
        throw new Error('Database connection failed');
      });

      await expect(container.initialize('/test/path', mockSettings)).rejects.toThrow('Database connection failed');
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize ServiceContainer'),
        expect.any(Error)
      );
    });

    it('should handle notification service initialization failure', async () => {
      (NotificationService as any) = mock(() => {
        throw new Error('Notification service error');
      });

      await expect(container.initialize('/test/path', mockSettings)).rejects.toThrow();
      expect(consoleError).toHaveBeenCalled();
    });

    it('should handle categories service initialization failure', async () => {
      (CategoriesService as any) = mock(() => {
        throw new Error('Categories service error');
      });

      await expect(container.initialize('/test/path', mockSettings)).rejects.toThrow();
      expect(consoleError).toHaveBeenCalled();
    });

    it('should throw error if initialized without user data path', async () => {
      await expect(container.initialize('', mockSettings)).rejects.toThrow();
    });
  });

  describe('Lifecycle Management', () => {
    it('should cleanup all services', async () => {
      await container.initialize('/test/path', mockSettings);

      const _activityTracker = container.getActivityTrackingService();
      const _pomodoroService = container.getPomodoroService();

      await container.cleanup();

      expect(container.isInitialized()).toBe(false);
      expect(container.getDatabaseManager()).toBeNull();
      expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('Cleaning up ServiceContainer'));
      expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('cleaned up successfully'));
    });

    it('should stop activity tracking if running during cleanup', async () => {
      await container.initialize('/test/path', mockSettings);

      const activityTracker = container.getActivityTrackingService() as any;
      activityTracker.isTracking = mock(() => true);

      await container.cleanup();

      expect(activityTracker.stop).toHaveBeenCalled();
    });

    it('should destroy pomodoro service during cleanup', async () => {
      await container.initialize('/test/path', mockSettings);

      const pomodoroService = container.getPomodoroService() as any;

      await container.cleanup();

      expect(pomodoroService.destroy).toHaveBeenCalled();
    });

    it('should allow re-initialization after cleanup', async () => {
      await container.initialize('/test/path', mockSettings);
      await container.cleanup();

      expect(container.isInitialized()).toBe(false);

      await container.initialize('/test/path', mockSettings);

      expect(container.isInitialized()).toBe(true);
    });

    it('should handle cleanup errors gracefully', async () => {
      await container.initialize('/test/path', mockSettings);

      const activityTracker = container.getActivityTrackingService() as any;
      activityTracker.isTracking = mock(() => true); // Make it return true
      activityTracker.stop = mock(() => Promise.reject(new Error('Stop failed')));

      await expect(container.cleanup()).rejects.toThrow('Stop failed');
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to cleanup ServiceContainer'),
        expect.any(Error)
      );
    });
  });

  describe('Settings Integration', () => {
    it('should pass notification settings correctly', async () => {
      const customSettings: Settings = {
        ...mockSettings,
        pomodoro: {
          ...mockSettings.pomodoro!,
          soundEnabled: false,
          notificationsEnabled: false,
        },
      };

      await container.initialize('/test/path', customSettings);

      expect(NotificationService).toHaveBeenCalledWith(false, false);
    });

    it('should pass pomodoro settings correctly', async () => {
      const customSettings: Settings = {
        ...mockSettings,
        pomodoro: {
          focusDuration: 30,
          shortBreakDuration: 10,
          longBreakDuration: 20,
          longBreakInterval: 5,
          autoStartBreaks: true,
          autoStartFocus: true,
          soundEnabled: true,
          notificationsEnabled: true,
          dailyGoal: 10,
        },
      };

      await container.initialize('/test/path', customSettings);

      expect(PomodoroService).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        customSettings.pomodoro
      );
    });

    it('should handle missing pomodoro settings with defaults', async () => {
      const settingsWithoutPomodoro: Settings = {
        minimizeToTray: false,
        autoStart: false,
      };

      await container.initialize('/test/path', settingsWithoutPomodoro);

      // Should still initialize successfully with default settings
      expect(container.isInitialized()).toBe(true);
    });
  });

  describe('Dependency Resolution', () => {
    it('should resolve ActivityMergeService with correct dependencies', async () => {
      await container.initialize('/test/path', mockSettings);

      expect(ActivityMergeService).toHaveBeenCalledWith(
        expect.anything(), // DatabaseManager instance
        expect.anything()  // ActivityValidationService instance
      );
      expect(ActivityMergeService).toHaveBeenCalledTimes(1);
    });

    it('should resolve GoalsService with optional NotificationService', async () => {
      await container.initialize('/test/path', mockSettings);

      expect(GoalsService).toHaveBeenCalledWith(
        expect.anything(), // DatabaseManager instance
        expect.anything()  // NotificationService instance
      );
      expect(GoalsService).toHaveBeenCalledTimes(1);
    });

    it('should resolve ActivityTrackingService with optional GoalsService', async () => {
      await container.initialize('/test/path', mockSettings);

      expect(ActivityTrackingService).toHaveBeenCalledWith(
        expect.anything(), // DatabaseManager instance
        expect.anything()  // GoalsService instance
      );
      expect(ActivityTrackingService).toHaveBeenCalledTimes(1);
    });

    it('should resolve PomodoroService with all required dependencies', async () => {
      await container.initialize('/test/path', mockSettings);

      const calls = (PomodoroService as jest.MockedClass<typeof PomodoroService>).mock.calls;
      expect(calls.length).toBe(1);
      expect(calls[0]).toHaveLength(3); // DatabaseManager, NotificationService, settings
      expect(calls[0][2]).toEqual(mockSettings.pomodoro);
    });
  });

  describe('Async Category Initialization', () => {
    it('should call initializeDefaultCategories asynchronously', async () => {
      await container.initialize('/test/path', mockSettings);

      const categoriesService = container.getCategoriesService() as any;

      // Give async operation time to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(categoriesService.initializeDefaultCategories).toHaveBeenCalled();
    });

    it('should handle default categories initialization failure gracefully', async () => {
      (CategoriesService as any) = mock(() => ({
        initializeDefaultCategories: mock(() => Promise.reject(new Error('Init failed'))),
      }));

      await container.initialize('/test/path', mockSettings);

      // Should not throw, initialization continues
      expect(container.isInitialized()).toBe(true);

      // Give async operation time to fail
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize default categories'),
        expect.any(Error)
      );
    });
  });
});
