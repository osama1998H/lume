import { IpcMain } from 'electron';
import { IIPCHandlerContext, IIPCHandlerGroup } from './types';

/**
 * IPCRouter - Central router for IPC handler registration
 *
 * Purpose:
 * - Manages registration of all IPC handler groups
 * - Injects context (services/managers) into handlers
 * - Provides centralized error handling and logging
 *
 * Usage:
 * ```typescript
 * const router = new IPCRouter(ipcMain, context);
 * router.register(new PomodoroTimerHandlers());
 * router.registerAll([
 *   new SettingsHandlers(),
 *   new GoalsHandlers(),
 *   // ... more handlers
 * ]);
 * ```
 */
export class IPCRouter {
  private registeredGroups: string[] = [];

  constructor(
    private ipcMain: IpcMain,
    private context: IIPCHandlerContext
  ) {}

  /**
   * Register a single IPC handler group
   * @param handlerGroup - The handler group to register
   */
  register(handlerGroup: IIPCHandlerGroup): void {
    const groupName = handlerGroup.constructor.name;

    if (this.registeredGroups.includes(groupName)) {
      console.warn(`⚠️  IPC handler group '${groupName}' already registered, skipping`);
      return;
    }

    try {
      handlerGroup.register(this.ipcMain, this.context);
      this.registeredGroups.push(groupName);
      console.log(`✅ Registered IPC handler group: ${groupName}`);
    } catch (error) {
      console.error(`❌ Failed to register IPC handler group '${groupName}':`, error);
      throw error;
    }
  }

  /**
   * Register multiple IPC handler groups at once
   * @param handlerGroups - Array of handler groups to register
   */
  registerAll(handlerGroups: IIPCHandlerGroup[]): void {
    console.log(`🔌 Registering ${handlerGroups.length} IPC handler groups...`);

    let successCount = 0;
    let failCount = 0;

    for (const handlerGroup of handlerGroups) {
      try {
        this.register(handlerGroup);
        successCount++;
      } catch (error) {
        failCount++;
        // Error already logged in register()
      }
    }

    console.log(
      `✅ IPC registration complete: ${successCount} succeeded, ${failCount} failed`
    );
  }

  /**
   * Get list of registered handler groups
   */
  getRegisteredGroups(): string[] {
    return [...this.registeredGroups];
  }

  /**
   * Clear all registered groups (useful for testing)
   */
  clear(): void {
    this.registeredGroups = [];
  }
}
