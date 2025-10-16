import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';

/**
 * Initialize database connection for MCP server
 * Connects to the same SQLite database used by the Electron app
 */
export function initializeDatabase(): Database.Database {
  // Determine database path based on platform
  let dbPath: string;

  if (process.platform === 'darwin') {
    // macOS: ~/Library/Application Support/Lume
    dbPath = path.join(os.homedir(), 'Library', 'Application Support', 'Lume', 'lume.db');
  } else if (process.platform === 'win32') {
    // Windows: %APPDATA%\Lume
    dbPath = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Lume', 'lume.db');
  } else {
    // Linux: $XDG_CONFIG_HOME/Lume or ~/.config/Lume
    const xdgConfig = process.env.XDG_CONFIG_HOME;
    const configHome = xdgConfig ? xdgConfig : path.join(os.homedir(), '.config');
    dbPath = path.join(configHome, 'Lume', 'lume.db');
  }

  console.error(`📁 Connecting to database at: ${dbPath}`);

  try {
    const db = new Database(dbPath, {
      readonly: false,
      fileMustExist: true, // Ensure database exists (app must be run at least once)
    });

    // Enable WAL mode for better concurrent access
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    console.error('✅ Database connection established');

    return db;
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    console.error('💡 Make sure the Lume app has been run at least once to create the database.');
    throw error;
  }
}

/**
 * Format duration in seconds to human-readable format
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]!;
}

/**
 * Get current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}
