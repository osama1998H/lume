import { IpcMain } from 'electron';
import { IIPCHandlerContext, IIPCHandlerGroup } from './types';
import { HTTPBridge } from './HTTPBridge';

/**
 * IPCRouter - Central router for IPC handler registration
 *
 * Purpose:
 * - Manages registration of all IPC handler groups
 * - Injects context (services/managers) into handlers
 * - Provides centralized error handling and logging
 * - Optionally registers handlers with HTTP Bridge for external access
 *
 * Usage:
 * ```typescript
 * const router = new IPCRouter(ipcMain, context, httpBridge);
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
  private httpHandlers: Map<string, (args: any) => Promise<any>> = new Map();

  constructor(
    private ipcMain: IpcMain,
    private context: IIPCHandlerContext,
    private httpBridge?: HTTPBridge
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
      // If HTTP Bridge is provided, wrap ipcMain.handle to also register with HTTP Bridge
      const originalHandle = this.ipcMain.handle.bind(this.ipcMain);

      if (this.httpBridge) {
        // Wrap ipcMain.handle to intercept handler registration
        this.ipcMain.handle = ((channel: string, listener: any) => {
          // Register with original ipcMain
          originalHandle(channel, listener);

          // Also register with HTTP Bridge
          // The listener signature is (event, ...args) but we only need the args for HTTP
          const httpHandler = async (args: any) => {
            // Call the original listener, but pass null as event since HTTP doesn't have it
            return await listener(null, ...Object.values(args));
          };

          this.httpHandlers.set(channel, httpHandler);
          this.httpBridge!.registerHandler(channel, httpHandler);

          // Return void to match IpcMain.handle signature
          return;
        }) as any;
      }

      // Register the handler group (which will call ipcMain.handle)
      handlerGroup.register(this.ipcMain, this.context);

      // Restore original handle function
      if (this.httpBridge) {
        this.ipcMain.handle = originalHandle;
      }

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
