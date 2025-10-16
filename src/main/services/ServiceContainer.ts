import { DatabaseManager } from '../../database/DatabaseManager';
import { ActivityTrackingService } from '../../services/activity/ActivityTrackingService';
import { PomodoroService } from '../../services/pomodoro/PomodoroService';
import { NotificationService } from '../../services/notifications/NotificationService';
import { GoalsService } from '../../services/goals/GoalsService';
import { CategoriesService } from '../../services/categories/CategoriesService';
import { ActivityValidationService } from '../../services/activity/ActivityValidationService';
import { ActivityMergeService } from '../../services/activity/ActivityMergeService';
import { Settings } from '../core/SettingsManager';

/**
 * ServiceContainer - Manages service lifecycle and dependency injection
 *
 * Phase 3 Refactoring:
 * - Centralizes service instantiation logic
 * - Handles dependency resolution automatically
 * - Improves testability through dependency injection
 * - Provides clean service access interface
 *
 * Service Dependency Graph:
 * DatabaseManager (root)
 * ├── NotificationService (depends on settings)
 * ├── CategoriesService
 * ├── ActivityValidationService
 * │   └── ActivityMergeService
 * ├── GoalsService (depends on NotificationService)
 * ├── ActivityTrackingService (depends on GoalsService)
 * └── PomodoroService (depends on NotificationService)
 */
export class ServiceContainer {
  // Service instances (lazy-initialized)
  private dbManager: DatabaseManager | null = null;
  private notificationService: NotificationService | null = null;
  private goalsService: GoalsService | null = null;
  private categoriesService: CategoriesService | null = null;
  private activityValidationService: ActivityValidationService | null = null;
  private activityMergeService: ActivityMergeService | null = null;
  private activityTracker: ActivityTrackingService | null = null;
  private pomodoroService: PomodoroService | null = null;

  // Initialization state
  private initialized: boolean = false;
  private userDataPath: string | null = null;
  private settings: Settings | null = null;

  /**
   * Initialize all services in correct dependency order
   *
   * Initializes 8 services following their dependency graph:
   * 1. DatabaseManager (root dependency)
   * 2. NotificationService (depends on settings)
   * 3. CategoriesService (depends on database)
   * 4. ActivityValidationService (depends on database)
   * 5. ActivityMergeService (depends on database + validation)
   * 6. GoalsService (depends on database + notifications)
   * 7. ActivityTrackingService (depends on database + goals)
   * 8. PomodoroService (depends on database + notifications)
   *
   * **IMPORTANT**: Call this only once during app startup, before setting up IPC handlers.
   * Calling multiple times will log a warning and return early.
   *
   * @param userDataPath - Absolute path to user data directory for database (e.g., app.getPath('userData'))
   * @param settings - Application settings loaded from SettingsManager
   *
   * @throws {Error} If any service fails to initialize
   *
   * @example
   * ```typescript
   * const container = new ServiceContainer();
   * await container.initialize(
   *   app.getPath('userData'),
   *   settingsManager.getSettings()
   * );
   *
   * // Now services are ready for IPC handlers
   * const db = container.getDatabaseManager();
   * ```
   *
   * @see {@link cleanup} for shutdown/cleanup
   */
  async initialize(userDataPath: string, settings: Settings): Promise<void> {
    if (this.initialized) {
      console.warn('⚠️  ServiceContainer already initialized');
      return;
    }

    this.userDataPath = userDataPath;
    this.settings = settings;


    try {
      // Step 1: Initialize database manager (root dependency)
      await this.initializeDatabaseManager();

      // Step 2: Initialize notification service (depends on settings)
      this.initializeNotificationService();

      // Step 3: Initialize categories service (depends on database)
      await this.initializeCategoriesService();

      // Step 4: Initialize activity validation service (depends on database)
      this.initializeActivityValidationService();

      // Step 5: Initialize activity merge service (depends on database + validation)
      this.initializeActivityMergeService();

      // Step 6: Initialize goals service (depends on database + notifications)
      this.initializeGoalsService();

      // Step 7: Initialize activity tracking service (depends on database + goals)
      this.initializeActivityTrackingService();

      // Step 8: Initialize pomodoro service (depends on database + notifications)
      this.initializePomodoroService();

      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize ServiceContainer:', error);
      throw error;
    }
  }

  /**
   * Initialize database manager
   */
  private async initializeDatabaseManager(): Promise<void> {
    if (!this.userDataPath) {
      throw new Error('User data path not set');
    }

    try {
      this.dbManager = new DatabaseManager();
      this.dbManager.initialize(this.userDataPath);
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Initialize notification service
   */
  private initializeNotificationService(): void {
    if (!this.settings) {
      throw new Error('Settings not provided');
    }

    try {
      const pomodoroSettings = this.settings.pomodoro;
      this.notificationService = new NotificationService(
        pomodoroSettings?.soundEnabled !== false,
        pomodoroSettings?.notificationsEnabled !== false
      );
    } catch (error) {
      console.error('❌ Failed to initialize notification service:', error);
      throw error;
    }
  }

  /**
   * Initialize categories service
   */
  private async initializeCategoriesService(): Promise<void> {
    if (!this.dbManager) {
      throw new Error('Database manager not initialized');
    }

    try {
      this.categoriesService = new CategoriesService(this.dbManager);

      // Initialize default categories for first-run users (async, non-blocking)
      this.categoriesService.initializeDefaultCategories().then(() => {
      }).catch((error) => {
        console.error('⚠️ Failed to initialize default categories:', error);
      });
    } catch (error) {
      console.error('❌ Failed to initialize categories service:', error);
      throw error;
    }
  }

  /**
   * Initialize activity validation service
   */
  private initializeActivityValidationService(): void {
    if (!this.dbManager) {
      throw new Error('Database manager not initialized');
    }

    try {
      this.activityValidationService = new ActivityValidationService(this.dbManager);
    } catch (error) {
      console.error('❌ Failed to initialize activity validation service:', error);
      throw error;
    }
  }

  /**
   * Initialize activity merge service
   */
  private initializeActivityMergeService(): void {
    if (!this.dbManager || !this.activityValidationService) {
      throw new Error('Required dependencies not initialized');
    }

    try {
      this.activityMergeService = new ActivityMergeService(
        this.dbManager,
        this.activityValidationService
      );
    } catch (error) {
      console.error('❌ Failed to initialize activity merge service:', error);
      throw error;
    }
  }

  /**
   * Initialize goals service
   */
  private initializeGoalsService(): void {
    if (!this.dbManager) {
      throw new Error('Database manager not initialized');
    }

    try {
      this.goalsService = new GoalsService(this.dbManager, this.notificationService || undefined);
    } catch (error) {
      console.error('❌ Failed to initialize goals service:', error);
      throw error;
    }
  }

  /**
   * Initialize activity tracking service
   */
  private initializeActivityTrackingService(): void {
    if (!this.dbManager) {
      throw new Error('Database manager not initialized');
    }

    try {
      this.activityTracker = new ActivityTrackingService(
        this.dbManager,
        this.goalsService || undefined
      );
    } catch (error) {
      console.error('❌ Failed to initialize activity tracking service:', error);
      throw error;
    }
  }

  /**
   * Initialize pomodoro service
   */
  private initializePomodoroService(): void {
    if (!this.dbManager || !this.notificationService) {
      throw new Error('Required dependencies not initialized');
    }

    if (!this.settings) {
      throw new Error('Settings not provided');
    }

    try {
      const pomodoroSettings = this.settings.pomodoro;
      this.pomodoroService = new PomodoroService(
        this.dbManager,
        this.notificationService,
        pomodoroSettings
      );
    } catch (error) {
      console.error('❌ Failed to initialize pomodoro service:', error);
      throw error;
    }
  }

  /**
   * Clean up all services and release resources
   *
   * Performs graceful shutdown of all services:
   * 1. Stops activity tracking if running
   * 2. Destroys pomodoro service (timers, etc.)
   * 3. Clears all service references
   * 4. Resets initialization state
   *
   * Should be called on app shutdown (before-quit event).
   *
   * @throws {Error} If cleanup fails for any service
   *
   * @example
   * ```typescript
   * app.on('before-quit', async () => {
   *   await serviceContainer.cleanup();
   * });
   * ```
   *
   * @see {@link initialize} for startup
   */
  async cleanup(): Promise<void> {

    try {
      // Stop activity tracking if running
      if (this.activityTracker?.isTracking()) {
        await this.activityTracker.stop();
      }

      // Cleanup pomodoro service
      if (this.pomodoroService) {
        this.pomodoroService.destroy();
      }

      // Clear service instances
      this.activityTracker = null;
      this.pomodoroService = null;
      this.goalsService = null;
      this.categoriesService = null;
      this.activityValidationService = null;
      this.activityMergeService = null;
      this.notificationService = null;
      this.dbManager = null;

      this.initialized = false;
      this.userDataPath = null;
      this.settings = null;

    } catch (error) {
      console.error('❌ Failed to cleanup ServiceContainer:', error);
      throw error;
    }
  }

  /**
   * Check if the container has been initialized
   *
   * @returns `true` if {@link initialize} has been called and succeeded, `false` otherwise
   *
   * @example
   * ```typescript
   * if (!serviceContainer.isInitialized()) {
   *   await serviceContainer.initialize(userDataPath, settings);
   * }
   * ```
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  // ========================================
  // Service Getters
  // ========================================
  // All getters return null if container not initialized
  // Use isInitialized() to check before accessing services

  /**
   * Get the DatabaseManager instance
   *
   * @returns DatabaseManager if initialized, null otherwise
   * @example
   * ```typescript
   * const db = container.getDatabaseManager();
   * if (db) {
   *   const categories = db.getAllCategories();
   * }
   * ```
   */
  getDatabaseManager(): DatabaseManager | null {
    return this.dbManager;
  }

  /**
   * Get the NotificationService instance
   *
   * Used for showing system notifications (goals, pomodoro, etc.)
   *
   * @returns NotificationService if initialized, null otherwise
   */
  getNotificationService(): NotificationService | null {
    return this.notificationService;
  }

  /**
   * Get the GoalsService instance
   *
   * Handles productivity goals and progress tracking.
   *
   * @returns GoalsService if initialized, null otherwise
   */
  getGoalsService(): GoalsService | null {
    return this.goalsService;
  }

  /**
   * Get the CategoriesService instance
   *
   * Manages activity categories and default categories.
   *
   * @returns CategoriesService if initialized, null otherwise
   */
  getCategoriesService(): CategoriesService | null {
    return this.categoriesService;
  }

  /**
   * Get the ActivityValidationService instance
   *
   * Validates activity data for quality and consistency.
   *
   * @returns ActivityValidationService if initialized, null otherwise
   */
  getActivityValidationService(): ActivityValidationService | null {
    return this.activityValidationService;
  }

  /**
   * Get the ActivityMergeService instance
   *
   * Handles merging and deduplication of activities.
   *
   * @returns ActivityMergeService if initialized, null otherwise
   */
  getActivityMergeService(): ActivityMergeService | null {
    return this.activityMergeService;
  }

  /**
   * Get the ActivityTrackingService instance
   *
   * Core service for automatic activity tracking.
   *
   * @returns ActivityTrackingService if initialized, null otherwise
   * @example
   * ```typescript
   * const tracker = container.getActivityTrackingService();
   * if (tracker) {
   *   tracker.start();
   * }
   * ```
   */
  getActivityTrackingService(): ActivityTrackingService | null {
    return this.activityTracker;
  }

  /**
   * Get the PomodoroService instance
   *
   * Manages pomodoro timer, sessions, and statistics.
   *
   * @returns PomodoroService if initialized, null otherwise
   */
  getPomodoroService(): PomodoroService | null {
    return this.pomodoroService;
  }
}
