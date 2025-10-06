import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';
import { ActivitySession } from '../types/activity';
import { TimeEntry, AppUsage, PomodoroSession, PomodoroStats } from '../types';

export class DatabaseManager {
  private db: Database.Database | null = null;

  constructor(customDbPath?: string) {
    let dbPath: string;
    if (customDbPath) {
      dbPath = customDbPath;
    } else {
      const userDataPath = app.getPath('userData');
      dbPath = path.join(userDataPath, 'lume.db');
    }
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

    // Pomodoro sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pomodoro_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task TEXT NOT NULL,
        session_type TEXT NOT NULL CHECK(session_type IN ('focus', 'shortBreak', 'longBreak')),
        duration INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        completed BOOLEAN DEFAULT 0,
        interrupted BOOLEAN DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_start_time ON pomodoro_sessions(start_time);
      CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_session_type ON pomodoro_sessions(session_type);
      CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_completed ON pomodoro_sessions(completed);
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
      SELECT
        id,
        task,
        start_time AS startTime,
        end_time AS endTime,
        duration,
        category,
        created_at AS createdAt
      FROM time_entries
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const results = stmt.all(limit) as TimeEntry[];
    console.log('📊 DB getTimeEntries returned:', results.length, 'entries');
    if (results.length > 0) {
      console.log('📊 Sample entry:', results[0]);
    }
    return results;
  }

  updateTimeEntry(id: number, updates: Partial<TimeEntry>): boolean {
    if (!this.db) throw new Error('Database not initialized');

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.task !== undefined) {
      fields.push('task = ?');
      values.push(updates.task);
    }
    if (updates.endTime !== undefined) {
      fields.push('end_time = ?');
      values.push(updates.endTime);
    }
    if (updates.duration !== undefined) {
      fields.push('duration = ?');
      values.push(updates.duration);
    }
    if (updates.category !== undefined) {
      fields.push('category = ?');
      values.push(updates.category);
    }

    if (fields.length === 0) {
      return false; // No updates to perform
    }

    values.push(id); // Add id for WHERE clause

    const stmt = this.db.prepare(`
      UPDATE time_entries
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0;
  }

  getActiveTimeEntry(): TimeEntry | null {
    if (!this.db) return null;

    const stmt = this.db.prepare(`
      SELECT
        id,
        task,
        start_time AS startTime,
        end_time AS endTime,
        duration,
        category,
        created_at AS createdAt
      FROM time_entries
      WHERE end_time IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const result = stmt.get() as TimeEntry | undefined;
    return result || null;
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
      SELECT
        id,
        app_name AS appName,
        window_title AS windowTitle,
        category,
        domain,
        url,
        start_time AS startTime,
        end_time AS endTime,
        duration,
        is_browser AS isBrowser,
        is_idle AS isIdle,
        created_at AS createdAt
      FROM app_usage
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const results = stmt.all(limit) as AppUsage[];
    console.log('📊 DB getAppUsage returned:', results.length, 'entries');
    if (results.length > 0) {
      console.log('📊 Sample app usage:', results[0]);
    }
    return results;
  }

  getAppUsageByDateRange(startDate: string, endDate: string): AppUsage[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT
        id,
        app_name AS appName,
        window_title AS windowTitle,
        category,
        domain,
        url,
        start_time AS startTime,
        end_time AS endTime,
        duration,
        is_browser AS isBrowser,
        is_idle AS isIdle,
        created_at AS createdAt
      FROM app_usage
      WHERE DATE(start_time) BETWEEN ? AND ?
      ORDER BY start_time DESC
    `);

    return stmt.all(startDate, endDate) as AppUsage[];
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

  // Pomodoro methods
  addPomodoroSession(session: PomodoroSession): number {
    if (!this.db) throw new Error('Database not initialized');

    console.log(`💾 DB: Inserting pomodoro session - ${session.task} (${session.sessionType})`);

    const stmt = this.db.prepare(`
      INSERT INTO pomodoro_sessions (
        task, session_type, duration, start_time, end_time, completed, interrupted
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      session.task,
      session.sessionType,
      session.duration,
      session.startTime,
      session.endTime || null,
      session.completed ? 1 : 0,
      session.interrupted ? 1 : 0
    );

    console.log(`✅ DB: Pomodoro session saved with ID: ${result.lastInsertRowid}`);
    return result.lastInsertRowid as number;
  }

  updatePomodoroSession(id: number, updates: Partial<PomodoroSession>): boolean {
    if (!this.db) return false;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.task !== undefined) {
      fields.push('task = ?');
      values.push(updates.task);
    }
    if (updates.endTime !== undefined) {
      fields.push('end_time = ?');
      values.push(updates.endTime);
    }
    if (updates.completed !== undefined) {
      fields.push('completed = ?');
      values.push(updates.completed ? 1 : 0);
    }
    if (updates.interrupted !== undefined) {
      fields.push('interrupted = ?');
      values.push(updates.interrupted ? 1 : 0);
    }

    if (fields.length === 0) {
      return false; // No updates to perform
    }

    values.push(id); // Add id for WHERE clause

    const stmt = this.db.prepare(`
      UPDATE pomodoro_sessions
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0;
  }

  getPomodoroSessions(limit = 100): PomodoroSession[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT
        id,
        task,
        session_type AS sessionType,
        duration,
        start_time AS startTime,
        end_time AS endTime,
        completed,
        interrupted,
        created_at AS createdAt
      FROM pomodoro_sessions
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const results = stmt.all(limit) as any[];
    return results.map(row => ({
      ...row,
      completed: Boolean(row.completed),
      interrupted: Boolean(row.interrupted)
    }));
  }

  getPomodoroSessionsByDateRange(startDate: string, endDate: string): PomodoroSession[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT
        id,
        task,
        session_type AS sessionType,
        duration,
        start_time AS startTime,
        end_time AS endTime,
        completed,
        interrupted,
        created_at AS createdAt
      FROM pomodoro_sessions
      WHERE DATE(start_time) BETWEEN ? AND ?
      ORDER BY start_time DESC
    `);

    const results = stmt.all(startDate, endDate) as any[];
    return results.map(row => ({
      ...row,
      completed: Boolean(row.completed),
      interrupted: Boolean(row.interrupted)
    }));
  }

  getPomodoroStats(startDate?: string, endDate?: string): PomodoroStats {
    if (!this.db) {
      return {
        totalSessions: 0,
        completedSessions: 0,
        totalFocusTime: 0,
        totalBreakTime: 0,
        completionRate: 0,
        currentStreak: 0
      };
    }

    let whereClause = '';
    const params: any[] = [];

    if (startDate && endDate) {
      whereClause = 'WHERE DATE(start_time) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // Total and completed sessions
    const statsStmt = this.db.prepare(`
      SELECT
        COUNT(*) as totalSessions,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completedSessions,
        SUM(CASE WHEN session_type = 'focus' AND completed = 1 THEN duration ELSE 0 END) as totalFocusTime,
        SUM(CASE WHEN session_type IN ('shortBreak', 'longBreak') AND completed = 1 THEN duration ELSE 0 END) as totalBreakTime
      FROM pomodoro_sessions
      ${whereClause}
    `);

    const stats = statsStmt.get(...params) as any;

    // Calculate completion rate
    const completionRate = stats.totalSessions > 0
      ? (stats.completedSessions / stats.totalSessions) * 100
      : 0;

    // Calculate current streak (consecutive days with at least one completed session)
    let currentStreak = 0;
    const streakStmt = this.db.prepare(`
      SELECT DATE(start_time) as date
      FROM pomodoro_sessions
      WHERE completed = 1
      GROUP BY DATE(start_time)
      ORDER BY date DESC
    `);

    const dates = streakStmt.all() as Array<{date: string}>;
    if (dates.length > 0) {
      currentStreak = 1;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < dates.length - 1; i++) {
        const currentDate = new Date(dates[i].date);
        const nextDate = new Date(dates[i + 1].date);
        const diffTime = currentDate.getTime() - nextDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    return {
      totalSessions: stats.totalSessions || 0,
      completedSessions: stats.completedSessions || 0,
      totalFocusTime: stats.totalFocusTime || 0,
      totalBreakTime: stats.totalBreakTime || 0,
      completionRate: Math.round(completionRate * 100) / 100,
      currentStreak
    };
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}