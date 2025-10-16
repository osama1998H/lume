// MCP Configuration Types
export type MCPClient = 'claude-desktop' | 'claude-code' | 'cursor';

export interface MCPBridgeStatus {
  running: boolean;
  port: number | null;
}

export interface MCPConfigResult {
  success: boolean;
  message: string;
  configPath?: string;
  backupPath?: string;
}

export interface MCPConfigFileInfo {
  exists: boolean;
  path: string;
}
