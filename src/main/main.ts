import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { isDev } from './utils';
import { DatabaseManager } from '../database/DatabaseManager';
import { ActivityTrackingService } from '../services/ActivityTrackingService';

import * as Sentry from "@sentry/electron";

Sentry.init({
  dsn: "https://e54520cf320b22f34f68ff237ed902d1@o4510136801034240.ingest.de.sentry.io/4510136803590224",
});

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
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
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
      console.log('Database initialized successfully');

      // Initialize activity tracking service
      this.activityTracker = new ActivityTrackingService(this.dbManager);
      console.log('Activity tracking service initialized');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      // Continue without database for now
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
        const success = this.saveSettings(settings);

        // Update activity tracking settings if present
        if (success && this.activityTracker && settings.activityTracking) {
          this.activityTracker.updateSettings(settings.activityTracking);
        }

        return success;
      } catch (error) {
        console.error('Failed to save settings:', error);
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
  }
}

new LumeApp();