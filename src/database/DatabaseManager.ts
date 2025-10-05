import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';
import { ActivitySession } from '../types/activity';

export interface TimeEntry {
  id?: number;
  task: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  category?: string;
  createdAt?: string;
}

export interface AppUsage {
  id?: number;
  appName: string;
  windowTitle?: string;
  category?: string;
  domain?: string;
  url?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  isBrowser?: boolean;
  isIdle?: boolean;
  createdAt?: string;
}

export class DatabaseManager {
  private db: Database.Database | null = null;

  constructor() {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'lume.db');
    this.db = new Database(dbPath);
  }

  initialize(): void {
    if (!this.db) {
      console.error('❌ Database instance is null, cannot initialize');
      return;
    }

    console.log('🗄️  Initializing database tables...');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration INTEGER,
        category TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_name TEXT NOT NULL,
        window_title TEXT,
        category TEXT DEFAULT 'application',
        domain TEXT,
        url TEXT,
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration INTEGER,
        is_browser BOOLEAN DEFAULT 0,
        is_idle BOOLEAN DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing columns to existing table if they don't exist
    try {
      this.db.exec(`ALTER TABLE app_usage ADD COLUMN category TEXT DEFAULT 'application'`);
    } catch (_error) {
      // Column already exists, ignore
    }

    try {
      this.db.exec(`ALTER TABLE app_usage ADD COLUMN domain TEXT`);
    } catch (_error) {
      // Column already exists, ignore
    }

    try {
      this.db.exec(`ALTER TABLE app_usage ADD COLUMN url TEXT`);
    } catch (_error) {
      // Column already exists, ignore
    }

    try {
      this.db.exec(`ALTER TABLE app_usage ADD COLUMN is_browser BOOLEAN DEFAULT 0`);
    } catch (_error) {
      // Column already exists, ignore
    }

    try {
      this.db.exec(`ALTER TABLE app_usage ADD COLUMN is_idle BOOLEAN DEFAULT 0`);
    } catch (_error) {
      // Column already exists, ignore
    }

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON time_entries(start_time);
      CREATE INDEX IF NOT EXISTS idx_app_usage_start_time ON app_usage(start_time);
      CREATE INDEX IF NOT EXISTS idx_app_usage_app_name ON app_usage(app_name);
      CREATE INDEX IF NOT EXISTS idx_app_usage_category ON app_usage(category);
      CREATE INDEX IF NOT EXISTS idx_app_usage_domain ON app_usage(domain);
      CREATE INDEX IF NOT EXISTS idx_app_usage_is_browser ON app_usage(is_browser);
    `);
  }

  addTimeEntry(entry: TimeEntry): number {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO time_entries (task, start_time, end_time, duration, category)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      entry.task,
      entry.startTime,
      entry.endTime || null,
      entry.duration || null,
      entry.category || null
    );

    return result.lastInsertRowid as number;
  }

  getTimeEntries(limit = 100): TimeEntry[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT * FROM time_entries
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit);
    return rows.map(row => this.mapTimeEntryRow(row));
  }

  addAppUsage(usage: AppUsage): number {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO app_usage (app_name, window_title, start_time, end_time, duration)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      usage.appName,
      usage.windowTitle || null,
      usage.startTime,
      usage.endTime || null,
      usage.duration || null
    );

    return result.lastInsertRowid as number;
  }

  getAppUsage(limit = 100): AppUsage[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT * FROM app_usage
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit);
    return rows.map(row => this.mapAppUsageRow(row));
  }

  getAppUsageByDateRange(startDate: string, endDate: string): AppUsage[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT * FROM app_usage
      WHERE DATE(start_time) BETWEEN ? AND ?
      ORDER BY start_time DESC
    `);

    const rows = stmt.all(startDate, endDate);
    return rows.map(row => this.mapAppUsageRow(row));
  }

  // Activity tracking methods
  addActivitySession(session: ActivitySession): number {
    if (!this.db) throw new Error('Database not initialized');

    console.log(`💾 DB: Inserting activity session - ${session.app_name} (${session.category})`);

    const stmt = this.db.prepare(`
      INSERT INTO app_usage (
        app_name, window_title, category, domain, url,
        start_time, end_time, duration, is_browser, is_idle
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      session.app_name,
      session.window_title || null,
      session.category,
      session.domain || null,
      session.url || null,
      session.start_time,
      session.end_time || null,
      session.duration || null,
      session.is_browser ? 1 : 0,
      0  // is_idle: false = 0
    );

    console.log(`✅ DB: Session saved with ID: ${result.lastInsertRowid}`);
    return result.lastInsertRowid as number;
  }

  updateActivitySession(id: number, endTime: string, duration: number): boolean {
    if (!this.db) return false;

    const stmt = this.db.prepare(`
      UPDATE app_usage
      SET end_time = ?, duration = ?
      WHERE id = ?
    `);

    const result = stmt.run(endTime, duration, id);
    return result.changes > 0;
  }

  getActivitySessions(limit = 100): ActivitySession[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT
        id, app_name, window_title, category, domain, url,
        start_time, end_time, duration, is_browser, created_at
      FROM app_usage
      ORDER BY created_at DESC
      LIMIT ?
    `);

    return stmt.all(limit) as ActivitySession[];
  }

  getActivityByCategory(category: 'application' | 'website', limit = 50): ActivitySession[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT
        id, app_name, window_title, category, domain, url,
        start_time, end_time, duration, is_browser, created_at
      FROM app_usage
      WHERE category = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    return stmt.all(category, limit) as ActivitySession[];
  }

  getTopApplications(limit = 10): Array<{name: string, totalDuration: number}> {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT
        app_name as name,
        SUM(duration) as totalDuration
      FROM app_usage
      WHERE category = 'application' AND duration IS NOT NULL
      GROUP BY app_name
      ORDER BY totalDuration DESC
      LIMIT ?
    `);

    return stmt.all(limit) as Array<{name: string, totalDuration: number}>;
  }

  getTopWebsites(limit = 10): Array<{domain: string, totalDuration: number}> {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT
        domain,
        SUM(duration) as totalDuration
      FROM app_usage
      WHERE category = 'website' AND domain IS NOT NULL AND duration IS NOT NULL
      GROUP BY domain
      ORDER BY totalDuration DESC
      LIMIT ?
    `);

    return stmt.all(limit) as Array<{domain: string, totalDuration: number}>;
  }

  private mapTimeEntryRow(row: any): TimeEntry {
    const duration = row.duration;
    const startTime = row.start_time;
    const endTime = row.end_time;

    let durationMinutes: number | undefined;

    if (duration != null) {
      const numericDuration = typeof duration === 'number' ? duration : Number(duration);
      durationMinutes = Number.isFinite(numericDuration) ? numericDuration : undefined;
    }

    if ((durationMinutes == null || Number.isNaN(durationMinutes)) && startTime && endTime) {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
        durationMinutes = Math.max(1, Math.round((end - start) / 60000));
      }
    }

    return {
      id: row.id,
      task: row.task,
      startTime: row.start_time,
      endTime: row.end_time ?? undefined,
      duration: durationMinutes,
      category: row.category ?? undefined,
      createdAt: row.created_at ?? undefined,
    };
  }

  private mapAppUsageRow(row: any): AppUsage {
    const isBrowser = row.is_browser;
    const isIdle = row.is_idle;
    const duration = row.duration;
    const startTime = row.start_time;
    const endTime = row.end_time;

    let durationSeconds: number | undefined;

    if (duration != null) {
      const numericDuration = typeof duration === 'number' ? duration : Number(duration);
      durationSeconds = Number.isFinite(numericDuration) ? numericDuration : undefined;
    }

    if ((durationSeconds == null || Number.isNaN(durationSeconds)) && startTime && endTime) {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
        durationSeconds = Math.max(1, Math.round((end - start) / 1000));
      }
    }

    return {
      id: row.id,
      appName: row.app_name,
      windowTitle: row.window_title ?? undefined,
      category: row.category ?? undefined,
      domain: row.domain ?? undefined,
      url: row.url ?? undefined,
      startTime: row.start_time,
      endTime: row.end_time ?? undefined,
      duration: durationSeconds,
      isBrowser: isBrowser == null ? undefined : (typeof isBrowser === 'number' ? isBrowser === 1 : Boolean(isBrowser)),
      isIdle: isIdle == null ? undefined : (typeof isIdle === 'number' ? isIdle === 1 : Boolean(isIdle)),
      createdAt: row.created_at ?? undefined,
    };
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
