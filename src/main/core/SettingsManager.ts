import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

/**
 * Settings structure for the application
 */
export interface Settings {
  autoTrackApps: boolean;
  showNotifications: boolean;
  minimizeToTray: boolean;
  autoStartOnLogin: boolean;
  autoStartTracking: boolean;
  defaultCategory: number | null;
  activityTracking?: {
    enabled: boolean;
    idleThresholdMinutes?: number;
    checkIntervalSeconds?: number;
    [key: string]: any;
  };
  pomodoro?: {
    focusDuration: number;
    shortBreakDuration: number;
    longBreakDuration: number;
    longBreakInterval: number;
    autoStartBreaks: boolean;
    autoStartFocus: boolean;
    soundEnabled: boolean;
    notificationsEnabled: boolean;
    dailyGoal: number;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * SettingsManager - Persistent storage for application settings
 *
 * Extracted from LumeApp during Phase 1-2 refactoring to separate concerns.
 * Manages reading and writing settings to a JSON file in the user data directory.
 * Provides default values when settings file doesn't exist or is corrupted.
 *
 * **Responsibilities**:
 * - Load settings from disk (settings.json)
 * - Save settings to disk with proper formatting
 * - Provide sensible defaults for first-time users
 * - Handle file I/O errors gracefully
 *
 * **Settings Structure**:
 * ```typescript
 * {
 *   autoTrackApps: boolean,
 *   showNotifications: boolean,
 *   minimizeToTray: boolean,
 *   autoStartOnLogin: boolean,
 *   autoStartTracking: boolean,
 *   defaultCategory: number | null,
 *   activityTracking?: { enabled, idleThresholdMinutes, etc },
 *   pomodoro?: { focusDuration, breakDuration, etc }
 * }
 * ```
 *
 * **File Location**: `<userData>/settings.json`
 * - macOS: `~/Library/Application Support/Electron/settings.json`
 * - Windows: `%APPDATA%/Electron/settings.json`
 * - Linux: `~/.config/Electron/settings.json`
 *
 * @example
 * ```typescript
 * const settingsManager = new SettingsManager();
 *
 * // Load settings (returns defaults if file doesn't exist)
 * const settings = settingsManager.getSettings();
 *
 * // Modify and save
 * settings.minimizeToTray = true;
 * settingsManager.saveSettings(settings);
 * ```
 *
 * @see {@link Settings} for the settings interface
 */
export class SettingsManager {
  private settingsPath: string;

  constructor(userDataPath?: string) {
    const dataPath = userDataPath || app.getPath('userData');
    this.settingsPath = path.join(dataPath, 'settings.json');
  }

  /**
   * Load application settings from disk
   *
   * Reads settings from `settings.json` in the user data directory.
   * If the file doesn't exist or is corrupted, returns default settings.
   *
   * **Default Settings**:
   * - autoTrackApps: true
   * - showNotifications: true
   * - minimizeToTray: false
   * - autoStartOnLogin: false
   * - autoStartTracking: false
   * - defaultCategory: null
   *
   * @returns Settings object (either from disk or defaults)
   *
   * @example
   * ```typescript
   * const settings = settingsManager.getSettings();
   * if (settings.minimizeToTray) {
   *   trayManager.setup();
   * }
   * ```
   *
   * @see {@link saveSettings} to persist changes
   */
  getSettings(): Settings {
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

  /**
   * Save application settings to disk
   *
   * Writes settings to `settings.json` in the user data directory.
   * The file is formatted with 2-space indentation for readability.
   *
   * @param settings - Settings object to save
   * @returns `true` if save succeeded, `false` if an error occurred
   *
   * @example
   * ```typescript
   * const settings = settingsManager.getSettings();
   * settings.autoStartOnLogin = true;
   * const success = settingsManager.saveSettings(settings);
   * ```
   *
   * @see {@link getSettings} to load settings
   */
  saveSettings(settings: Settings): boolean {
    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }

  /**
   * Get the absolute path to the settings file
   *
   * @returns Absolute file path to settings.json
   *
   * @example
   * ```typescript
   * const path = settingsManager.getSettingsPath();
   * console.log('Settings stored at:', path);
   * // macOS: /Users/username/Library/Application Support/Electron/settings.json
   * ```
   */
  getSettingsPath(): string {
    return this.settingsPath;
  }
}
