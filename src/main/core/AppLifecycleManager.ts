import { App } from 'electron';
import { getIconPath } from '../utils';
import { logger } from '@/services/logging/Logger';

/**
 * Lifecycle callbacks for the application
 */
export interface LifecycleCallbacks {
  onReady: () => void;
  onActivate: () => void;
  onWindowAllClosed: () => void;
  onBeforeQuit?: () => void;
}

/**
 * AppLifecycleManager - Central manager for Electron application lifecycle events
 *
 * Extracted from LumeApp during Phase 1-2 refactoring to separate concerns.
 * Centralizes all Electron app event handlers in one place, making it easier
 * to understand and test the application startup and shutdown flow.
 *
 * **Responsibilities**:
 * - Handle `ready` event: Initialize app after Electron is ready
 * - Handle `activate` event: Reopen window when dock icon clicked (macOS)
 * - Handle `window-all-closed` event: Decide whether to quit or stay in tray
 * - Handle `before-quit` event: Cleanup before application exits
 * - Set dock icon on macOS during startup
 *
 * **Event Flow**:
 * 1. `before-quit` (optional) - Cleanup flag setting
 * 2. `ready` → Set dock icon (macOS) → Call onReady callback
 * 3. `activate` - Show window when app icon clicked (macOS)
 * 4. `window-all-closed` - Quit or minimize to tray
 *
 * @example
 * ```typescript
 * const lifecycleManager = new AppLifecycleManager(app);
 *
 * lifecycleManager.setup({
 *   onReady: async () => {
 *     windowManager.createWindow();
 *     await setupServices();
 *     trayManager.setup();
 *   },
 *   onActivate: () => {
 *     if (!windowManager.getWindow()) {
 *       windowManager.createWindow();
 *     }
 *   },
 *   onWindowAllClosed: () => {
 *     if (process.platform !== 'darwin') {
 *       app.quit();
 *     }
 *   },
 *   onBeforeQuit: () => {
 *     windowManager.setQuitting(true);
 *   }
 * });
 * ```
 *
 * @see {@link LifecycleCallbacks} for callback interface
 */
export class AppLifecycleManager {
  constructor(private app: App) {}

  /**
   * Setup Electron application lifecycle event handlers
   *
   * Registers callbacks for key Electron app events:
   * - **ready**: Called when Electron finishes initialization
   * - **activate**: Called when dock icon clicked (macOS only)
   * - **window-all-closed**: Called when all windows are closed
   * - **before-quit** (optional): Called before app quits
   *
   * This method should be called once during application startup,
   * before `app.ready` event fires.
   *
   * @param callbacks - Lifecycle callback functions
   *
   * @example
   * ```typescript
   * lifecycleManager.setup({
   *   onReady: () => console.log('App ready!'),
   *   onActivate: () => window.show(),
   *   onWindowAllClosed: () => app.quit(),
   *   onBeforeQuit: () => cleanup()
   * });
   * ```
   *
   * @see {@link LifecycleCallbacks} for callback signatures
   */
  setup(callbacks: LifecycleCallbacks): void {
    // Handle before-quit event to set quitting flag
    // Extracted from main.ts:49-51
    if (callbacks.onBeforeQuit) {
      this.app.on('before-quit', callbacks.onBeforeQuit);
    }

    // Handle app ready event
    // Extracted from main.ts:53-75
    this.app.whenReady().then(() => {
      // Set dock icon on macOS
      // Extracted from main.ts:54-58
      if (process.platform === 'darwin' && this.app.dock) {
        try {
          const dockIconPath = getIconPath();
          this.app.dock.setIcon(dockIconPath);
        } catch (error) {
          logger.warn('⚠️  Failed to set dock icon', { error: String(error) });
          // Non-critical error - app can continue without dock icon
        }
      }

      // Call ready callback
      callbacks.onReady();

      // Handle activate event (macOS)
      // Extracted from main.ts:68-74
      this.app.on('activate', callbacks.onActivate);
    });

    // Handle window-all-closed event
    // Extracted from main.ts:77-83
    this.app.on('window-all-closed', callbacks.onWindowAllClosed);
  }
}
