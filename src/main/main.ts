import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as dotenv from 'dotenv';
import { isDev } from './utils';
import { DatabaseManager } from '../database/DatabaseManager';
import { ActivityTrackingService } from '../services/activity/ActivityTrackingService';
import { PomodoroService } from '../services/pomodoro/PomodoroService';
import { NotificationService } from '../services/notifications/NotificationService';
import { GoalsService } from '../services/goals/GoalsService';
import { CategoriesService } from '../services/categories/CategoriesService';
import { ActivityValidationService } from '../services/activity/ActivityValidationService';
import { ActivityMergeService } from '../services/activity/ActivityMergeService';
import { initializeSentry } from '../config/sentry';
import { initializeCrashReporter, getLastCrashReport, getUploadedReports } from '../config/crashReporter';

// Load environment variables
dotenv.config();

// Initialize crash reporting (must be done early, before app is ready)
initializeCrashReporter();

// Initialize Sentry for error tracking
initializeSentry();

class LumeApp {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private dbManager: DatabaseManager | null = null;
  private activityTracker: ActivityTrackingService | null = null;
  private pomodoroService: PomodoroService | null = null;
  private notificationService: NotificationService | null = null;
  private goalsService: GoalsService | null = null;
  private categoriesService: CategoriesService | null = null;
  private activityValidationService: ActivityValidationService | null = null;
  private activityMergeService: ActivityMergeService | null = null;
  private settingsPath: string;
  private isQuitting = false;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.settingsPath = path.join(userDataPath, 'settings.json');
    this.setupApp();
  }

  private setupApp(): void {
    // Handle app lifecycle events
    app.on('before-quit', () => {
      this.isQuitting = true;
    });

    app.whenReady().then(() => {
      // Set dock icon on macOS
      if (process.platform === 'darwin' && app.dock) {
        const dockIconPath = path.join(__dirname, '../../src/public/logo1.png');
        app.dock.setIcon(dockIconPath);
      }

      this.createWindow();
      this.setupDatabase();
      this.setupTray();
      this.setupIPC();

      // Apply auto-start setting
      this.applyAutoStartSetting();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
        } else if (this.mainWindow) {
          this.showWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      const settings = this.getSettings();
      // Only quit if not using minimize to tray or on macOS
      if (!settings.minimizeToTray && process.platform !== 'darwin') {
        app.quit();
      }
    });
  }

  private createWindow(): void {
    // Set icon path based on platform
    const iconPath = path.join(__dirname, '../../src/public/logo1.png');

    this.mainWindow = new BrowserWindow({
      width: 1600,
      height: 1000,
      minWidth: 800,
      minHeight: 600,
      icon: iconPath,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      titleBarStyle: 'hiddenInset',
      show: false,
    });

    const isDevelopment = isDev();

    if (isDevelopment) {
      this.mainWindow.loadURL('http://localhost:5173');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    // Handle window close event for tray mode
    this.mainWindow.on('close', (event) => {
      const settings = this.getSettings();
      if (!this.isQuitting && settings.minimizeToTray) {
        event.preventDefault();
        this.hideWindow();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupDatabase(): void {
    try {
      this.dbManager = new DatabaseManager();
      this.dbManager.initialize(app.getPath('userData'));
      console.log('✅ Database initialized successfully');

      // Initialize notification service
      const pomodoroSettings = this.getSettings().pomodoro;
      this.notificationService = new NotificationService(
        pomodoroSettings?.soundEnabled !== false,
        pomodoroSettings?.notificationsEnabled !== false
      );
      console.log('✅ Notification service initialized');

      // Initialize goals service
      this.goalsService = new GoalsService(this.dbManager, this.notificationService);
      console.log('✅ Goals service initialized');

      // Initialize categories service
      this.categoriesService = new CategoriesService(this.dbManager);
      console.log('✅ Categories service initialized');

      // Initialize default categories for first-run users (async, non-blocking)
      this.categoriesService.initializeDefaultCategories().then(() => {
        console.log('✅ Default categories initialized');
      }).catch((error) => {
        console.error('⚠️ Failed to initialize default categories:', error);
      });

      // Initialize activity validation and merge services
      this.activityValidationService = new ActivityValidationService(this.dbManager);
      this.activityMergeService = new ActivityMergeService(
        this.dbManager,
        this.activityValidationService
      );
      console.log('✅ Activity validation and merge services initialized');

      // Initialize activity tracking service (with goals service for integration)
      this.activityTracker = new ActivityTrackingService(this.dbManager, this.goalsService);
      console.log('✅ Activity tracking service initialized');

      // Initialize pomodoro service
      this.pomodoroService = new PomodoroService(
        this.dbManager,
        this.notificationService,
        pomodoroSettings
      );
      console.log('✅ Pomodoro service initialized');

      // Auto-start tracking if enabled in settings
      this.autoStartTracking();
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      // Continue without database for now
    }
  }

  private autoStartTracking(): void {
    try {
      const settings = this.getSettings();
      console.log('📋 Loaded settings:', JSON.stringify(settings, null, 2));

      if (settings.activityTracking?.enabled) {
        console.log('🚀 Auto-starting activity tracking (enabled in settings)');
        if (this.activityTracker) {
          // updateSettings will automatically start tracking if enabled and not already running
          this.activityTracker.updateSettings(settings.activityTracking);
          console.log('✅ Activity tracking auto-started successfully');
        }
      } else {
        console.log('ℹ️  Activity tracking disabled in settings - not auto-starting');
      }
    } catch (error) {
      console.error('❌ Failed to auto-start activity tracking:', error);
    }
  }

  private getSettings(): any {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to read settings:', error);
    }

    // Return default settings
    return {
      autoTrackApps: true,
      showNotifications: true,
      minimizeToTray: false,
      autoStartOnLogin: false,
      autoStartTracking: false,
      defaultCategory: null,
    };
  }

  private saveSettings(settings: any): boolean {
    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
      console.log('Settings saved successfully');
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }

  private setupIPC(): void {
    ipcMain.handle('add-time-entry', async (_, entry) => {
      try {
        console.log('Add time entry:', entry);
        return this.dbManager?.addTimeEntry(entry) || null;
      } catch (error) {
        console.error('Failed to add time entry:', error);
        return null;
      }
    });

    ipcMain.handle('update-time-entry', async (_, id: number, updates: any) => {
      try {
        console.log('Update time entry:', id, updates);
        return this.dbManager?.updateTimeEntry(id, updates) || false;
      } catch (error) {
        console.error('Failed to update time entry:', error);
        return false;
      }
    });

    ipcMain.handle('get-active-time-entry', async () => {
      try {
        const activeEntry = this.dbManager?.getActiveTimeEntry() || null;
        console.log('Get active time entry:', activeEntry);
        return activeEntry;
      } catch (error) {
        console.error('Failed to get active time entry:', error);
        return null;
      }
    });

    ipcMain.handle('add-app-usage', async (_, usage) => {
      try {
        console.log('Add app usage:', usage);
        return this.dbManager?.addAppUsage(usage) || null;
      } catch (error) {
        console.error('Failed to add app usage:', error);
        return null;
      }
    });

    ipcMain.handle('get-settings', async () => {
      try {
        return this.getSettings();
      } catch (error) {
        console.error('Failed to get settings:', error);
        return null;
      }
    });

    ipcMain.handle('save-settings', async (_, settings) => {
      try {
        console.log('💾 Saving settings:', JSON.stringify(settings, null, 2));

        // Get previous settings before saving
        const previousSettings = this.getSettings();
        const success = this.saveSettings(settings);

        // Update activity tracking settings if present
        if (success && this.activityTracker && settings.activityTracking) {
          console.log('🔄 Updating activity tracker with new settings');
          this.activityTracker.updateSettings(settings.activityTracking);

          const isTracking = this.activityTracker.isTracking();
          console.log(`📊 Activity tracking status after settings update: ${isTracking ? 'ACTIVE' : 'STOPPED'}`);
        }

        // Update tray when minimizeToTray setting changes
        if (success && settings.minimizeToTray !== previousSettings.minimizeToTray) {
          if (settings.minimizeToTray) {
            this.setupTray();
          } else if (this.tray) {
            this.tray.destroy();
            this.tray = null;
            console.log('✅ System tray removed');
          }
        }

        // Update auto-start when autoStartOnLogin setting changes
        if (success && settings.autoStartOnLogin !== previousSettings.autoStartOnLogin) {
          try {
            app.setLoginItemSettings({
              openAtLogin: settings.autoStartOnLogin,
              openAsHidden: false,
            });
            console.log(`✅ Auto-start ${settings.autoStartOnLogin ? 'enabled' : 'disabled'}`);
          } catch (error) {
            console.error('Failed to update auto-start setting:', error);
          }
        }

        return success;
      } catch (error) {
        console.error('❌ Failed to save settings:', error);
        return false;
      }
    });

    // Activity tracking IPC handlers
    ipcMain.handle('start-activity-tracking', async () => {
      try {
        if (this.activityTracker) {
          this.activityTracker.start();
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to start activity tracking:', error);
        return false;
      }
    });

    ipcMain.handle('stop-activity-tracking', async () => {
      try {
        if (this.activityTracker) {
          this.activityTracker.stop();
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to stop activity tracking:', error);
        return false;
      }
    });

    ipcMain.handle('get-activity-tracking-status', async () => {
      try {
        return this.activityTracker?.isTracking() || false;
      } catch (error) {
        console.error('Failed to get activity tracking status:', error);
        return false;
      }
    });

    ipcMain.handle('get-current-activity-session', async () => {
      try {
        return this.activityTracker?.getCurrentSession() || null;
      } catch (error) {
        console.error('Failed to get current activity session:', error);
        return null;
      }
    });

    ipcMain.handle('get-recent-activity-sessions', async (_, limit = 50) => {
      try {
        return this.activityTracker?.getRecentSessions(limit) || [];
      } catch (error) {
        console.error('Failed to get recent activity sessions:', error);
        return [];
      }
    });

    ipcMain.handle('get-top-applications', async (_, limit = 10) => {
      try {
        return this.activityTracker?.getTopApplications(limit) || [];
      } catch (error) {
        console.error('Failed to get top applications:', error);
        return [];
      }
    });

    ipcMain.handle('get-top-websites', async (_, limit = 10) => {
      try {
        return this.activityTracker?.getTopWebsites(limit) || [];
      } catch (error) {
        console.error('Failed to get top websites:', error);
        return [];
      }
    });

    // Crash reporter IPC handlers
    ipcMain.handle('get-last-crash-report', async () => {
      try {
        return getLastCrashReport();
      } catch (error) {
        console.error('Failed to get last crash report:', error);
        return null;
      }
    });

    ipcMain.handle('get-uploaded-crash-reports', async () => {
      try {
        return getUploadedReports();
      } catch (error) {
        console.error('Failed to get uploaded crash reports:', error);
        return [];
      }
    });

    // Test crash reporting (development only)
    ipcMain.handle('test-crash-reporting', async () => {
      try {
        const { runAllCrashTests } = await import('../test/crashTest');
        await runAllCrashTests();
        return true;
      } catch (error) {
        console.error('Failed to run crash tests:', error);
        return false;
      }
    });

    // Pomodoro IPC handlers
    ipcMain.handle('get-pomodoro-settings', async () => {
      try {
        const settings = this.getSettings();
        return settings.pomodoro || {
          focusDuration: 25,
          shortBreakDuration: 5,
          longBreakDuration: 15,
          longBreakInterval: 4,
          autoStartBreaks: false,
          autoStartFocus: false,
          soundEnabled: true,
          notificationsEnabled: true,
          dailyGoal: 8,
        };
      } catch (error) {
        console.error('Failed to get pomodoro settings:', error);
        return null;
      }
    });

    ipcMain.handle('save-pomodoro-settings', async (_, pomodoroSettings) => {
      try {
        const settings = this.getSettings();
        settings.pomodoro = pomodoroSettings;
        const success = this.saveSettings(settings);

        // Update running services with new settings
        if (success && this.pomodoroService && this.notificationService) {
          console.log('🔄 Updating pomodoro service with new settings');
          this.pomodoroService.updateSettings(pomodoroSettings);
          this.notificationService.updateSettings(
            pomodoroSettings.soundEnabled,
            pomodoroSettings.notificationsEnabled
          );
          console.log('✅ Pomodoro settings applied to running services');
        }

        return success;
      } catch (error) {
        console.error('Failed to save pomodoro settings:', error);
        return false;
      }
    });

    ipcMain.handle('add-pomodoro-session', async (_, session) => {
      try {
        // Validate session data
        const requiredFields = [
          { key: 'startTime', type: 'number' },
          { key: 'endTime', type: 'number' },
          { key: 'duration', type: 'number' },
          { key: 'type', type: 'string' }
        ];

        for (const field of requiredFields) {
          if (
            !(field.key in session) ||
            typeof session[field.key] !== field.type
          ) {
            console.error(
              `Invalid pomodoro session: missing or invalid field '${field.key}'`
            );
            return null;
          }
        }

        console.log('Add pomodoro session:', session);
        return this.dbManager?.addPomodoroSession(session) || null;
      } catch (error) {
        console.error('Failed to add pomodoro session:', error);
        return null;
      }
    });

    ipcMain.handle('update-pomodoro-session', async (_, id: number, updates: any) => {
      try {
        console.log('Update pomodoro session:', id, updates);
        return this.dbManager?.updatePomodoroSession(id, updates) || false;
      } catch (error) {
        console.error('Failed to update pomodoro session:', error);
        return false;
      }
    });

    ipcMain.handle('get-pomodoro-stats', async (_, startDate?: string, endDate?: string) => {
      try {
        return this.dbManager?.getPomodoroStats(startDate, endDate) || {
          totalSessions: 0,
          completedSessions: 0,
          totalFocusTime: 0,
          totalBreakTime: 0,
          completionRate: 0,
          currentStreak: 0,
        };
      } catch (error) {
        console.error('Failed to get pomodoro stats:', error);
        return {
          totalSessions: 0,
          completedSessions: 0,
          totalFocusTime: 0,
          totalBreakTime: 0,
          completionRate: 0,
          currentStreak: 0,
        };
      }
    });

    // Pomodoro Timer Control IPC handlers
    ipcMain.handle('start-pomodoro-session', async (_, task: string, sessionType: 'focus' | 'shortBreak' | 'longBreak') => {
      try {
        if (this.pomodoroService) {
          this.pomodoroService.start(task, sessionType);
          console.log(`🍅 Started pomodoro session: ${sessionType} - "${task}"`);
        }
      } catch (error) {
        console.error('Failed to start pomodoro session:', error);
      }
    });

    ipcMain.handle('pause-pomodoro-session', async () => {
      try {
        if (this.pomodoroService) {
          this.pomodoroService.pause();
          console.log('⏸️  Paused pomodoro session');
        }
      } catch (error) {
        console.error('Failed to pause pomodoro session:', error);
      }
    });

    ipcMain.handle('resume-pomodoro-session', async () => {
      try {
        if (this.pomodoroService) {
          this.pomodoroService.resume();
          console.log('▶️  Resumed pomodoro session');
        }
      } catch (error) {
        console.error('Failed to resume pomodoro session:', error);
      }
    });

    ipcMain.handle('stop-pomodoro-session', async () => {
      try {
        if (this.pomodoroService) {
          this.pomodoroService.stop();
          console.log('⏹️  Stopped pomodoro session');
        }
      } catch (error) {
        console.error('Failed to stop pomodoro session:', error);
      }
    });

    ipcMain.handle('skip-pomodoro-session', async () => {
      try {
        if (this.pomodoroService) {
          this.pomodoroService.skip();
          console.log('⏭️  Skipped pomodoro session');
        }
      } catch (error) {
        console.error('Failed to skip pomodoro session:', error);
      }
    });

    ipcMain.handle('get-pomodoro-status', async () => {
      try {
        return this.pomodoroService?.getStatus() || {
          state: 'idle',
          sessionType: 'focus',
          timeRemaining: 0,
          totalDuration: 0,
          currentTask: '',
          sessionsCompleted: 0,
        };
      } catch (error) {
        console.error('Failed to get pomodoro status:', error);
        return {
          state: 'idle',
          sessionType: 'focus',
          timeRemaining: 0,
          totalDuration: 0,
          currentTask: '',
          sessionsCompleted: 0,
        };
      }
    });

    // Productivity Goals IPC handlers
    ipcMain.handle('add-goal', async (_, goal) => {
      try {
        console.log('➕ Adding goal:', goal);
        const goalId = await this.goalsService?.addGoal(goal);
        return goalId || null;
      } catch (error) {
        console.error('Failed to add goal:', error);
        return null;
      }
    });

    ipcMain.handle('update-goal', async (_, id: number, updates: any) => {
      try {
        console.log('📝 Updating goal:', id, updates);
        return await this.goalsService?.updateGoal(id, updates) || false;
      } catch (error) {
        console.error('Failed to update goal:', error);
        return false;
      }
    });

    ipcMain.handle('delete-goal', async (_, id: number) => {
      try {
        console.log('🗑️  Deleting goal:', id);
        return await this.goalsService?.deleteGoal(id) || false;
      } catch (error) {
        console.error('Failed to delete goal:', error);
        return false;
      }
    });

    ipcMain.handle('get-goals', async (_, activeOnly = false) => {
      try {
        return await this.goalsService?.getGoals(activeOnly) || [];
      } catch (error) {
        console.error('Failed to get goals:', error);
        return [];
      }
    });

    ipcMain.handle('get-today-goals-with-progress', async () => {
      try {
        return await this.goalsService?.getTodayGoalsWithProgress() || [];
      } catch (error) {
        console.error('Failed to get today goals with progress:', error);
        return [];
      }
    });

    ipcMain.handle('get-goal-progress', async (_, goalId: number, date: string) => {
      try {
        return await this.goalsService?.getGoalProgress(goalId, date) || null;
      } catch (error) {
        console.error('Failed to get goal progress:', error);
        return null;
      }
    });

    ipcMain.handle('get-goal-achievement-history', async (_, goalId: number, days = 30) => {
      try {
        return await this.goalsService?.getGoalAchievementHistory(goalId, days) || [];
      } catch (error) {
        console.error('Failed to get goal achievement history:', error);
        return [];
      }
    });

    ipcMain.handle('get-goal-stats', async () => {
      try {
        return await this.goalsService?.getGoalStats() || {
          totalGoals: 0,
          activeGoals: 0,
          achievedToday: 0,
          currentStreak: 0,
          longestStreak: 0,
          achievementRate: 0,
        };
      } catch (error) {
        console.error('Failed to get goal stats:', error);
        return {
          totalGoals: 0,
          activeGoals: 0,
          achievedToday: 0,
          currentStreak: 0,
          longestStreak: 0,
          achievementRate: 0,
        };
      }
    });

    // ==================== CATEGORIES IPC HANDLERS ====================

    ipcMain.handle('get-categories', async () => {
      try {
        return await this.categoriesService?.getCategories() || [];
      } catch (error) {
        console.error('Failed to get categories:', error);
        return [];
      }
    });

    ipcMain.handle('get-category-by-id', async (_, id: number) => {
      try {
        return await this.categoriesService?.getCategoryById(id) || null;
      } catch (error) {
        console.error('Failed to get category by ID:', error);
        return null;
      }
    });

    ipcMain.handle('add-category', async (_, category) => {
      try {
        return await this.categoriesService?.addCategory(category) || null;
      } catch (error) {
        console.error('Failed to add category:', error);
        return null;
      }
    });

    ipcMain.handle('update-category', async (_, id: number, updates: any) => {
      try {
        return await this.categoriesService?.updateCategory(id, updates) || false;
      } catch (error) {
        console.error('Failed to update category:', error);
        return false;
      }
    });

    ipcMain.handle('delete-category', async (_, id: number) => {
      try {
        return await this.categoriesService?.deleteCategory(id) || false;
      } catch (error) {
        console.error('Failed to delete category:', error);
        return false;
      }
    });

    // ==================== TAGS IPC HANDLERS ====================

    ipcMain.handle('get-tags', async () => {
      try {
        return await this.categoriesService?.getTags() || [];
      } catch (error) {
        console.error('Failed to get tags:', error);
        return [];
      }
    });

    ipcMain.handle('add-tag', async (_, tag) => {
      try {
        return await this.categoriesService?.addTag(tag) || null;
      } catch (error) {
        console.error('Failed to add tag:', error);
        return null;
      }
    });

    ipcMain.handle('update-tag', async (_, id: number, updates: any) => {
      try {
        return await this.categoriesService?.updateTag(id, updates) || false;
      } catch (error) {
        console.error('Failed to update tag:', error);
        return false;
      }
    });

    ipcMain.handle('delete-tag', async (_, id: number) => {
      try {
        return await this.categoriesService?.deleteTag(id) || false;
      } catch (error) {
        console.error('Failed to delete tag:', error);
        return false;
      }
    });

    // ==================== CATEGORY MAPPINGS IPC HANDLERS ====================

    ipcMain.handle('get-app-category-mappings', async () => {
      try {
        return await this.categoriesService?.getAppCategoryMappings() || [];
      } catch (error) {
        console.error('Failed to get app category mappings:', error);
        return [];
      }
    });

    ipcMain.handle('add-app-category-mapping', async (_, appName: string, categoryId: number) => {
      try {
        return await this.categoriesService?.addAppCategoryMapping(appName, categoryId) || null;
      } catch (error) {
        console.error('Failed to add app category mapping:', error);
        return null;
      }
    });

    ipcMain.handle('delete-app-category-mapping', async (_, id: number) => {
      try {
        return await this.categoriesService?.deleteAppCategoryMapping(id) || false;
      } catch (error) {
        console.error('Failed to delete app category mapping:', error);
        return false;
      }
    });

    ipcMain.handle('get-domain-category-mappings', async () => {
      try {
        return await this.categoriesService?.getDomainCategoryMappings() || [];
      } catch (error) {
        console.error('Failed to get domain category mappings:', error);
        return [];
      }
    });

    ipcMain.handle('add-domain-category-mapping', async (_, domain: string, categoryId: number) => {
      try {
        return await this.categoriesService?.addDomainCategoryMapping(domain, categoryId) || null;
      } catch (error) {
        console.error('Failed to add domain category mapping:', error);
        return null;
      }
    });

    ipcMain.handle('delete-domain-category-mapping', async (_, id: number) => {
      try {
        return await this.categoriesService?.deleteDomainCategoryMapping(id) || false;
      } catch (error) {
        console.error('Failed to delete domain category mapping:', error);
        return false;
      }
    });

    // ==================== TAG ASSOCIATIONS IPC HANDLERS ====================

    ipcMain.handle('get-time-entry-tags', async (_, timeEntryId: number) => {
      try {
        return await this.categoriesService?.getTimeEntryTags(timeEntryId) || [];
      } catch (error) {
        console.error('Failed to get time entry tags:', error);
        return [];
      }
    });

    ipcMain.handle('add-time-entry-tags', async (_, timeEntryId: number, tagIds: number[]) => {
      try {
        await this.categoriesService?.addTimeEntryTags(timeEntryId, tagIds);
        return true;
      } catch (error) {
        console.error('Failed to add time entry tags:', error);
        return false;
      }
    });

    ipcMain.handle('get-app-usage-tags', async (_, appUsageId: number) => {
      try {
        return await this.categoriesService?.getAppUsageTags(appUsageId) || [];
      } catch (error) {
        console.error('Failed to get app usage tags:', error);
        return [];
      }
    });

    ipcMain.handle('add-app-usage-tags', async (_, appUsageId: number, tagIds: number[]) => {
      try {
        await this.categoriesService?.addAppUsageTags(appUsageId, tagIds);
        return true;
      } catch (error) {
        console.error('Failed to add app usage tags:', error);
        return false;
      }
    });

    ipcMain.handle('get-pomodoro-session-tags', async (_, pomodoroSessionId: number) => {
      try {
        return this.dbManager?.getPomodoroSessionTags(pomodoroSessionId) || [];
      } catch (error) {
        console.error('Failed to get pomodoro session tags:', error);
        return [];
      }
    });

    ipcMain.handle('add-pomodoro-session-tags', async (_, pomodoroSessionId: number, tagIds: number[]) => {
      try {
        this.dbManager?.addPomodoroSessionTags(pomodoroSessionId, tagIds);
        return true;
      } catch (error) {
        console.error('Failed to add pomodoro session tags:', error);
        return false;
      }
    });

    ipcMain.handle('set-pomodoro-session-tags', async (_, pomodoroSessionId: number, tagIds: number[]) => {
      try {
        this.dbManager?.setPomodoroSessionTags(pomodoroSessionId, tagIds);
        return true;
      } catch (error) {
        console.error('Failed to set pomodoro session tags:', error);
        return false;
      }
    });

    ipcMain.handle('get-productivity-goal-tags', async (_, productivityGoalId: number) => {
      try {
        return this.dbManager?.getProductivityGoalTags(productivityGoalId) || [];
      } catch (error) {
        console.error('Failed to get productivity goal tags:', error);
        return [];
      }
    });

    ipcMain.handle('add-productivity-goal-tags', async (_, productivityGoalId: number, tagIds: number[]) => {
      try {
        this.dbManager?.addProductivityGoalTags(productivityGoalId, tagIds);
        return true;
      } catch (error) {
        console.error('Failed to add productivity goal tags:', error);
        return false;
      }
    });

    ipcMain.handle('set-productivity-goal-tags', async (_, productivityGoalId: number, tagIds: number[]) => {
      try {
        this.dbManager?.setProductivityGoalTags(productivityGoalId, tagIds);
        return true;
      } catch (error) {
        console.error('Failed to set productivity goal tags:', error);
        return false;
      }
    });

    // ==================== STATISTICS IPC HANDLERS ====================

    ipcMain.handle('get-category-stats', async (_, startDate?: string, endDate?: string) => {
      try {
        return await this.categoriesService?.getCategoryStats(startDate, endDate) || [];
      } catch (error) {
        console.error('Failed to get category stats:', error);
        return [];
      }
    });

    ipcMain.handle('get-tag-stats', async (_, startDate?: string, endDate?: string) => {
      try {
        return await this.categoriesService?.getTagStats(startDate, endDate) || [];
      } catch (error) {
        console.error('Failed to get tag stats:', error);
        return [];
      }
    });

    // ==================== TIMELINE IPC HANDLERS ====================

    ipcMain.handle('get-timeline-activities', async (_, startDate: string, endDate: string) => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return [];
        }
        const activities = this.dbManager.getTimelineActivities(startDate, endDate);
        console.log(`📊 Retrieved ${activities.length} timeline activities`);
        return activities;
      } catch (error) {
        console.error('Failed to get timeline activities:', error);
        return [];
      }
    });

    ipcMain.handle('get-timeline-summary', async (_, startDate: string, endDate: string) => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return {
            totalActivities: 0,
            totalDuration: 0,
            averageDuration: 0,
            longestActivity: null,
            categoryBreakdown: []
          };
        }

        const activities = this.dbManager.getTimelineActivities(startDate, endDate);

        // Calculate summary statistics
        const totalActivities = activities.length;
        const totalDuration = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
        const averageDuration = totalActivities > 0 ? totalDuration / totalActivities : 0;

        // Find longest activity
        const longestActivity = activities.reduce((longest, current) => {
          if (!longest || (current.duration || 0) > (longest.duration || 0)) {
            return current;
          }
          return longest;
        }, null as any);

        // Get category breakdown using existing service
        const categoryBreakdown = await this.categoriesService?.getCategoryStats(startDate, endDate) || [];

        return {
          totalActivities,
          totalDuration,
          averageDuration,
          longestActivity,
          categoryBreakdown
        };
      } catch (error) {
        console.error('Failed to get timeline summary:', error);
        return {
          totalActivities: 0,
          totalDuration: 0,
          averageDuration: 0,
          longestActivity: null,
          categoryBreakdown: []
        };
      }
    });

    // ==================== ANALYTICS IPC HANDLERS ====================

    ipcMain.handle('get-daily-productivity-stats', async (_, startDate: string, endDate: string) => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return [];
        }
        const stats = this.dbManager.getDailyProductivityStats(startDate, endDate);
        console.log(`📊 Retrieved daily productivity stats for ${startDate} to ${endDate}`);
        return stats;
      } catch (error) {
        console.error('Failed to get daily productivity stats:', error);
        return [];
      }
    });

    ipcMain.handle('get-hourly-patterns', async (_, days: number) => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return [];
        }
        const patterns = this.dbManager.getHourlyPatterns(days);
        console.log(`📊 Retrieved hourly patterns for last ${days} days`);
        return patterns;
      } catch (error) {
        console.error('Failed to get hourly patterns:', error);
        return [];
      }
    });

    ipcMain.handle('get-heatmap-data', async (_, year: number) => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return [];
        }
        const heatmapData = this.dbManager.getHeatmapData(year);
        console.log(`📊 Retrieved heatmap data for year ${year}`);
        return heatmapData;
      } catch (error) {
        console.error('Failed to get heatmap data:', error);
        return [];
      }
    });

    ipcMain.handle('get-weekly-summary', async (_, weekOffset: number) => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return {
            weekStart: '',
            weekEnd: '',
            totalMinutes: 0,
            avgDailyMinutes: 0,
            topDay: null,
            topCategories: [],
            goalsAchieved: 0,
            totalGoals: 0,
            comparisonToPrevious: 0,
            insights: []
          };
        }
        const summary = this.dbManager.getWeeklySummary(weekOffset);
        console.log(`📊 Retrieved weekly summary for week offset ${weekOffset}`);
        return summary;
      } catch (error) {
        console.error('Failed to get weekly summary:', error);
        return {
          weekStart: '',
          weekEnd: '',
          totalMinutes: 0,
          avgDailyMinutes: 0,
          topDay: null,
          topCategories: [],
          goalsAchieved: 0,
          totalGoals: 0,
          comparisonToPrevious: 0,
          insights: []
        };
      }
    });

    ipcMain.handle('get-productivity-trends', async (_, startDate: string, endDate: string, groupBy: 'day' | 'week' | 'month') => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return [];
        }
        const trends = this.dbManager.getProductivityTrends(startDate, endDate, groupBy);
        console.log(`📊 Retrieved productivity trends for ${startDate} to ${endDate} grouped by ${groupBy}`);
        return trends;
      } catch (error) {
        console.error('Failed to get productivity trends:', error);
        return [];
      }
    });

    ipcMain.handle('get-behavioral-insights', async () => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return [];
        }
        const insights = this.dbManager.getBehavioralInsights();
        console.log(`📊 Retrieved ${insights.length} behavioral insights`);
        return insights;
      } catch (error) {
        console.error('Failed to get behavioral insights:', error);
        return [];
      }
    });

    ipcMain.handle('get-analytics-summary', async () => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return {
            productivityScore: 0,
            totalProductiveMinutes: 0,
            avgDailyFocusHours: 0,
            peakHour: 9,
            mostProductiveDay: 'Monday',
            weeklyStreak: 0
          };
        }
        const summary = this.dbManager.getAnalyticsSummary();
        console.log(`📊 Retrieved analytics summary - Score: ${summary.productivityScore}`);
        return summary;
      } catch (error) {
        console.error('Failed to get analytics summary:', error);
        return {
          productivityScore: 0,
          totalProductiveMinutes: 0,
          avgDailyFocusHours: 0,
          peakHour: 9,
          mostProductiveDay: 'Monday',
          weeklyStreak: 0
        };
      }
    });

    ipcMain.handle('get-distraction-analysis', async (_, days: number) => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return [];
        }
        const analysis = this.dbManager.getDistractionAnalysis(days);
        console.log(`📊 Retrieved distraction analysis for last ${days} days`);
        return analysis;
      } catch (error) {
        console.error('Failed to get distraction analysis:', error);
        return [];
      }
    });

    // ==================== AUTO-START IPC HANDLERS ====================

    ipcMain.handle('get-auto-start-status', async () => {
      try {
        const loginItemSettings = app.getLoginItemSettings();
        return loginItemSettings.openAtLogin;
      } catch (error) {
        console.error('Failed to get auto-start status:', error);
        return false;
      }
    });

    ipcMain.handle('set-auto-start', async (_, enabled: boolean) => {
      try {
        app.setLoginItemSettings({
          openAtLogin: enabled,
          openAsHidden: false,
        });

        // Update settings file
        const settings = this.getSettings();
        settings.autoStartOnLogin = enabled;
        this.saveSettings(settings);

        console.log(`✅ Auto-start ${enabled ? 'enabled' : 'disabled'}`);
        return true;
      } catch (error) {
        console.error('Failed to set auto-start:', error);
        return false;
      }
    });

    // ==================== DATA MANAGEMENT IPC HANDLERS ====================

    ipcMain.handle('clear-all-data', async () => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return false;
        }

        console.log('🗑️  Clear all data requested');
        const success = this.dbManager.clearAllData();

        if (success) {
          console.log('✅ All data cleared successfully');
        } else {
          console.error('❌ Failed to clear all data');
        }

        return success;
      } catch (error) {
        console.error('Failed to clear all data:', error);
        return false;
      }
    });

    ipcMain.handle('export-data', async (_, format: 'json' | 'csv') => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return { success: false, error: 'Database not initialized' };
        }

        console.log(`📦 Export data requested (format: ${format})`);

        // Show save dialog
        const defaultFileName = `lume-data-export-${new Date().toISOString().split('T')[0]}-${Date.now()}`;
        const extension = format === 'json' ? 'json' : 'zip';

        const result = await dialog.showSaveDialog(this.mainWindow!, {
          title: 'Export Data',
          defaultPath: `${defaultFileName}.${extension}`,
          filters: [
            format === 'json'
              ? { name: 'JSON Files', extensions: ['json'] }
              : { name: 'ZIP Files', extensions: ['zip'] }
          ],
        });

        if (result.canceled || !result.filePath) {
          console.log('📦 Export canceled by user');
          return { success: false, error: 'Export canceled' };
        }

        const filePath = result.filePath;

        // Export data from database
        const exportData = this.dbManager.exportAllData();

        if (format === 'json') {
          // Write JSON file
          await fsPromises.writeFile(
            filePath,
            JSON.stringify(exportData, null, 2),
            'utf8'
          );
          console.log(`✅ Data exported successfully to: ${filePath}`);
          return { success: true, filePath };
        } else {
          // CSV format: Create multiple CSV files and zip them
          // For now, we'll just save as JSON and show a message
          // TODO: Implement CSV export with multiple files in a ZIP
          return {
            success: false,
            error: 'CSV export not yet implemented. Please use JSON format.'
          };
        }
      } catch (error) {
        console.error('Failed to export data:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    ipcMain.handle('import-data', async (_, format: 'json' | 'csv', options?) => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return {
            success: false,
            recordsImported: 0,
            recordsSkipped: 0,
            recordsUpdated: 0,
            errors: ['Database not initialized'],
            warnings: []
          };
        }

        console.log(`📥 Import data requested (format: ${format})`);

        // Show open dialog
        const result = await dialog.showOpenDialog(this.mainWindow!, {
          title: 'Import Data',
          filters: [
            format === 'json'
              ? { name: 'JSON Files', extensions: ['json'] }
              : { name: 'ZIP Files', extensions: ['zip'] }
          ],
          properties: ['openFile'],
        });

        if (result.canceled || result.filePaths.length === 0) {
          console.log('📥 Import canceled by user');
          return {
            success: false,
            recordsImported: 0,
            recordsSkipped: 0,
            recordsUpdated: 0,
            errors: ['Import canceled'],
            warnings: []
          };
        }

        const filePath = result.filePaths[0];

        if (format === 'json') {
          // Read JSON file
          const fileContent = await fsPromises.readFile(filePath, 'utf8');
          const importData = JSON.parse(fileContent);

          // Import data into database
          const importOptions = options || { strategy: 'merge' };
          const importResult = this.dbManager.importAllData(importData, importOptions);

          console.log(`✅ Data imported successfully from: ${filePath}`);
          console.log(`📊 ${importResult.recordsImported} records imported`);

          return importResult;
        } else {
          // CSV format: Not yet implemented
          return {
            success: false,
            recordsImported: 0,
            recordsSkipped: 0,
            recordsUpdated: 0,
            errors: ['CSV import not yet implemented. Please use JSON format.'],
            warnings: []
          };
        }
      } catch (error) {
        console.error('Failed to import data:', error);
        return {
          success: false,
          recordsImported: 0,
          recordsSkipped: 0,
          recordsUpdated: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          warnings: []
        };
      }
    });

    // ==================== UNIFIED ACTIVITY LOG IPC HANDLERS ====================

    ipcMain.handle('get-unified-activities', async (_, startDate: string, endDate: string, filters?) => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return [];
        }
        const activities = this.dbManager.getUnifiedActivities(startDate, endDate, filters);
        console.log(`📊 Retrieved ${activities.length} unified activities`);
        return activities;
      } catch (error) {
        console.error('Failed to get unified activities:', error);
        return [];
      }
    });

    ipcMain.handle('get-unified-activity', async (_, id: number, sourceType: string) => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return null;
        }
        const activity = this.dbManager.getUnifiedActivity(id, sourceType as any);
        console.log(`📊 Retrieved unified activity: ${id} (${sourceType})`);
        return activity;
      } catch (error) {
        console.error('Failed to get unified activity:', error);
        return null;
      }
    });

    ipcMain.handle('update-unified-activity', async (_, options) => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return false;
        }
        console.log('✏️  Updating unified activity:', options.id, options.sourceType);
        const success = this.dbManager.updateUnifiedActivity(options);
        if (success) {
          console.log('✅ Unified activity updated successfully');
        } else {
          console.error('❌ Failed to update unified activity');
        }
        return success;
      } catch (error) {
        console.error('Failed to update unified activity:', error);
        return false;
      }
    });

    ipcMain.handle('delete-unified-activity', async (_, id: number, sourceType: string) => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return false;
        }
        console.log('🗑️  Deleting unified activity:', id, sourceType);
        const success = this.dbManager.deleteUnifiedActivity(id, sourceType as any);
        if (success) {
          console.log('✅ Unified activity deleted successfully');
        } else {
          console.error('❌ Failed to delete unified activity');
        }
        return success;
      } catch (error) {
        console.error('Failed to delete unified activity:', error);
        return false;
      }
    });

    ipcMain.handle('bulk-update-activities', async (_, operation) => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return { success: false, updated: 0, failed: 0 };
        }
        console.log(`📦 Bulk updating ${operation.activityIds.length} activities`);
        const result = this.dbManager.bulkUpdateActivities(operation);
        console.log(`✅ Bulk update complete: ${result.updated} updated, ${result.failed} failed`);
        return result;
      } catch (error) {
        console.error('Failed to bulk update activities:', error);
        return { success: false, updated: 0, failed: 0 };
      }
    });

    ipcMain.handle('bulk-delete-activities', async (_, activityIds) => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return { success: false, deleted: 0, failed: 0 };
        }
        console.log(`🗑️  Bulk deleting ${activityIds.length} activities`);
        const result = this.dbManager.bulkDeleteActivities(activityIds);
        console.log(`✅ Bulk delete complete: ${result.deleted} deleted, ${result.failed} failed`);
        return result;
      } catch (error) {
        console.error('Failed to bulk delete activities:', error);
        return { success: false, deleted: 0, failed: 0 };
      }
    });

    ipcMain.handle('get-activity-conflicts', async (_, startDate: string, endDate: string) => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return [];
        }
        const conflicts = this.dbManager.getActivityConflicts(startDate, endDate);
        console.log(`⚠️  Found ${conflicts.length} activity conflicts`);
        return conflicts;
      } catch (error) {
        console.error('Failed to get activity conflicts:', error);
        return [];
      }
    });

    ipcMain.handle('get-unified-activity-stats', async (_, startDate: string, endDate: string) => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return {
            totalActivities: 0,
            totalDuration: 0,
            bySourceType: { manual: 0, automatic: 0, pomodoro: 0 },
            byCategory: [],
            editableCount: 0,
            conflictsCount: 0,
            gapsDetected: 0,
          };
        }
        const stats = this.dbManager.getUnifiedActivityStats(startDate, endDate);
        console.log(`📊 Retrieved unified activity stats: ${stats.totalActivities} activities`);
        return stats;
      } catch (error) {
        console.error('Failed to get unified activity stats:', error);
        return {
          totalActivities: 0,
          totalDuration: 0,
          bySourceType: { manual: 0, automatic: 0, pomodoro: 0 },
          byCategory: [],
          editableCount: 0,
          conflictsCount: 0,
          gapsDetected: 0,
        };
      }
    });

    ipcMain.handle('search-activities', async (_, query: string, filters?) => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return [];
        }
        console.log(`🔍 Searching activities with query: "${query}"`);
        const results = this.dbManager.searchActivities(query, filters);
        console.log(`✅ Found ${results.length} matching activities`);
        return results;
      } catch (error) {
        console.error('Failed to search activities:', error);
        return [];
      }
    });

    ipcMain.handle('merge-activities', async (_, activityIds: Array<{ id: number; sourceType: string }>, strategy: 'longest' | 'earliest' | 'latest' = 'longest') => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return { success: false, error: 'Database not initialized' };
        }
        console.log(`🔄 Merging ${activityIds.length} activities with strategy: ${strategy}`);
        const result = await this.dbManager.mergeActivitiesById(
          activityIds.map(item => ({ id: item.id, sourceType: item.sourceType as any })),
          strategy
        );
        if (result.success) {
          console.log('✅ Activities merged successfully');
        } else {
          console.error(`❌ Failed to merge activities: ${result.error}`);
        }
        return result;
      } catch (error) {
        console.error('Failed to merge activities:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // ==================== DATA QUALITY IPC HANDLERS ====================

    // Gap Detection
    ipcMain.handle('detect-activity-gaps', async (_, startDate: string, endDate: string, minGapMinutes = 5) => {
      try {
        if (!this.dbManager || !this.activityMergeService) {
          console.error('❌ Services not initialized');
          return [];
        }

        console.log(`🔍 Detecting activity gaps from ${startDate} to ${endDate} (min gap: ${minGapMinutes}min)`);

        // Get all activities in the range
        const activities = this.dbManager.getUnifiedActivities(startDate, endDate, undefined);

        // Detect gaps using merge service
        const allGaps = this.activityMergeService.detectGaps(activities);

        // Filter by minimum gap size (convert minutes to seconds)
        const minGapSeconds = minGapMinutes * 60;
        const filteredGaps = allGaps.filter(gap => gap.duration >= minGapSeconds);

        console.log(`✅ Found ${filteredGaps.length} gaps (${allGaps.length} total, filtered by ${minGapMinutes}min minimum)`);
        return filteredGaps;
      } catch (error) {
        console.error('Failed to detect activity gaps:', error);
        return [];
      }
    });

    // Get gap statistics
    ipcMain.handle('get-gap-statistics', async (_, startDate: string, endDate: string, minGapMinutes = 5) => {
      try {
        if (!this.dbManager || !this.activityMergeService) {
          console.error('❌ Services not initialized');
          return { totalGaps: 0, totalUntrackedSeconds: 0, averageGapSeconds: 0, longestGapSeconds: 0 };
        }

        const activities = this.dbManager.getUnifiedActivities(startDate, endDate, undefined);
        const allGaps = this.activityMergeService.detectGaps(activities);

        const minGapSeconds = minGapMinutes * 60;
        const gaps = allGaps.filter(gap => gap.duration >= minGapSeconds);

        const totalUntrackedSeconds = gaps.reduce((sum, gap) => sum + gap.duration, 0);
        const averageGapSeconds = gaps.length > 0 ? totalUntrackedSeconds / gaps.length : 0;
        const longestGapSeconds = gaps.length > 0 ? Math.max(...gaps.map(g => g.duration)) : 0;

        const stats = {
          totalGaps: gaps.length,
          totalUntrackedSeconds,
          averageGapSeconds,
          longestGapSeconds,
        };

        console.log(`📊 Gap statistics: ${stats.totalGaps} gaps, ${Math.round(totalUntrackedSeconds / 60)}min untracked`);
        return stats;
      } catch (error) {
        console.error('Failed to get gap statistics:', error);
        return { totalGaps: 0, totalUntrackedSeconds: 0, averageGapSeconds: 0, longestGapSeconds: 0 };
      }
    });

    // Duplicate Detection
    ipcMain.handle('detect-duplicate-activities', async (_, startDate: string, endDate: string, similarityThreshold = 80) => {
      try {
        if (!this.dbManager || !this.activityValidationService) {
          console.error('❌ Services not initialized');
          return [];
        }

        console.log(`🔍 Detecting duplicate activities from ${startDate} to ${endDate} (threshold: ${similarityThreshold}%)`);

        const activities = this.dbManager.getUnifiedActivities(startDate, endDate, undefined);
        const duplicateGroups: any[] = [];
        const processedIds = new Set<string>();

        // Check each activity against all others
        for (const activity of activities) {
          const activityKey = `${activity.id}-${activity.sourceType}`;
          if (processedIds.has(activityKey)) continue;

          const duplicateResult = await this.activityValidationService.detectDuplicates(
            activity,
            activities
          );

          if (duplicateResult.isDuplicate && duplicateResult.similarity >= similarityThreshold) {
            // Create a group with this activity and its duplicates
            const group = {
              activities: [activity, ...duplicateResult.duplicateActivities],
              avgSimilarity: duplicateResult.similarity,
            };

            duplicateGroups.push(group);

            // Mark all activities in this group as processed
            group.activities.forEach(a => {
              processedIds.add(`${a.id}-${a.sourceType}`);
            });
          }
        }

        console.log(`✅ Found ${duplicateGroups.length} duplicate groups`);
        return duplicateGroups;
      } catch (error) {
        console.error('Failed to detect duplicate activities:', error);
        return [];
      }
    });

    // Find mergeable groups
    ipcMain.handle('find-mergeable-groups', async (_, startDate: string, endDate: string, maxGapSeconds = 300) => {
      try {
        if (!this.dbManager || !this.activityMergeService) {
          console.error('❌ Services not initialized');
          return [];
        }

        console.log(`🔍 Finding mergeable activity groups (max gap: ${maxGapSeconds}s)`);

        const activities = this.dbManager.getUnifiedActivities(startDate, endDate, undefined);
        const mergeableGroups = await this.activityMergeService.findMergeableGroups(activities, maxGapSeconds);

        console.log(`✅ Found ${mergeableGroups.length} mergeable groups`);
        return mergeableGroups;
      } catch (error) {
        console.error('Failed to find mergeable groups:', error);
        return [];
      }
    });

    // Data Cleanup Operations
    ipcMain.handle('find-orphaned-activities', async (_, startDate: string, endDate: string) => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return [];
        }

        console.log(`🔍 Finding orphaned activities from ${startDate} to ${endDate}`);

        const activities = this.dbManager.getUnifiedActivities(startDate, endDate, undefined);
        const categories = await this.categoriesService?.getCategories() || [];
        const categoryIds = new Set(categories.map(c => c.id));

        // Find activities with invalid category references
        const orphaned = activities.filter(activity => {
          if (activity.categoryId && !categoryIds.has(activity.categoryId)) {
            return true;
          }
          return false;
        });

        console.log(`✅ Found ${orphaned.length} orphaned activities`);
        return orphaned;
      } catch (error) {
        console.error('Failed to find orphaned activities:', error);
        return [];
      }
    });

    // Validate activities batch
    ipcMain.handle('validate-activities-batch', async (_, startDate: string, endDate: string) => {
      try {
        if (!this.dbManager || !this.activityValidationService) {
          console.error('❌ Services not initialized');
          return { valid: [], invalid: [] };
        }

        console.log(`🔍 Validating activities from ${startDate} to ${endDate}`);

        const activities = this.dbManager.getUnifiedActivities(startDate, endDate, undefined);
        const validationResults = await this.activityValidationService.validateBatch(activities);

        const valid: any[] = [];
        const invalid: any[] = [];

        Object.entries(validationResults).forEach(([id, result]) => {
          const activity = activities.find(a => a.id === parseInt(id));
          if (!activity) return;

          if (result.isValid) {
            if (result.warnings.length > 0) {
              valid.push({ activity, warnings: result.warnings });
            }
          } else {
            invalid.push({ activity, errors: result.errors, warnings: result.warnings });
          }
        });

        console.log(`✅ Validation complete: ${valid.length} valid, ${invalid.length} invalid`);
        return { valid, invalid };
      } catch (error) {
        console.error('Failed to validate activities batch:', error);
        return { valid: [], invalid: [] };
      }
    });

    // Recalculate activity durations
    ipcMain.handle('recalculate-activity-durations', async (_, startDate: string, endDate: string) => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return { success: false, recalculated: 0, errors: [] };
        }

        console.log(`🔄 Recalculating activity durations from ${startDate} to ${endDate}`);

        const activities = this.dbManager.getUnifiedActivities(startDate, endDate, undefined);
        let recalculated = 0;
        const errors: string[] = [];

        for (const activity of activities) {
          try {
            const start = new Date(activity.startTime).getTime();
            const end = new Date(activity.endTime).getTime();
            const calculatedDuration = Math.floor((end - start) / 1000);

            // Only update if there's a mismatch (more than 1 second tolerance)
            if (Math.abs(calculatedDuration - activity.duration) > 1) {
              const success = this.dbManager.updateUnifiedActivity({
                id: activity.id,
                sourceType: activity.sourceType,
                updates: { duration: calculatedDuration },
              });

              if (success) {
                recalculated++;
              } else {
                errors.push(`Failed to update activity ${activity.id} (${activity.sourceType})`);
              }
            }
          } catch (error) {
            errors.push(`Error processing activity ${activity.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        console.log(`✅ Recalculated ${recalculated} activity durations`);
        return { success: true, recalculated, errors };
      } catch (error) {
        console.error('Failed to recalculate activity durations:', error);
        return {
          success: false,
          recalculated: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        };
      }
    });

    // Find zero-duration activities
    ipcMain.handle('find-zero-duration-activities', async (_, startDate: string, endDate: string, removeIfConfirmed = false) => {
      try {
        if (!this.dbManager) {
          console.error('❌ Database manager not initialized');
          return { activities: [], removed: 0 };
        }

        console.log(`🔍 Finding zero-duration activities from ${startDate} to ${endDate}`);

        const activities = this.dbManager.getUnifiedActivities(startDate, endDate, undefined);
        const zeroDuration = activities.filter(a => a.duration === 0 || a.duration < 1);

        if (removeIfConfirmed && zeroDuration.length > 0) {
          console.log(`🗑️  Removing ${zeroDuration.length} zero-duration activities`);

          const activityIds = zeroDuration.map(a => ({ id: a.id, sourceType: a.sourceType }));
          const result = this.dbManager.bulkDeleteActivities(activityIds);

          return { activities: zeroDuration, removed: result.deleted };
        }

        console.log(`✅ Found ${zeroDuration.length} zero-duration activities`);
        return { activities: zeroDuration, removed: 0 };
      } catch (error) {
        console.error('Failed to find zero-duration activities:', error);
        return { activities: [], removed: 0 };
      }
    });

    // Get comprehensive data quality report
    ipcMain.handle('get-data-quality-report', async (_, startDate: string, endDate: string) => {
      try {
        if (!this.dbManager || !this.activityValidationService || !this.activityMergeService) {
          console.error('❌ Services not initialized');
          return {
            totalActivities: 0,
            validActivities: 0,
            invalidActivities: 0,
            warningsCount: 0,
            orphanedCount: 0,
            zeroDurationCount: 0,
            gapsCount: 0,
            duplicateGroupsCount: 0,
            qualityScore: 0,
          };
        }

        console.log(`📊 Generating data quality report from ${startDate} to ${endDate}`);

        const activities = this.dbManager.getUnifiedActivities(startDate, endDate, undefined);
        const validationResults = await this.activityValidationService.validateBatch(activities);

        let validCount = 0;
        let invalidCount = 0;
        let warningsCount = 0;

        Object.values(validationResults).forEach(result => {
          if (result.isValid) {
            validCount++;
            warningsCount += result.warnings.length;
          } else {
            invalidCount++;
          }
        });

        // Find orphaned activities
        const categories = await this.categoriesService?.getCategories() || [];
        const categoryIds = new Set(categories.map(c => c.id));
        const orphanedCount = activities.filter(a =>
          a.categoryId && !categoryIds.has(a.categoryId)
        ).length;

        // Find zero-duration activities
        const zeroDurationCount = activities.filter(a => a.duration === 0 || a.duration < 1).length;

        // Find gaps
        const gaps = this.activityMergeService.detectGaps(activities);
        const gapsCount = gaps.filter(g => g.duration >= 300).length; // 5 minutes minimum

        // Find duplicates
        const processedIds = new Set<string>();
        let duplicateGroupsCount = 0;

        for (const activity of activities) {
          const activityKey = `${activity.id}-${activity.sourceType}`;
          if (processedIds.has(activityKey)) continue;

          const duplicateResult = await this.activityValidationService.detectDuplicates(activity, activities);
          if (duplicateResult.isDuplicate && duplicateResult.similarity >= 80) {
            duplicateGroupsCount++;
            [activity, ...duplicateResult.duplicateActivities].forEach(a => {
              processedIds.add(`${a.id}-${a.sourceType}`);
            });
          }
        }

        // Calculate quality score (0-100)
        const totalIssues = invalidCount + orphanedCount + zeroDurationCount;
        const qualityScore = activities.length > 0
          ? Math.max(0, Math.round(100 - (totalIssues / activities.length) * 100))
          : 100;

        const report = {
          totalActivities: activities.length,
          validActivities: validCount,
          invalidActivities: invalidCount,
          warningsCount,
          orphanedCount,
          zeroDurationCount,
          gapsCount,
          duplicateGroupsCount,
          qualityScore,
        };

        console.log(`✅ Data quality report generated - Score: ${report.qualityScore}%`);
        return report;
      } catch (error) {
        console.error('Failed to generate data quality report:', error);
        return {
          totalActivities: 0,
          validActivities: 0,
          invalidActivities: 0,
          warningsCount: 0,
          orphanedCount: 0,
          zeroDurationCount: 0,
          gapsCount: 0,
          duplicateGroupsCount: 0,
          qualityScore: 0,
        };
      }
    });
  }

  // ==================== TRAY METHODS ====================

  private setupTray(): void {
    try {
      const settings = this.getSettings();

      // Always create tray if minimize to tray is enabled
      if (!settings.minimizeToTray) {
        return;
      }

      const iconPath = path.join(__dirname, '../../src/public/logo1.png');
      const icon = nativeImage.createFromPath(iconPath);

      // Resize icon for tray (16x16 for most platforms)
      const trayIcon = icon.resize({ width: 16, height: 16 });

      // Destroy previous tray instance if it exists
      if (this.tray) {
        this.tray.destroy();
        this.tray = null;
      }

      this.tray = new Tray(trayIcon);
      this.tray.setToolTip('Lume - Time Tracking');

      this.updateTrayMenu();

      // Show/hide window on tray icon click (platform specific)
      this.tray.on('click', () => {
        if (this.mainWindow?.isVisible()) {
          this.hideWindow();
        } else {
          this.showWindow();
        }
      });

      console.log('✅ System tray initialized');
    } catch (error) {
      console.error('Failed to setup tray:', error);
    }
  }

  private updateTrayMenu(): void {
    if (!this.tray) return;

    const isTracking = this.activityTracker?.isTracking() || false;
    const isVisible = this.mainWindow?.isVisible() || false;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: isVisible ? 'Hide Lume' : 'Show Lume',
        click: () => {
          if (isVisible) {
            this.hideWindow();
          } else {
            this.showWindow();
          }
        },
      },
      { type: 'separator' },
      {
        label: `Tracking: ${isTracking ? 'Active' : 'Stopped'}`,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          this.isQuitting = true;
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  private showWindow(): void {
    if (!this.mainWindow) {
      this.createWindow();
      return;
    }

    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore();
    }

    this.mainWindow.show();
    this.mainWindow.focus();

    // Update tray menu
    this.updateTrayMenu();

    // On macOS, show in dock
    if (process.platform === 'darwin' && app.dock) {
      app.dock.show();
    }
  }

  private hideWindow(): void {
    if (!this.mainWindow) return;

    this.mainWindow.hide();

    // Update tray menu
    this.updateTrayMenu();

    // On macOS, hide from dock when in tray mode
    if (process.platform === 'darwin' && app.dock) {
      const settings = this.getSettings();
      if (settings.minimizeToTray) {
        app.dock.hide();
      }
    }
  }

  private applyAutoStartSetting(): void {
    try {
      const settings = this.getSettings();
      if (settings.autoStartOnLogin !== undefined) {
        app.setLoginItemSettings({
          openAtLogin: settings.autoStartOnLogin,
          openAsHidden: false,
        });
        console.log(`✅ Auto-start setting applied: ${settings.autoStartOnLogin}`);
      }
    } catch (error) {
      console.error('Failed to apply auto-start setting:', error);
    }
  }
}

new LumeApp();