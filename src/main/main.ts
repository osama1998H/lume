import { app, ipcMain, BrowserWindow } from 'electron';
import * as dotenv from 'dotenv';
import { initializeSentry } from '../config/sentry';
import { initializeCrashReporter } from '../config/crashReporter';
import { writePortFile, deletePortFile } from './utils/portFile';

// Import core managers
import { WindowManager } from './core/WindowManager';
import { TrayManager } from './core/TrayManager';
import { SettingsManager } from './core/SettingsManager';
import { AppLifecycleManager } from './core/AppLifecycleManager';
import { AutoLaunchManager } from './core/AutoLaunchManager';

// Import service container (Phase 3 refactoring)
import { ServiceContainer } from './services/ServiceContainer';

// Import IPC router, HTTP bridge, and handlers
import { IPCRouter } from './ipc/IPCRouter';
import { HTTPBridge } from './ipc/HTTPBridge';
import { IIPCHandlerContext } from './ipc/types';
import { PomodoroTimerHandlers } from './ipc/handlers/PomodoroTimerHandlers';
import { TimeEntryHandlers } from './ipc/handlers/TimeEntryHandlers';
import { AppUsageHandlers } from './ipc/handlers/AppUsageHandlers';
import { SettingsHandlers } from './ipc/handlers/SettingsHandlers';
import { CategoriesHandlers } from './ipc/handlers/CategoriesHandlers';
import { TagsHandlers } from './ipc/handlers/TagsHandlers';
import { ActivityTrackingHandlers } from './ipc/handlers/ActivityTrackingHandlers';
import { PomodoroSettingsHandlers } from './ipc/handlers/PomodoroSettingsHandlers';
import { PomodoroSessionHandlers } from './ipc/handlers/PomodoroSessionHandlers';
import { GoalsHandlers } from './ipc/handlers/GoalsHandlers';
import { TodosHandlers } from './ipc/handlers/TodosHandlers';
import { AutoStartHandlers } from './ipc/handlers/AutoStartHandlers';
import { CategoryMappingsHandlers } from './ipc/handlers/CategoryMappingsHandlers';
import { TagAssociationsHandlers } from './ipc/handlers/TagAssociationsHandlers';
import { StatisticsHandlers } from './ipc/handlers/StatisticsHandlers';
import { TimelineHandlers } from './ipc/handlers/TimelineHandlers';
import { AnalyticsHandlers } from './ipc/handlers/AnalyticsHandlers';
import { CrashReporterHandlers } from './ipc/handlers/CrashReporterHandlers';
import { DataManagementHandlers } from './ipc/handlers/DataManagementHandlers';
import { UnifiedActivityHandlers } from './ipc/handlers/UnifiedActivityHandlers';
import { DataQualityHandlers } from './ipc/handlers/DataQualityHandlers';
import { MCPConfigHandlers } from './ipc/handlers/MCPConfigHandlers';
import { MCPConfigService } from './services/MCPConfigService';

// Load environment variables
dotenv.config();

// Initialize crash reporting (must be done early, before app is ready)
initializeCrashReporter();

// Initialize Sentry for error tracking
initializeSentry();

/**
 * LumeApp - Main application class (refactored for v3)
 *
 * Architecture changes:
 * - Window management delegated to WindowManager
 * - System tray delegated to TrayManager
 * - Settings management delegated to SettingsManager
 * - App lifecycle delegated to AppLifecycleManager
 * - Auto-start delegated to AutoLaunchManager
 * - Service lifecycle delegated to ServiceContainer (Phase 3)
 *
 * This refactoring reduces main.ts from 2106 lines to ~220 lines
 * and improves testability and maintainability.
 */
class LumeApp {
  // Core managers
  private windowManager: WindowManager;
  private trayManager: TrayManager | null = null;
  private settingsManager: SettingsManager;
  private lifecycleManager: AppLifecycleManager;
  private autoLaunchManager: AutoLaunchManager;

  // Service container (Phase 3 refactoring)
  private serviceContainer: ServiceContainer | null = null;

  // HTTP Bridge for MCP server integration
  private httpBridge: HTTPBridge | null = null;
  private mcpConfigService: MCPConfigService | null = null;

  constructor() {
    // Initialize managers
    this.settingsManager = new SettingsManager();
    this.windowManager = new WindowManager(this.settingsManager);
    this.lifecycleManager = new AppLifecycleManager(app);
    this.autoLaunchManager = new AutoLaunchManager(app, this.settingsManager);

    this.setupApp();
  }

  private setupApp(): void {
    // Setup app lifecycle using AppLifecycleManager
    this.lifecycleManager.setup({
      onBeforeQuit: async () => {
        this.windowManager.setQuitting(true);

        // Stop HTTP Bridge and clean up port file
        if (this.httpBridge) {
          await this.httpBridge.stop();
          deletePortFile();
          console.log('🌉 HTTP Bridge stopped');
        }
      },
      onReady: async () => {
        this.windowManager.createWindow();
        await this.setupServices();
        await this.setupIPC();

        // Apply auto-start setting
        this.autoLaunchManager.apply();
      },
      onActivate: () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.windowManager.createWindow();
        } else if (this.windowManager.getWindow()) {
          this.windowManager.showWindow();
        }
      },
      onWindowAllClosed: () => {
        const settings = this.settingsManager.getSettings();
        // Only quit if not using minimize to tray or on macOS
        if (!settings.minimizeToTray && process.platform !== 'darwin') {
          app.quit();
        }
      },
    });
  }

  private async setupServices(): Promise<void> {
    try {
      // Initialize service container with user data path and settings
      this.serviceContainer = new ServiceContainer();
      await this.serviceContainer.initialize(
        app.getPath('userData'),
        this.settingsManager.getSettings()
      );

      // Initialize TrayManager after services are created
      const activityTracker = this.serviceContainer.getActivityTrackingService();
      this.trayManager = new TrayManager(
        this.windowManager,
        this.settingsManager,
        activityTracker || undefined
      );
      this.trayManager.setup();

      // Auto-start tracking if enabled in settings
      this.autoStartTracking();
    } catch (error) {
      console.error('❌ Failed to initialize services:', error);
      // Continue without services for now
    }
  }

  private autoStartTracking(): void {
    try {
      const settings = this.settingsManager.getSettings();
      console.log('📋 Loaded settings:', JSON.stringify(settings, null, 2));

      if (settings.activityTracking?.enabled) {
        console.log('🚀 Auto-starting activity tracking (enabled in settings)');
        const activityTracker = this.serviceContainer?.getActivityTrackingService();
        if (activityTracker) {
          // updateSettings will automatically start tracking if enabled and not already running
          activityTracker.updateSettings(settings.activityTracking);
          console.log('✅ Activity tracking auto-started successfully');
        }
      } else {
        console.log('ℹ️  Activity tracking disabled in settings - not auto-starting');
      }
    } catch (error) {
      console.error('❌ Failed to auto-start activity tracking:', error);
    }
  }

  private async setupIPC(): Promise<void> {
    // Create context for IPC handlers (will be updated with httpBridge and mcpConfigService)
    const context: IIPCHandlerContext = {
      windowManager: this.windowManager,
      trayManager: this.trayManager,
      settingsManager: this.settingsManager,
      autoLaunchManager: this.autoLaunchManager,
      // Get services from container (Phase 3 refactoring)
      dbManager: this.serviceContainer?.getDatabaseManager() ?? null,
      activityTracker: this.serviceContainer?.getActivityTrackingService() ?? null,
      pomodoroService: this.serviceContainer?.getPomodoroService() ?? null,
      notificationService: this.serviceContainer?.getNotificationService() ?? null,
      goalsService: this.serviceContainer?.getGoalsService() ?? null,
      categoriesService: this.serviceContainer?.getCategoriesService() ?? null,
      activityValidationService: this.serviceContainer?.getActivityValidationService() ?? null,
      activityMergeService: this.serviceContainer?.getActivityMergeService() ?? null,
      // MCP Integration (initialized below)
      httpBridge: null,
      mcpConfigService: null,
    };

    // Initialize HTTP Bridge for MCP server integration
    this.httpBridge = new HTTPBridge(context);
    try {
      console.log('🔄 Initializing HTTP Bridge for MCP integration...');
      const port = await this.httpBridge.start(0); // Use port 0 for random available port
      console.log(`🌉 HTTP Bridge started on port ${port} for MCP integration`);

      // Store port in environment for MCP server to access
      process.env.LUME_IPC_BRIDGE_PORT = port.toString();

      // Write port to file for external processes (like MCP server)
      writePortFile(port);
      console.log(`📝 Port file written to user data directory`);

      // Initialize MCP Config Service now that HTTP Bridge is running
      this.mcpConfigService = new MCPConfigService(this.httpBridge);
      console.log('🔧 MCP Config Service initialized');

      // Update context with MCP services
      context.httpBridge = this.httpBridge;
      context.mcpConfigService = this.mcpConfigService;
      console.log('✅ MCP integration setup complete');
    } catch (error) {
      console.error('❌ Failed to start HTTP Bridge - MCP integration unavailable');
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        console.error('Stack trace:', error.stack);
      }
      console.error('⚠️  Lume will continue without MCP support');
      this.httpBridge = null;
      this.mcpConfigService = null;
    }

    // Initialize IPC router with HTTP Bridge
    const router = new IPCRouter(ipcMain, context, this.httpBridge ?? undefined);

    // Register handler groups (Phase 2 refactoring)
    router.registerAll([
      // POC
      new PomodoroTimerHandlers(),
      // Batch 1: Simple CRUD operations
      new TimeEntryHandlers(),
      new AppUsageHandlers(),
      new SettingsHandlers(),
      new CategoriesHandlers(),
      new TagsHandlers(),
      // Batch 2: Service-based operations
      new ActivityTrackingHandlers(),
      new PomodoroSettingsHandlers(),
      new PomodoroSessionHandlers(),
      new GoalsHandlers(),
      new TodosHandlers(),
      new AutoStartHandlers(),
      // Batch 3: Complex query operations
      new CategoryMappingsHandlers(),
      new TagAssociationsHandlers(),
      new StatisticsHandlers(),
      new TimelineHandlers(),
      new AnalyticsHandlers(),
      // Batch 4: Data management and quality operations
      new CrashReporterHandlers(),
      new DataManagementHandlers(),
      new UnifiedActivityHandlers(),
      new DataQualityHandlers(),
      // Batch 5: MCP Integration
      new MCPConfigHandlers(),
    ]);
  }
}

new LumeApp();