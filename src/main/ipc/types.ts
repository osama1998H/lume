import { IpcMain, BrowserWindow } from 'electron';
import { DatabaseManager } from '../../database/DatabaseManager';
import { ActivityTrackingService } from '../../services/activity/ActivityTrackingService';
import { PomodoroService } from '../../services/pomodoro/PomodoroService';
import { NotificationService } from '../../services/notifications/NotificationService';
import { GoalsService } from '../../services/goals/GoalsService';
import { CategoriesService } from '../../services/categories/CategoriesService';
import { ActivityValidationService } from '../../services/activity/ActivityValidationService';
import { ActivityMergeService } from '../../services/activity/ActivityMergeService';
import { WindowManager } from '../core/WindowManager';
import { TrayManager } from '../core/TrayManager';
import { SettingsManager } from '../core/SettingsManager';
import { AutoLaunchManager } from '../core/AutoLaunchManager';

/**
 * Context containing all services and managers available to IPC handlers
 * This is injected into each handler group via dependency injection
 */
export interface IIPCHandlerContext {
  // Core managers
  windowManager: WindowManager;
  trayManager: TrayManager | null;
  settingsManager: SettingsManager;
  autoLaunchManager: AutoLaunchManager;

  // Database and services
  dbManager: DatabaseManager | null;
  activityTracker: ActivityTrackingService | null;
  pomodoroService: PomodoroService | null;
  notificationService: NotificationService | null;
  goalsService: GoalsService | null;
  categoriesService: CategoriesService | null;
  activityValidationService: ActivityValidationService | null;
  activityMergeService: ActivityMergeService | null;
}

/**
 * Interface that all IPC handler groups must implement
 * Each handler group is responsible for registering its own handlers
 */
export interface IIPCHandlerGroup {
  /**
   * Register all IPC handlers for this group
   * @param ipcMain - The IpcMain instance
   * @param context - The handler context with services/managers
   */
  register(ipcMain: IpcMain, context: IIPCHandlerContext): void;
}
