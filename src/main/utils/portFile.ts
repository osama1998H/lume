/**
 * Port File Utility
 *
 * Manages the HTTP Bridge port file that allows external processes
 * (like the MCP server) to discover the bridge port.
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

/**
 * Get the path to the port file
 */
export function getPortFilePath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'bridge-port.txt');
}

/**
 * Write the port to the port file
 */
export function writePortFile(port: number): void {
  try {
    const portFilePath = getPortFilePath();
    fs.writeFileSync(portFilePath, port.toString(), 'utf8');
    console.log(`📝 Wrote bridge port ${port} to ${portFilePath}`);
  } catch (error) {
    console.error('❌ Failed to write port file:', error);
  }
}

/**
 * Delete the port file
 */
export function deletePortFile(): void {
  try {
    const portFilePath = getPortFilePath();
    if (fs.existsSync(portFilePath)) {
      fs.unlinkSync(portFilePath);
      console.log('🗑️  Deleted bridge port file');
    }
  } catch (error) {
    console.error('❌ Failed to delete port file:', error);
  }
}

/**
 * Read the port from the port file
 */
export function readPortFile(): number | null {
  try {
    const portFilePath = getPortFilePath();
    if (!fs.existsSync(portFilePath)) {
      return null;
    }
    const content = fs.readFileSync(portFilePath, 'utf8');
    const port = parseInt(content.trim(), 10);
    return isNaN(port) ? null : port;
  } catch (error) {
    console.error('❌ Failed to read port file:', error);
    return null;
  }
}
