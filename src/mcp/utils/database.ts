/**
 * DEPRECATED: This file is no longer used.
 *
 * The MCP server now communicates with the Lume app via HTTP Bridge
 * instead of direct database access to prevent data corruption.
 *
 * All helper functions have been moved to httpClient.ts
 * - formatDuration()
 * - getTodayDate()
 * - getCurrentTimestamp()
 *
 * Database access is now handled exclusively by the Electron main process,
 * and the MCP server calls IPC handlers via HTTP to interact with data.
 *
 * See:
 * - src/mcp/utils/httpClient.ts - HTTP client for IPC communication
 * - src/main/ipc/HTTPBridge.ts - HTTP Bridge server
 */

export {};
