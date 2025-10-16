import { IpcMain, clipboard } from 'electron';
import { IIPCHandlerGroup, IIPCHandlerContext } from '../types';
import type { MCPClient } from '@/types';
import { logger } from '@/services/logging/Logger';

/**
 * IPC Handlers for MCP Configuration
 * Provides auto-configuration capabilities for Claude Desktop, Claude Code, and Cursor
 */
export class MCPConfigHandlers implements IIPCHandlerGroup {
  register(ipcMain: IpcMain, context: IIPCHandlerContext): void {
    /**
     * Get HTTP Bridge status and port
     */
    ipcMain.handle('mcp-get-bridge-status', async (_event) => {
      try {
        if (!context.mcpConfigService) {
          return { running: false, port: null };
        }

        const status = context.mcpConfigService.getHTTPBridgeStatus();
        return status;
      } catch (error) {
        logger.error('Failed to get bridge status:', {}, error instanceof Error ? error : undefined);
        return { running: false, port: null };
      }
    });

    /**
     * Get absolute path to MCP server
     */
    ipcMain.handle('mcp-get-server-path', async (_event) => {
      try {
        if (!context.mcpConfigService) {
          throw new Error('MCP Config Service not available');
        }

        const serverPath = context.mcpConfigService.getMCPServerPath();
        return serverPath;
      } catch (error) {
        logger.error('Failed to get MCP server path:', {}, error instanceof Error ? error : undefined);
        throw error;
      }
    });

    /**
     * Generate configuration JSON for a specific client
     */
    ipcMain.handle('mcp-generate-config', async (_event, client: MCPClient) => {
      try {
        if (!context.mcpConfigService) {
          throw new Error('MCP Config Service not available');
        }

        const config = context.mcpConfigService.generateConfigForClient(client);
        const configJson = JSON.stringify(config, null, 2);

        return configJson;
      } catch (error) {
        logger.error(`Failed to generate config for ${client}`, {}, error instanceof Error ? error : undefined);
        throw error;
      }
    });

    /**
     * Auto-configure a specific MCP client
     */
    ipcMain.handle('mcp-auto-configure', async (_event, client: MCPClient) => {
      try {
        if (!context.mcpConfigService) {
          throw new Error('MCP Config Service not available');
        }

        const result = await context.mcpConfigService.autoConfigure(client);

        if (!result.success) {
          logger.error(`❌ Failed to configure ${client}`, { message: result.message });
        }

        return result;
      } catch (error) {
        logger.error(`❌ Failed to auto-configure ${client}`, {}, error instanceof Error ? error : undefined);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return {
          success: false,
          message: `Failed to configure ${client}: ${errorMessage}`,
        };
      }
    });

    /**
     * Detect if config file exists for a client
     */
    ipcMain.handle('mcp-detect-config-file', async (_event, client: MCPClient) => {
      try {
        if (!context.mcpConfigService) {
          throw new Error('MCP Config Service not available');
        }

        const fileInfo = await context.mcpConfigService.detectConfigFile(client);
        return fileInfo;
      } catch (error) {
        logger.error(`Failed to detect config file for ${client}`, {}, error instanceof Error ? error : undefined);
        return { exists: false, path: '' };
      }
    });

    /**
     * Copy text to clipboard
     */
    ipcMain.handle('mcp-copy-to-clipboard', async (_event, text: string) => {
      try {
        clipboard.writeText(text);
        return true;
      } catch (error) {
        logger.error('Failed to copy to clipboard:', {}, error instanceof Error ? error : undefined);
        return false;
      }
    });

    /**
     * Get user-friendly display name for client
     */
    ipcMain.handle('mcp-get-client-display-name', async (_event, client: MCPClient) => {
      try {
        if (!context.mcpConfigService) {
          return client;
        }

        return context.mcpConfigService.getClientDisplayName(client);
      } catch (error) {
        logger.error(`Failed to get display name for ${client}`, {}, error instanceof Error ? error : undefined);
        return client;
      }
    });

  }
}
