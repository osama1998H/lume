import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { isDev } from './utils';
import { DatabaseManager } from '../database/DatabaseManager';
import { ActivityTrackingService } from '../services/ActivityTrackingService';
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
          this.activityTracker.updateSettings(settings.activityTracking);
          this.activityTracker.start();
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
  }
}

new LumeApp();