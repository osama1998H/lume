import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { isDev } from './utils';
import { DatabaseManager } from '../database/DatabaseManager';
import { ActivityTrackingService } from '../services/ActivityTrackingService';
import { PomodoroService } from '../services/PomodoroService';
import { NotificationService } from '../services/NotificationService';
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
  private dbManager: DatabaseManager | null = null;
  private activityTracker: ActivityTrackingService | null = null;
  private pomodoroService: PomodoroService | null = null;
  private notificationService: NotificationService | null = null;
  private settingsPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.settingsPath = path.join(userDataPath, 'settings.json');
    this.setupApp();
  }

  private setupApp(): void {
    app.whenReady().then(() => {
      // Set dock icon on macOS
      if (process.platform === 'darwin' && app.dock) {
        const dockIconPath = path.join(__dirname, '../../src/public/logo1.png');
        app.dock.setIcon(dockIconPath);
      }

      this.createWindow();
      this.setupDatabase();
      this.setupIPC();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }

  private createWindow(): void {
    // Set icon path based on platform
    const iconPath = path.join(__dirname, '../../src/public/logo1.png');

    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
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

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupDatabase(): void {
    try {
      this.dbManager = new DatabaseManager();
      this.dbManager.initialize();
      console.log('✅ Database initialized successfully');

      // Initialize activity tracking service
      this.activityTracker = new ActivityTrackingService(this.dbManager);
      console.log('✅ Activity tracking service initialized');

      // Initialize notification service
      const pomodoroSettings = this.getSettings().pomodoro;
      this.notificationService = new NotificationService(
        pomodoroSettings?.soundEnabled !== false,
        pomodoroSettings?.notificationsEnabled !== false
      );
      console.log('✅ Notification service initialized');

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
      autoStartTracking: false,
      defaultCategory: '',
      trackingInterval: 30,
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
    ipcMain.handle('get-time-entries', async () => {
      try {
        return this.dbManager?.getTimeEntries() || [];
      } catch (error) {
        console.error('Failed to get time entries:', error);
        return [];
      }
    });

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

    ipcMain.handle('get-app-usage', async () => {
      try {
        return this.dbManager?.getAppUsage() || [];
      } catch (error) {
        console.error('Failed to get app usage:', error);
        return [];
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
        const success = this.saveSettings(settings);

        // Update activity tracking settings if present
        if (success && this.activityTracker && settings.activityTracking) {
          console.log('🔄 Updating activity tracker with new settings');
          this.activityTracker.updateSettings(settings.activityTracking);

          const isTracking = this.activityTracker.isTracking();
          console.log(`📊 Activity tracking status after settings update: ${isTracking ? 'ACTIVE' : 'STOPPED'}`);
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
        return this.saveSettings(settings);
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

    ipcMain.handle('get-pomodoro-sessions', async (_, limit = 100) => {
      try {
        return this.dbManager?.getPomodoroSessions(limit) || [];
      } catch (error) {
        console.error('Failed to get pomodoro sessions:', error);
        return [];
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
  }
}

new LumeApp();