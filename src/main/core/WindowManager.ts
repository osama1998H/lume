import { BrowserWindow, app } from 'electron';
import * as path from 'path';
import { SettingsManager } from './SettingsManager';
import { isDev, getIconPath } from '../utils';

/**
 * WindowManager - Manages the main application window lifecycle
 *
 * Extracted from LumeApp during Phase 1-2 refactoring to separate concerns.
 * Centralizes all window-related operations including creation, showing, hiding,
 * and event handling for the main BrowserWindow.
 *
 * **Responsibilities**:
 * - Create and configure the main BrowserWindow
 * - Handle window show/hide operations
 * - Manage minimize-to-tray behavior
 * - Handle window close events
 * - Integrate with dock (macOS) and tray
 *
 * **Dependencies**:
 * - SettingsManager: For minimize-to-tray and other window preferences
 *
 * @example
 * ```typescript
 * const settingsManager = new SettingsManager();
 * const windowManager = new WindowManager(settingsManager);
 *
 * // Create and show the main window
 * const window = windowManager.createWindow();
 *
 * // Hide to tray (if enabled in settings)
 * windowManager.hideWindow();
 *
 * // Show and focus window
 * windowManager.showWindow();
 * ```
 *
 * @see {@link SettingsManager} for settings dependency
 * @see {@link TrayManager} for tray integration
 */
export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private isQuitting = false;

  constructor(private settingsManager: SettingsManager) {}

  /**
   * Create and configure the main application window
   *
   * Creates a new BrowserWindow with preconfigured settings including:
   * - Window dimensions and constraints
   * - Icon path (platform-specific)
   * - Security settings (contextIsolation, nodeIntegration)
   * - Preload script for IPC communication
   * - Development/production URL loading
   *
   * The window is created hidden and will show after `ready-to-show` event.
   * Close behavior depends on `minimizeToTray` setting.
   *
   * @returns The created BrowserWindow instance
   *
   * @throws {Error} If icon or preload script paths are invalid
   *
   * @example
   * ```typescript
   * const window = windowManager.createWindow();
   * // Window loads http://localhost:5173 in dev
   * // or dist/renderer/index.html in production
   * ```
   *
   * @see {@link showWindow} to display the window
   * @see {@link hideWindow} to hide the window
   */
  createWindow(): BrowserWindow {
    // Set icon path based on platform
    // Extracted from main.ts:87-88
    const iconPath = getIconPath();

    // Create BrowserWindow with configuration
    // Extracted from main.ts:90-103
    this.mainWindow = new BrowserWindow({
      width: 1600,
      height: 1000,
      minWidth: 800,
      minHeight: 600,
      icon: iconPath,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '..', 'preload.js'),
      },
      titleBarStyle: 'hiddenInset',
      show: false,
    });

    // Load URL based on environment
    // Extracted from main.ts:105-112
    const isDevelopment = isDev();

    if (isDevelopment) {
      this.mainWindow.loadURL('http://localhost:5173');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    // Show window when ready
    // Extracted from main.ts:114-116
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    // Handle window close event for tray mode
    // Extracted from main.ts:118-125
    this.mainWindow.on('close', (event) => {
      const settings = this.settingsManager.getSettings();
      if (!this.isQuitting && settings.minimizeToTray) {
        event.preventDefault();
        this.hideWindow();
      }
    });

    // Handle window closed event
    // Extracted from main.ts:127-129
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    return this.mainWindow;
  }

  /**
   * Show and focus the main application window
   *
   * If window doesn't exist, creates a new one.
   * If window is minimized, restores it first.
   * On macOS, shows the app icon in the dock.
   *
   * This is the primary method to bring the application to the foreground,
   * typically called from tray menu or when app is activated.
   *
   * @example
   * ```typescript
   * // Show window from tray click
   * tray.on('click', () => {
   *   windowManager.showWindow();
   * });
   * ```
   *
   * @see {@link hideWindow} to hide the window
   * @see {@link isVisible} to check visibility state
   */
  showWindow(): void {
    if (!this.mainWindow) {
      this.createWindow();
      return;
    }

    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore();
    }

    this.mainWindow.show();
    this.mainWindow.focus();

    // On macOS, show in dock
    if (process.platform === 'darwin' && app.dock) {
      app.dock.show();
    }
  }

  /**
   * Hide the main application window
   *
   * Hides the window from view without closing it.
   * On macOS, also hides from dock if `minimizeToTray` setting is enabled.
   *
   * Used when user closes window with minimize-to-tray enabled,
   * or when explicitly hiding to tray from UI.
   *
   * @example
   * ```typescript
   * // Handle window close with minimize to tray
   * window.on('close', (event) => {
   *   if (settings.minimizeToTray) {
   *     event.preventDefault();
   *     windowManager.hideWindow();
   *   }
   * });
   * ```
   *
   * @see {@link showWindow} to show the window again
   * @see {@link setQuitting} to control tray behavior
   */
  hideWindow(): void {
    if (!this.mainWindow) return;

    this.mainWindow.hide();

    // On macOS, hide from dock when in tray mode
    if (process.platform === 'darwin' && app.dock) {
      const settings = this.settingsManager.getSettings();
      if (settings.minimizeToTray) {
        app.dock.hide();
      }
    }
  }

  /**
   * Get the main window instance
   *
   * @returns The BrowserWindow instance if created, null otherwise
   *
   * @example
   * ```typescript
   * const window = windowManager.getWindow();
   * if (window) {
   *   window.webContents.send('update-data', data);
   * }
   * ```
   */
  getWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  /**
   * Set the quitting flag to control close behavior
   *
   * When `true`, window close will actually quit the app.
   * When `false`, window close will minimize to tray (if enabled in settings).
   *
   * Typically set to `true` during app shutdown (before-quit event).
   *
   * @param value - Whether the app is quitting
   *
   * @example
   * ```typescript
   * app.on('before-quit', () => {
   *   windowManager.setQuitting(true);
   * });
   * ```
   */
  setQuitting(value: boolean): void {
    this.isQuitting = value;
  }

  /**
   * Check if the main window is currently visible
   *
   * @returns `true` if window exists and is visible, `false` otherwise
   *
   * @example
   * ```typescript
   * if (!windowManager.isVisible()) {
   *   windowManager.showWindow();
   * }
   * ```
   */
  isVisible(): boolean {
    return this.mainWindow?.isVisible() || false;
  }

  /**
   * Check if the main window is currently minimized
   *
   * @returns `true` if window exists and is minimized, `false` otherwise
   *
   * @example
   * ```typescript
   * if (windowManager.isMinimized()) {
   *   window.restore();
   * }
   * ```
   */
  isMinimized(): boolean {
    return this.mainWindow?.isMinimized() || false;
  }
}
