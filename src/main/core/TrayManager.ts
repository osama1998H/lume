import { Tray, Menu, nativeImage, app } from 'electron';
import { WindowManager } from './WindowManager';
import { SettingsManager } from './SettingsManager';
import { getIconPath } from '../utils';

/**
 * Interface for activity tracker (optional dependency)
 */
export interface ActivityTracker {
  isTracking(): boolean;
}

/**
 * TrayManager - Manages the system tray icon and context menu
 *
 * Extracted from LumeApp during Phase 1-2 refactoring to separate concerns.
 * Provides system tray integration for quick access to the application,
 * showing/hiding the main window, and displaying tracking status.
 *
 * **Responsibilities**:
 * - Create and manage system tray icon
 * - Build and update context menu based on app state
 * - Handle tray icon click events
 * - Display tracking status in menu
 * - Provide quick quit option
 *
 * **Dependencies**:
 * - WindowManager: For show/hide operations
 * - SettingsManager: For minimize-to-tray preference
 * - ActivityTracker (optional): For displaying tracking status
 *
 * **Platform Behavior**:
 * - macOS: Tray icon in menu bar, click to toggle window
 * - Windows: Tray icon in system tray, right-click for menu
 * - Linux: Tray icon in system tray (X11 required)
 *
 * @example
 * ```typescript
 * const trayManager = new TrayManager(
 *   windowManager,
 *   settingsManager,
 *   activityTracker
 * );
 *
 * // Setup tray (only if minimizeToTray is enabled)
 * trayManager.setup();
 *
 * // Update menu when tracking status changes
 * trayManager.updateMenu();
 *
 * // Cleanup on app quit
 * trayManager.destroy();
 * ```
 *
 * @see {@link WindowManager} for window operations
 * @see {@link SettingsManager} for tray preferences
 */
export class TrayManager {
  private tray: Tray | null = null;

  constructor(
    private windowManager: WindowManager,
    private settingsManager: SettingsManager,
    private activityTracker?: ActivityTracker
  ) {}

  /**
   * Setup system tray icon and context menu
   *
   * Creates the tray icon only if `minimizeToTray` setting is enabled.
   * Loads and resizes the app icon for tray display (16x16 pixels).
   * Sets up click handler to toggle window visibility.
   *
   * If tray setup fails (icon loading, etc.), logs a warning and continues
   * without tray functionality.
   *
   * @example
   * ```typescript
   * // Usually called after services are initialized
   * trayManager.setup();
   * ```
   *
   * @see {@link updateMenu} to refresh the menu
   * @see {@link destroy} to remove the tray
   */
  setup(): void {
    try {
      const settings = this.settingsManager.getSettings();

      // Always create tray if minimize to tray is enabled
      // Extracted from main.ts:1979-1982
      if (!settings.minimizeToTray) {
        return;
      }

      // Load and resize icon
      // Extracted from main.ts:1984-1989
      const iconPath = getIconPath();
      const icon = nativeImage.createFromPath(iconPath);

      // Validate icon loaded successfully
      if (icon.isEmpty()) {
        console.warn(`⚠️  Failed to load tray icon from: ${iconPath}`);
        return;
      }

      // Resize icon for tray (16x16 for most platforms)
      const trayIcon = icon.resize({ width: 16, height: 16 });

      // Destroy previous tray instance if it exists
      // Extracted from main.ts:1991-1994
      if (this.tray) {
        this.tray.destroy();
        this.tray = null;
      }

      // Create tray instance
      // Extracted from main.ts:1996-1997
      this.tray = new Tray(trayIcon);
      this.tray.setToolTip('Lume - Time Tracking');

      // Update menu
      this.updateMenu();

      // Show/hide window on tray icon click (platform specific)
      // Extracted from main.ts:2002-2008
      this.tray.on('click', () => {
        if (this.windowManager.isVisible()) {
          this.windowManager.hideWindow();
        } else {
          this.windowManager.showWindow();
        }
      });

      console.log('✅ System tray initialized');
    } catch (error) {
      console.error('Failed to setup tray:', error);
    }
  }

  /**
   * Update the tray context menu with current app state
   *
   * Rebuilds the context menu to reflect current state:
   * - Show/Hide label based on window visibility
   * - Tracking status (Active/Stopped)
   * - Quit option
   *
   * Should be called whenever app state changes that affects the menu
   * (window visibility, tracking status, etc.).
   *
   * @example
   * ```typescript
   * // Update menu when tracking starts/stops
   * activityTracker.on('status-change', () => {
   *   trayManager.updateMenu();
   * });
   * ```
   *
   * @see {@link setup} to initialize the tray
   */
  updateMenu(): void {
    if (!this.tray) return;

    const isTracking = this.activityTracker?.isTracking() || false;
    const isVisible = this.windowManager.isVisible();

    // Build context menu
    // Extracted from main.ts:2022-2046
    const contextMenu = Menu.buildFromTemplate([
      {
        label: isVisible ? 'Hide Lume' : 'Show Lume',
        click: () => {
          if (isVisible) {
            this.windowManager.hideWindow();
          } else {
            this.windowManager.showWindow();
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
          this.windowManager.setQuitting(true);
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  /**
   * Destroy and remove the tray icon
   *
   * Cleans up the tray icon and frees resources.
   * Should be called on app shutdown or when disabling tray.
   *
   * @example
   * ```typescript
   * app.on('before-quit', () => {
   *   trayManager.destroy();
   * });
   * ```
   */
  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
      console.log('✅ System tray removed');
    }
  }

  /**
   * Get the native Tray instance
   *
   * @returns The Electron Tray instance if active, null otherwise
   *
   * @example
   * ```typescript
   * const tray = trayManager.getTray();
   * if (tray) {
   *   tray.setImage(newIcon);
   * }
   * ```
   */
  getTray(): Tray | null {
    return this.tray;
  }

  /**
   * Check if the tray icon is currently active
   *
   * @returns `true` if tray has been setup and not destroyed, `false` otherwise
   *
   * @example
   * ```typescript
   * if (trayManager.isActive()) {
   *   trayManager.updateMenu();
   * }
   * ```
   */
  isActive(): boolean {
    return this.tray !== null;
  }
}
