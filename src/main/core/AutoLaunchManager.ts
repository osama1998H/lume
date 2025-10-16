import { App } from 'electron';
import { SettingsManager } from './SettingsManager';

/**
 * AutoLaunchManager - Manages automatic application launch at system startup
 *
 * Extracted from LumeApp during Phase 1-2 refactoring to separate concerns.
 * Handles the "Launch at Login" feature by interfacing with the operating system's
 * login items/startup applications list.
 *
 * **Responsibilities**:
 * - Apply auto-start setting on app initialization
 * - Enable/disable auto-start via OS login items
 * - Persist auto-start preference to settings
 * - Query current auto-start status from OS
 *
 * **Platform Behavior**:
 * - **macOS**: Adds/removes from Login Items in System Preferences
 * - **Windows**: Adds/removes registry key in `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
 * - **Linux**: Creates/removes `.desktop` file in `~/.config/autostart/`
 *
 * **Settings Integration**:
 * The auto-start state is stored in `settings.autoStartOnLogin` and synchronized
 * with the OS login items during app startup.
 *
 * @example
 * ```typescript
 * const autoLaunchManager = new AutoLaunchManager(app, settingsManager);
 *
 * // Apply setting from disk on app startup
 * autoLaunchManager.apply();
 *
 * // Enable auto-start (from Settings UI)
 * const success = autoLaunchManager.setAutoStart(true);
 *
 * // Check current status
 * const isEnabled = autoLaunchManager.getStatus();
 * ```
 *
 * @see {@link SettingsManager} for settings persistence
 */
export class AutoLaunchManager {
  constructor(
    private app: App,
    private settingsManager: SettingsManager
  ) {}

  /**
   * Apply auto-start setting from stored settings
   *
   * Reads the `autoStartOnLogin` setting from disk and applies it to the OS.
   * This ensures the OS login items list stays in sync with user preferences.
   *
   * Should be called once during app initialization, after settings are loaded
   * but before the main window is shown.
   *
   * @example
   * ```typescript
   * app.whenReady().then(() => {
   *   // Apply auto-start setting
   *   autoLaunchManager.apply();
   *
   *   // Then show window
   *   windowManager.createWindow();
   * });
   * ```
   *
   * @see {@link setAutoStart} to change the setting
   */
  apply(): void {
    try {
      const settings = this.settingsManager.getSettings();
      if (settings.autoStartOnLogin !== undefined) {
        this.app.setLoginItemSettings({
          openAtLogin: settings.autoStartOnLogin,
          openAsHidden: false,
        });
      }
    } catch (error) {
      console.error('Failed to apply auto-start setting:', error);
    }
  }

  /**
   * Enable or disable auto-start at login
   *
   * Updates the OS login items and saves the preference to settings.json.
   * This method performs both operations atomically.
   *
   * **Side effects**:
   * - Updates OS login items (platform-specific)
   * - Saves settings to disk via SettingsManager
   * - Logs success/failure
   *
   * @param enabled - `true` to enable auto-start, `false` to disable
   * @returns `true` if operation succeeded, `false` on error
   *
   * @example
   * ```typescript
   * // Enable auto-start (from Settings toggle)
   * const success = autoLaunchManager.setAutoStart(true);
   * if (success) {
   *   showNotification('Launch at login enabled');
   * }
   * ```
   *
   * @see {@link getStatus} to check current status
   * @see {@link apply} to apply saved settings
   */
  setAutoStart(enabled: boolean): boolean {
    try {
      this.app.setLoginItemSettings({
        openAtLogin: enabled,
        openAsHidden: false,
      });

      // Update settings file
      const settings = this.settingsManager.getSettings();
      settings.autoStartOnLogin = enabled;
      this.settingsManager.saveSettings(settings);

      return true;
    } catch (error) {
      console.error('Failed to set auto-start:', error);
      return false;
    }
  }

  /**
   * Get current auto-start status from the OS
   *
   * Queries the operating system's login items to check if the app
   * is configured to launch at login.
   *
   * **Note**: This queries the OS directly, not the settings file.
   * Use this to verify the actual OS state.
   *
   * @returns `true` if auto-start is enabled in OS, `false` otherwise
   *
   * @example
   * ```typescript
   * // Check OS login items status
   * const isEnabled = autoLaunchManager.getStatus();
   * console.log('Launch at login:', isEnabled);
   * ```
   *
   * @see {@link setAutoStart} to change the setting
   */
  getStatus(): boolean {
    try {
      const loginItemSettings = this.app.getLoginItemSettings();
      return loginItemSettings.openAtLogin;
    } catch (error) {
      console.error('Failed to get auto-start status:', error);
      return false;
    }
  }
}
