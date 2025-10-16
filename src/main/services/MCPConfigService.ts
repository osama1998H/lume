import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import type { HTTPBridge } from '../ipc/HTTPBridge';
import type {
  MCPClient,
  MCPBridgeStatus,
  MCPConfigResult,
  MCPConfigFileInfo,
} from '../../types';

/**
 * Service for managing MCP client configurations
 * Handles auto-configuration of Claude Desktop, Claude Code, and Cursor
 */
export class MCPConfigService {
  private httpBridge: HTTPBridge;

  constructor(httpBridge: HTTPBridge) {
    this.httpBridge = httpBridge;
  }

  /**
   * Get absolute path to the MCP server executable
   */
  getMCPServerPath(): string {
    // In production, the app is packaged and we need to find the resources path
    if (app.isPackaged) {
      // In packaged app, MCP server is in extraResources (outside app.asar for Node.js accessibility)
      return path.join(process.resourcesPath, 'mcp', 'server.js');
    } else {
      // In development, use process.cwd() which is the project root directory
      // (app.getAppPath() returns dist/main when running electron dist/main/main.js)
      return path.join(process.cwd(), 'dist', 'mcp', 'server.js');
    }
  }

  /**
   * Get HTTP Bridge status and port
   */
  getHTTPBridgeStatus(): MCPBridgeStatus {
    const port = this.httpBridge.getPort();
    return {
      running: port > 0,
      port: port > 0 ? port : null,
    };
  }

  /**
   * Generate MCP configuration JSON for a specific client
   */
  generateConfigForClient(client: MCPClient): object {
    const serverPath = this.getMCPServerPath();

    switch (client) {
      case 'claude-desktop':
        return {
          mcpServers: {
            lume: {
              command: 'node',
              args: [serverPath],
            },
          },
        };

      case 'claude-code':
        return {
          mcpServers: {
            lume: {
              type: 'stdio',
              command: 'node',
              args: [serverPath],
            },
          },
        };

      case 'cursor':
        return {
          mcpServers: {
            lume: {
              command: 'node',
              args: [serverPath],
            },
          },
        };

      default:
        throw new Error(`Unknown MCP client: ${client}`);
    }
  }

  /**
   * Detect the config file path for a specific client
   */
  async detectConfigFilePath(client: MCPClient): Promise<string> {
    const homeDir = os.homedir();
    const platform = process.platform;

    switch (client) {
      case 'claude-desktop':
        if (platform === 'darwin') {
          return path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
        } else if (platform === 'linux') {
          return path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json');
        } else if (platform === 'win32') {
          return path.join(process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json');
        }
        throw new Error(`Unsupported platform for Claude Desktop: ${platform}`);

      case 'claude-code':
        return path.join(homeDir, '.claude.json');

      case 'cursor':
        if (platform === 'darwin') {
          return path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'mcp-config.json');
        } else if (platform === 'linux') {
          return path.join(homeDir, '.config', 'Cursor', 'User', 'globalStorage', 'mcp-config.json');
        } else if (platform === 'win32') {
          return path.join(process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), 'Cursor', 'User', 'globalStorage', 'mcp-config.json');
        }
        throw new Error(`Unsupported platform for Cursor: ${platform}`);

      default:
        throw new Error(`Unknown MCP client: ${client}`);
    }
  }

  /**
   * Check if a config file exists
   */
  async detectConfigFile(client: MCPClient): Promise<MCPConfigFileInfo> {
    try {
      const configPath = await this.detectConfigFilePath(client);
      const exists = await this.fileExists(configPath);
      return { exists, path: configPath };
    } catch (error) {
      console.error(`Failed to detect config file for ${client}:`, error);
      return { exists: false, path: '' };
    }
  }

  /**
   * Read config file content
   */
  private async readConfigFile(filePath: string): Promise<object | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // File doesn't exist or is invalid JSON
      return null;
    }
  }

  /**
   * Write config file content
   */
  private async writeConfigFile(filePath: string, config: object): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Write config file with pretty formatting
    await fs.writeFile(filePath, JSON.stringify(config, null, 2), 'utf-8');
  }

  /**
   * Create a backup of the config file
   */
  private async backupConfigFile(filePath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup-${timestamp}`;

    try {
      await fs.copyFile(filePath, backupPath);
      console.log(`✅ Created config backup: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('Failed to create config backup:', error);
      throw new Error('Failed to create backup file');
    }
  }

  /**
   * Check if a file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Merge Lume configuration into existing config
   */
  private mergeConfig(existingConfig: object | null, lumeConfig: object): object {
    if (!existingConfig) {
      return lumeConfig;
    }

    // Deep merge mcpServers section
    const merged = { ...existingConfig };
    const lumeConfigTyped = lumeConfig as { mcpServers: { lume: object } };
    const mergedTyped = merged as { mcpServers?: { [key: string]: object } };

    if (!mergedTyped.mcpServers) {
      mergedTyped.mcpServers = {};
    }

    // Add or update the lume server configuration
    mergedTyped.mcpServers.lume = lumeConfigTyped.mcpServers.lume;

    return merged;
  }

  /**
   * Auto-configure a specific MCP client
   */
  async autoConfigure(client: MCPClient): Promise<MCPConfigResult> {
    try {
      console.log(`🔧 Starting auto-configuration for ${client}...`);

      // Check if MCP server exists
      const serverPath = this.getMCPServerPath();
      const serverExists = await this.fileExists(serverPath);

      if (!serverExists) {
        return {
          success: false,
          message: 'MCP server not found. Please build the MCP server first using "npm run build:mcp".',
        };
      }

      // Get config file path
      const configPath = await this.detectConfigFilePath(client);
      console.log(`📁 Config file path: ${configPath}`);

      // Check if config file exists and backup if it does
      let backupPath: string | undefined;
      const configExists = await this.fileExists(configPath);

      if (configExists) {
        console.log('📋 Existing config found, creating backup...');
        backupPath = await this.backupConfigFile(configPath);
      }

      // Read existing config (if any)
      const existingConfig = await this.readConfigFile(configPath);

      // Generate Lume configuration
      const lumeConfig = this.generateConfigForClient(client);

      // Merge configurations
      const finalConfig = this.mergeConfig(existingConfig, lumeConfig);

      // Write config file
      await this.writeConfigFile(configPath, finalConfig);

      console.log(`✅ Successfully configured ${client}`);

      return {
        success: true,
        message: `Successfully configured ${client}. Please restart ${client} to apply changes.`,
        configPath,
        backupPath,
      };
    } catch (error) {
      console.error(`❌ Failed to auto-configure ${client}:`, error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        message: `Failed to configure ${client}: ${errorMessage}`,
      };
    }
  }

  /**
   * Get a user-friendly name for the client
   */
  getClientDisplayName(client: MCPClient): string {
    switch (client) {
      case 'claude-desktop':
        return 'Claude Desktop';
      case 'claude-code':
        return 'Claude Code';
      case 'cursor':
        return 'Cursor';
      default:
        return client;
    }
  }
}
