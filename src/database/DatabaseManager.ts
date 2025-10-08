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

    // Productivity goals table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS productivity_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        goal_type TEXT NOT NULL CHECK(goal_type IN ('daily_time', 'weekly_time', 'category', 'app_limit')),
        category TEXT,
        app_name TEXT,
        target_minutes INTEGER NOT NULL,
        operator TEXT NOT NULL CHECK(operator IN ('gte', 'lte', 'eq')),
        period TEXT NOT NULL CHECK(period IN ('daily', 'weekly')),
        active BOOLEAN DEFAULT 1,
        notifications_enabled BOOLEAN DEFAULT 1,
        notify_at_percentage INTEGER DEFAULT 100 CHECK(notify_at_percentage IN (50, 75, 90, 100)),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS goal_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        progress_minutes INTEGER DEFAULT 0,
        achieved BOOLEAN DEFAULT 0,
        notified BOOLEAN DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (goal_id) REFERENCES productivity_goals(id) ON DELETE CASCADE,
        UNIQUE(goal_id, date)
      )
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_goals_active ON productivity_goals(active);
      CREATE INDEX IF NOT EXISTS idx_goals_goal_type ON productivity_goals(goal_type);
      CREATE INDEX IF NOT EXISTS idx_goals_period ON productivity_goals(period);
      CREATE INDEX IF NOT EXISTS idx_goal_progress_date ON goal_progress(date);
      CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_id ON goal_progress(goal_id);
      CREATE INDEX IF NOT EXISTS idx_goal_progress_achieved ON goal_progress(achieved);
    `);

    // Categories table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL DEFAULT '#3B82F6',
        icon TEXT,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tags table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL DEFAULT '#8B5CF6',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // App to Category mappings
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_category_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_name TEXT NOT NULL UNIQUE,
        category_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      )
    `);

    // Domain to Category mappings
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS domain_category_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT NOT NULL UNIQUE,
        category_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      )
    `);

    // Time Entry to Tags junction table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS time_entry_tags (
        time_entry_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (time_entry_id, tag_id),
        FOREIGN KEY (time_entry_id) REFERENCES time_entries(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `);

    // App Usage to Tags junction table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_usage_tags (
        app_usage_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (app_usage_id, tag_id),
        FOREIGN KEY (app_usage_id) REFERENCES app_usage(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `);

    // Pomodoro Session to Tags junction table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pomodoro_session_tags (
        pomodoro_session_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (pomodoro_session_id, tag_id),
        FOREIGN KEY (pomodoro_session_id) REFERENCES pomodoro_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `);

    // Productivity Goal to Tags junction table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS productivity_goal_tags (
        productivity_goal_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (productivity_goal_id, tag_id),
        FOREIGN KEY (productivity_goal_id) REFERENCES productivity_goals(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `);

    // Add category_id column to time_entries if it doesn't exist
    try {
      this.db.exec(`ALTER TABLE time_entries ADD COLUMN category_id INTEGER REFERENCES categories(id)`);
    } catch (_error) {
      // Column already exists, ignore
    }

    // Add category_id column to app_usage if it doesn't exist
    try {
      this.db.exec(`ALTER TABLE app_usage ADD COLUMN category_id INTEGER REFERENCES categories(id)`);
    } catch (_error) {
      // Column already exists, ignore
    }

    // Create indexes for new tables
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
      CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
      CREATE INDEX IF NOT EXISTS idx_app_category_mappings_app_name ON app_category_mappings(app_name);
      CREATE INDEX IF NOT EXISTS idx_app_category_mappings_category_id ON app_category_mappings(category_id);
      CREATE INDEX IF NOT EXISTS idx_domain_category_mappings_domain ON domain_category_mappings(domain);
      CREATE INDEX IF NOT EXISTS idx_domain_category_mappings_category_id ON domain_category_mappings(category_id);
      CREATE INDEX IF NOT EXISTS idx_time_entry_tags_time_entry_id ON time_entry_tags(time_entry_id);
      CREATE INDEX IF NOT EXISTS idx_time_entry_tags_tag_id ON time_entry_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_app_usage_tags_app_usage_id ON app_usage_tags(app_usage_id);
      CREATE INDEX IF NOT EXISTS idx_app_usage_tags_tag_id ON app_usage_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_category_id ON time_entries(category_id);
      CREATE INDEX IF NOT EXISTS idx_app_usage_category_id ON app_usage(category_id);
    `);

    console.log('✅ Database initialization complete');
  }

  addTimeEntry(entry: TimeEntry): number {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO time_entries (task, start_time, end_time, duration, category, category_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      entry.task,
      entry.startTime,
      entry.endTime || null,
      entry.duration || null,
      entry.category || null,
      entry.categoryId || null
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
      INSERT INTO app_usage (app_name, window_title, start_time, end_time, duration, category, category_id, domain, url, is_browser, is_idle)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      usage.appName,
      usage.windowTitle || null,
      usage.startTime,
      usage.endTime || null,
      usage.duration || null,
      usage.category || null,
      usage.categoryId || null,
      usage.domain || null,
      usage.url || null,
      usage.isBrowser ? 1 : 0,
      usage.isIdle ? 1 : 0
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

  getTimeEntriesByDateRange(startDate: string, endDate: string): TimeEntry[] {
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
      WHERE DATE(start_time) BETWEEN ? AND ?
      ORDER BY start_time DESC
    `);

    return stmt.all(startDate, endDate) as TimeEntry[];
  }

  getTimelineActivities(startDate: string, endDate: string): any[] {
    if (!this.db) return [];

    // Query time entries
    const timeEntriesStmt = this.db.prepare(`
      SELECT
        te.id,
        'time_entry' AS type,
        te.task AS title,
        te.start_time AS startTime,
        te.end_time AS endTime,
        te.duration,
        te.category,
        c.id AS categoryId,
        c.name AS categoryName,
        c.color AS categoryColor
      FROM time_entries te
      LEFT JOIN categories c ON te.category = c.name
      WHERE te.end_time IS NOT NULL
        AND datetime(te.start_time) < datetime(?)
        AND datetime(te.end_time) > datetime(?)
      ORDER BY te.start_time ASC
    `);

    // Query app usage
    const appUsageStmt = this.db.prepare(`
      SELECT
        au.id,
        CASE
          WHEN au.is_browser = 1 THEN 'browser'
          ELSE 'app'
        END AS type,
        CASE
          WHEN au.is_browser = 1 THEN COALESCE(au.domain, au.app_name)
          ELSE au.app_name
        END AS title,
        au.start_time AS startTime,
        au.end_time AS endTime,
        au.duration,
        au.category,
        c.id AS categoryId,
        c.name AS categoryName,
        c.color AS categoryColor,
        au.app_name AS appName,
        au.window_title AS windowTitle,
        au.domain,
        au.url,
        au.is_idle AS isIdle
      FROM app_usage au
      LEFT JOIN categories c ON au.category = c.name
      WHERE au.end_time IS NOT NULL
        AND datetime(au.start_time) < datetime(?)
        AND datetime(au.end_time) > datetime(?)
      ORDER BY au.start_time ASC
    `);

    const timeEntries = timeEntriesStmt.all(endDate, startDate);
    const appUsage = appUsageStmt.all(endDate, startDate);

    // Combine and transform to TimelineActivity format
    const activities = [
      ...timeEntries.map((entry: any) => ({
        id: entry.id,
        type: entry.type,
        title: entry.title,
        startTime: entry.startTime,
        endTime: entry.endTime,
        duration: entry.duration || 0,
        categoryId: entry.categoryId,
        categoryName: entry.categoryName,
        categoryColor: entry.categoryColor,
        tags: [], // Tags will be fetched separately if needed
        metadata: {}
      })),
      ...appUsage.map((usage: any) => ({
        id: usage.id,
        type: usage.type,
        title: usage.title,
        startTime: usage.startTime,
        endTime: usage.endTime,
        duration: usage.duration || 0,
        categoryId: usage.categoryId,
        categoryName: usage.categoryName,
        categoryColor: usage.categoryColor,
        tags: [], // Tags will be fetched separately if needed
        metadata: {
          appName: usage.appName,
          windowTitle: usage.windowTitle,
          domain: usage.domain,
          url: usage.url,
          isIdle: usage.isIdle === 1
        }
      }))
    ];

    // Sort by start time
    activities.sort((a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    return activities;
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

  // ==================== PRODUCTIVITY GOALS METHODS ====================

  addGoal(goal: import('../types').ProductivityGoal): number {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO productivity_goals (
        name, description, goal_type, category, app_name,
        target_minutes, operator, period, active,
        notifications_enabled, notify_at_percentage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      goal.name,
      goal.description || null,
      goal.goalType,
      goal.category || null,
      goal.appName || null,
      goal.targetMinutes,
      goal.operator,
      goal.period,
      goal.active ? 1 : 0,
      goal.notificationsEnabled ? 1 : 0,
      goal.notifyAtPercentage
    );

    return result.lastInsertRowid as number;
  }

  updateGoal(id: number, updates: Partial<import('../types').ProductivityGoal>): boolean {
    if (!this.db) throw new Error('Database not initialized');

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.goalType !== undefined) {
      fields.push('goal_type = ?');
      values.push(updates.goalType);
    }
    if (updates.category !== undefined) {
      fields.push('category = ?');
      values.push(updates.category);
    }
    if (updates.appName !== undefined) {
      fields.push('app_name = ?');
      values.push(updates.appName);
    }
    if (updates.targetMinutes !== undefined) {
      fields.push('target_minutes = ?');
      values.push(updates.targetMinutes);
    }
    if (updates.operator !== undefined) {
      fields.push('operator = ?');
      values.push(updates.operator);
    }
    if (updates.period !== undefined) {
      fields.push('period = ?');
      values.push(updates.period);
    }
    if (updates.active !== undefined) {
      fields.push('active = ?');
      values.push(updates.active ? 1 : 0);
    }
    if (updates.notificationsEnabled !== undefined) {
      fields.push('notifications_enabled = ?');
      values.push(updates.notificationsEnabled ? 1 : 0);
    }
    if (updates.notifyAtPercentage !== undefined) {
      fields.push('notify_at_percentage = ?');
      values.push(updates.notifyAtPercentage);
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE productivity_goals
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0;
  }

  deleteGoal(id: number): boolean {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM productivity_goals WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  getGoals(activeOnly = false): import('../types').ProductivityGoal[] {
    if (!this.db) return [];

    let query = `
      SELECT
        id,
        name,
        description,
        goal_type AS goalType,
        category,
        app_name AS appName,
        target_minutes AS targetMinutes,
        operator,
        period,
        active,
        notifications_enabled AS notificationsEnabled,
        notify_at_percentage AS notifyAtPercentage,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM productivity_goals
    `;

    if (activeOnly) {
      query += ' WHERE active = 1';
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all() as import('../types').ProductivityGoal[];
  }

  getGoalProgress(goalId: number, date: string): import('../types').GoalProgress | null {
    if (!this.db) return null;

    const stmt = this.db.prepare(`
      SELECT
        id,
        goal_id AS goalId,
        date,
        progress_minutes AS progressMinutes,
        achieved,
        notified,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM goal_progress
      WHERE goal_id = ? AND date = ?
    `);

    return stmt.get(goalId, date) as import('../types').GoalProgress | null;
  }

  updateGoalProgress(goalId: number, date: string, minutes: number): void {
    if (!this.db) throw new Error('Database not initialized');

    // Check if target was achieved
    const goalStmt = this.db.prepare('SELECT target_minutes, operator FROM productivity_goals WHERE id = ?');
    const goal = goalStmt.get(goalId) as {target_minutes: number, operator: string} | undefined;

    if (!goal) return;

    let achieved = false;
    switch (goal.operator) {
      case 'gte':
        achieved = minutes >= goal.target_minutes;
        break;
      case 'lte':
        achieved = minutes <= goal.target_minutes;
        break;
      case 'eq':
        achieved = minutes === goal.target_minutes;
        break;
    }

    // Upsert progress
    const stmt = this.db.prepare(`
      INSERT INTO goal_progress (goal_id, date, progress_minutes, achieved, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(goal_id, date)
      DO UPDATE SET
        progress_minutes = excluded.progress_minutes,
        achieved = excluded.achieved,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(goalId, date, minutes, achieved ? 1 : 0);
  }

  getTodayGoalsWithProgress(): import('../types').GoalWithProgress[] {
    if (!this.db) return [];

    const today = new Date().toISOString().split('T')[0];

    const stmt = this.db.prepare(`
      SELECT
        g.id,
        g.name,
        g.description,
        g.goal_type AS goalType,
        g.category,
        g.app_name AS appName,
        g.target_minutes AS targetMinutes,
        g.operator,
        g.period,
        g.active,
        g.notifications_enabled AS notificationsEnabled,
        g.notify_at_percentage AS notifyAtPercentage,
        g.created_at AS createdAt,
        g.updated_at AS updatedAt,
        gp.id AS progressId,
        gp.progress_minutes AS progressMinutes,
        gp.achieved,
        gp.notified
      FROM productivity_goals g
      LEFT JOIN goal_progress gp ON g.id = gp.goal_id AND gp.date = ?
      WHERE g.active = 1 AND g.period = 'daily'
      ORDER BY g.created_at DESC
    `);

    const results = stmt.all(today) as any[];

    return results.map((row) => {
      const progressMinutes = row.progressMinutes || 0;
      const progressPercentage = (progressMinutes / row.targetMinutes) * 100;
      const timeRemaining = Math.max(0, row.targetMinutes - progressMinutes);

      let status: import('../types').GoalStatus = 'not_started';
      if (progressMinutes === 0) {
        status = 'not_started';
      } else if (row.achieved) {
        status = row.operator === 'lte' ? 'achieved' : (progressMinutes > row.targetMinutes ? 'exceeded' : 'achieved');
      } else {
        status = 'in_progress';
      }

      return {
        id: row.id,
        name: row.name,
        description: row.description,
        goalType: row.goalType,
        category: row.category,
        appName: row.appName,
        targetMinutes: row.targetMinutes,
        operator: row.operator,
        period: row.period,
        active: row.active,
        notificationsEnabled: row.notificationsEnabled,
        notifyAtPercentage: row.notifyAtPercentage,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        todayProgress: row.progressId ? {
          id: row.progressId,
          goalId: row.id,
          date: today,
          progressMinutes,
          achieved: row.achieved,
          notified: row.notified
        } : undefined,
        progressPercentage: Math.min(100, Math.round(progressPercentage)),
        timeRemaining,
        status
      };
    });
  }

  getGoalAchievementHistory(goalId: number, days: number): import('../types').GoalProgress[] {
    if (!this.db) return [];

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const stmt = this.db.prepare(`
      SELECT
        id,
        goal_id AS goalId,
        date,
        progress_minutes AS progressMinutes,
        achieved,
        notified,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM goal_progress
      WHERE goal_id = ? AND date BETWEEN ? AND ?
      ORDER BY date DESC
    `);

    return stmt.all(goalId, startDateStr, endDate) as import('../types').GoalProgress[];
  }

  getGoalStats(): import('../types').GoalStats {
    if (!this.db) {
      return {
        totalGoals: 0,
        activeGoals: 0,
        achievedToday: 0,
        currentStreak: 0,
        longestStreak: 0,
        achievementRate: 0
      };
    }

    const today = new Date().toISOString().split('T')[0];

    // Get total and active goals
    const countStmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active
      FROM productivity_goals
    `);
    const counts = countStmt.get() as {total: number, active: number};

    // Get achieved today
    const achievedTodayStmt = this.db.prepare(`
      SELECT COUNT(*) as achieved
      FROM goal_progress
      WHERE date = ? AND achieved = 1
    `);
    const achievedToday = (achievedTodayStmt.get(today) as {achieved: number}).achieved;

    // Calculate current streak (consecutive days with at least one achieved goal)
    let currentStreak = 0;
    const streakStmt = this.db.prepare(`
      SELECT date
      FROM goal_progress
      WHERE achieved = 1
      GROUP BY date
      HAVING COUNT(*) > 0
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

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < dates.length; i++) {
      tempStreak = 1;
      for (let j = i; j < dates.length - 1; j++) {
        const currentDate = new Date(dates[j].date);
        const nextDate = new Date(dates[j + 1].date);
        const diffTime = currentDate.getTime() - nextDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
        } else {
          break;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    // Calculate achievement rate (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const achievementRateStmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN achieved = 1 THEN 1 ELSE 0 END) as achieved
      FROM goal_progress
      WHERE date >= ?
    `);
    const achievementData = achievementRateStmt.get(thirtyDaysAgoStr) as {total: number, achieved: number};
    const achievementRate = achievementData.total > 0
      ? Math.round((achievementData.achieved / achievementData.total) * 100)
      : 0;

    return {
      totalGoals: counts.total || 0,
      activeGoals: counts.active || 0,
      achievedToday: achievedToday || 0,
      currentStreak,
      longestStreak,
      achievementRate
    };
  }

  /**
   * Query total active time between two timestamps (returns minutes)
   */
  queryTotalActiveTime(startTime: string, endTime: string): number {
    if (!this.db) return 0;

    const result = this.db.prepare(`
      SELECT COALESCE(SUM(duration), 0) as total_seconds
      FROM app_usage
      WHERE start_time >= ? AND start_time <= ?
      AND is_idle = 0
    `).get(startTime, endTime) as { total_seconds: number };

    return Math.round(result.total_seconds / 60);
  }

  /**
   * Query time spent in a specific category between two timestamps (returns minutes)
   */
  queryCategoryTime(category: string, startTime: string, endTime: string): number {
    if (!this.db) return 0;

    const result = this.db.prepare(`
      SELECT COALESCE(SUM(duration), 0) as total_seconds
      FROM app_usage
      WHERE start_time >= ? AND start_time <= ?
      AND category = ?
      AND is_idle = 0
    `).get(startTime, endTime, category) as { total_seconds: number };

    return Math.round(result.total_seconds / 60);
  }

  /**
   * Query time spent on a specific app between two timestamps (returns minutes)
   */
  queryAppTime(appName: string, startTime: string, endTime: string): number {
    if (!this.db) return 0;

    const result = this.db.prepare(`
      SELECT COALESCE(SUM(duration), 0) as total_seconds
      FROM app_usage
      WHERE start_time >= ? AND start_time <= ?
      AND app_name = ?
      AND is_idle = 0
    `).get(startTime, endTime, appName) as { total_seconds: number };

    return Math.round(result.total_seconds / 60);
  }

  // ==================== CATEGORIES METHODS ====================

  addCategory(category: import('../types').Category): number {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO categories (name, color, icon, description)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      category.name,
      category.color || '#3B82F6',
      category.icon || null,
      category.description || null
    );

    return result.lastInsertRowid as number;
  }

  updateCategory(id: number, updates: Partial<import('../types').Category>): boolean {
    if (!this.db) throw new Error('Database not initialized');

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.icon !== undefined) {
      fields.push('icon = ?');
      values.push(updates.icon);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE categories
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0;
  }

  deleteCategory(id: number): boolean {
    if (!this.db) throw new Error('Database not initialized');

    // Clear foreign key references before deletion to avoid constraint violations
    this.db.prepare('UPDATE time_entries SET category_id = NULL WHERE category_id = ?').run(id);
    this.db.prepare('UPDATE app_usage SET category_id = NULL WHERE category_id = ?').run(id);
    this.db.prepare('DELETE FROM app_category_mappings WHERE category_id = ?').run(id);
    this.db.prepare('DELETE FROM domain_category_mappings WHERE category_id = ?').run(id);

    // Now safe to delete the category
    const stmt = this.db.prepare('DELETE FROM categories WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  getCategories(): import('../types').Category[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT
        id,
        name,
        color,
        icon,
        description,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM categories
      ORDER BY name ASC
    `);

    return stmt.all() as import('../types').Category[];
  }

  getCategoryById(id: number): import('../types').Category | null {
    if (!this.db) return null;

    const stmt = this.db.prepare(`
      SELECT
        id,
        name,
        color,
        icon,
        description,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM categories
      WHERE id = ?
    `);

    return stmt.get(id) as import('../types').Category | null;
  }

  // ==================== TAGS METHODS ====================

  addTag(tag: import('../types').Tag): number {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO tags (name, color)
      VALUES (?, ?)
    `);

    const result = stmt.run(
      tag.name,
      tag.color || '#8B5CF6'
    );

    return result.lastInsertRowid as number;
  }

  updateTag(id: number, updates: Partial<import('../types').Tag>): boolean {
    if (!this.db) throw new Error('Database not initialized');

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }

    if (fields.length === 0) return false;

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE tags
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0;
  }

  deleteTag(id: number): boolean {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM tags WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  getTags(): import('../types').Tag[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT
        id,
        name,
        color,
        created_at AS createdAt
      FROM tags
      ORDER BY name ASC
    `);

    return stmt.all() as import('../types').Tag[];
  }

  // ==================== CATEGORY MAPPINGS METHODS ====================

  addAppCategoryMapping(appName: string, categoryId: number): number {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO app_category_mappings (app_name, category_id)
      VALUES (?, ?)
    `);

    const result = stmt.run(appName, categoryId);
    return result.lastInsertRowid as number;
  }

  deleteAppCategoryMapping(id: number): boolean {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM app_category_mappings WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  getAppCategoryMappings(): import('../types').AppCategoryMapping[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT
        acm.id,
        acm.app_name AS appName,
        acm.category_id AS categoryId,
        c.name AS categoryName,
        c.color AS categoryColor,
        acm.created_at AS createdAt
      FROM app_category_mappings acm
      JOIN categories c ON acm.category_id = c.id
      ORDER BY acm.app_name ASC
    `);

    return stmt.all() as import('../types').AppCategoryMapping[];
  }

  getCategoryIdForApp(appName: string): number | null {
    if (!this.db) return null;

    const stmt = this.db.prepare(`
      SELECT category_id
      FROM app_category_mappings
      WHERE app_name = ?
    `);

    const result = stmt.get(appName) as {category_id: number} | undefined;
    return result ? result.category_id : null;
  }

  addDomainCategoryMapping(domain: string, categoryId: number): number {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO domain_category_mappings (domain, category_id)
      VALUES (?, ?)
    `);

    const result = stmt.run(domain, categoryId);
    return result.lastInsertRowid as number;
  }

  deleteDomainCategoryMapping(id: number): boolean {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM domain_category_mappings WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  getDomainCategoryMappings(): import('../types').DomainCategoryMapping[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT
        dcm.id,
        dcm.domain,
        dcm.category_id AS categoryId,
        c.name AS categoryName,
        c.color AS categoryColor,
        dcm.created_at AS createdAt
      FROM domain_category_mappings dcm
      JOIN categories c ON dcm.category_id = c.id
      ORDER BY dcm.domain ASC
    `);

    return stmt.all() as import('../types').DomainCategoryMapping[];
  }

  getCategoryIdForDomain(domain: string): number | null {
    if (!this.db) return null;

    const stmt = this.db.prepare(`
      SELECT category_id
      FROM domain_category_mappings
      WHERE domain = ?
    `);

    const result = stmt.get(domain) as {category_id: number} | undefined;
    return result ? result.category_id : null;
  }

  // ==================== TAG ASSOCIATIONS METHODS ====================

  addTimeEntryTags(timeEntryId: number, tagIds: number[]): void {
    if (!this.db || tagIds.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO time_entry_tags (time_entry_id, tag_id)
      VALUES (?, ?)
    `);

    for (const tagId of tagIds) {
      stmt.run(timeEntryId, tagId);
    }
  }

  getTimeEntryTags(timeEntryId: number): import('../types').Tag[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT
        t.id,
        t.name,
        t.color,
        t.created_at AS createdAt
      FROM tags t
      JOIN time_entry_tags tet ON t.id = tet.tag_id
      WHERE tet.time_entry_id = ?
      ORDER BY t.name ASC
    `);

    return stmt.all(timeEntryId) as import('../types').Tag[];
  }

  addAppUsageTags(appUsageId: number, tagIds: number[]): void {
    if (!this.db || tagIds.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO app_usage_tags (app_usage_id, tag_id)
      VALUES (?, ?)
    `);

    for (const tagId of tagIds) {
      stmt.run(appUsageId, tagId);
    }
  }

  getAppUsageTags(appUsageId: number): import('../types').Tag[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT
        t.id,
        t.name,
        t.color,
        t.created_at AS createdAt
      FROM tags t
      JOIN app_usage_tags aut ON t.id = aut.tag_id
      WHERE aut.app_usage_id = ?
      ORDER BY t.name ASC
    `);

    return stmt.all(appUsageId) as import('../types').Tag[];
  }

  addPomodoroSessionTags(pomodoroSessionId: number, tagIds: number[]): void {
    if (!this.db || tagIds.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO pomodoro_session_tags (pomodoro_session_id, tag_id)
      VALUES (?, ?)
    `);

    for (const tagId of tagIds) {
      stmt.run(pomodoroSessionId, tagId);
    }
  }

  /**
   * Set (replace) all tags for a pomodoro session in a transaction
   * Deletes existing associations and inserts new ones
   */
  setPomodoroSessionTags(pomodoroSessionId: number, tagIds: number[]): void {
    if (!this.db) return;

    const transaction = this.db.transaction(() => {
      // Delete existing associations
      const deleteStmt = this.db!.prepare(`
        DELETE FROM pomodoro_session_tags
        WHERE pomodoro_session_id = ?
      `);
      deleteStmt.run(pomodoroSessionId);

      // Insert new associations if any
      if (tagIds.length > 0) {
        const insertStmt = this.db!.prepare(`
          INSERT OR IGNORE INTO pomodoro_session_tags (pomodoro_session_id, tag_id)
          VALUES (?, ?)
        `);

        for (const tagId of tagIds) {
          insertStmt.run(pomodoroSessionId, tagId);
        }
      }
    });

    transaction();
  }

  getPomodoroSessionTags(pomodoroSessionId: number): import('../types').Tag[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT
        t.id,
        t.name,
        t.color,
        t.created_at AS createdAt
      FROM tags t
      JOIN pomodoro_session_tags pst ON t.id = pst.tag_id
      WHERE pst.pomodoro_session_id = ?
      ORDER BY t.name ASC
    `);

    return stmt.all(pomodoroSessionId) as import('../types').Tag[];
  }

  addProductivityGoalTags(productivityGoalId: number, tagIds: number[]): void {
    if (!this.db || tagIds.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO productivity_goal_tags (productivity_goal_id, tag_id)
      VALUES (?, ?)
    `);

    for (const tagId of tagIds) {
      stmt.run(productivityGoalId, tagId);
    }
  }

  /**
   * Set (replace) all tags for a productivity goal in a transaction
   * Deletes existing associations and inserts new ones
   */
  setProductivityGoalTags(productivityGoalId: number, tagIds: number[]): void {
    if (!this.db) return;

    const transaction = this.db.transaction(() => {
      // Delete existing associations
      const deleteStmt = this.db!.prepare(`
        DELETE FROM productivity_goal_tags
        WHERE productivity_goal_id = ?
      `);
      deleteStmt.run(productivityGoalId);

      // Insert new associations if any
      if (tagIds.length > 0) {
        const insertStmt = this.db!.prepare(`
          INSERT OR IGNORE INTO productivity_goal_tags (productivity_goal_id, tag_id)
          VALUES (?, ?)
        `);

        for (const tagId of tagIds) {
          insertStmt.run(productivityGoalId, tagId);
        }
      }
    });

    transaction();
  }

  getProductivityGoalTags(productivityGoalId: number): import('../types').Tag[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT
        t.id,
        t.name,
        t.color,
        t.created_at AS createdAt
      FROM tags t
      JOIN productivity_goal_tags pgt ON t.id = pgt.tag_id
      WHERE pgt.productivity_goal_id = ?
      ORDER BY t.name ASC
    `);

    return stmt.all(productivityGoalId) as import('../types').Tag[];
  }

  // ==================== ANALYTICS METHODS ====================

  /**
   * Get daily productivity statistics for a date range
   */
  getDailyProductivityStats(startDate: string, endDate: string): import('../types').DailyStats[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      WITH daily_data AS (
        SELECT
          DATE(start_time) as date,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as total_minutes,
          COUNT(CASE WHEN end_time IS NOT NULL THEN 1 END) as completed_tasks
        FROM time_entries
        WHERE DATE(start_time) BETWEEN ? AND ?
        GROUP BY DATE(start_time)

        UNION ALL

        SELECT
          DATE(start_time) as date,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as total_minutes,
          0 as completed_tasks
        FROM app_usage
        WHERE DATE(start_time) BETWEEN ? AND ?
        GROUP BY DATE(start_time)
      ),
      pomodoro_data AS (
        SELECT
          DATE(start_time) as date,
          SUM(CASE WHEN session_type = 'focus' AND completed = 1 THEN duration ELSE 0 END) / 60.0 as focus_minutes,
          SUM(CASE WHEN session_type IN ('shortBreak', 'longBreak') THEN duration ELSE 0 END) / 60.0 as break_minutes
        FROM pomodoro_sessions
        WHERE DATE(start_time) BETWEEN ? AND ?
        GROUP BY DATE(start_time)
      ),
      idle_data AS (
        SELECT
          DATE(start_time) as date,
          SUM(CASE WHEN is_idle = 1 THEN duration ELSE 0 END) / 60.0 as idle_minutes
        FROM app_usage
        WHERE DATE(start_time) BETWEEN ? AND ?
        GROUP BY DATE(start_time)
      )
      SELECT
        d.date,
        COALESCE(SUM(d.total_minutes), 0) as totalMinutes,
        COALESCE(p.focus_minutes, 0) as focusMinutes,
        COALESCE(p.break_minutes, 0) as breakMinutes,
        COALESCE(i.idle_minutes, 0) as idleMinutes,
        COALESCE(MAX(d.completed_tasks), 0) as completedTasks
      FROM daily_data d
      LEFT JOIN pomodoro_data p ON d.date = p.date
      LEFT JOIN idle_data i ON d.date = i.date
      GROUP BY d.date
      ORDER BY d.date ASC
    `);

    const rows = stmt.all(startDate, endDate, startDate, endDate, startDate, endDate, startDate, endDate) as any[];

    return rows.map(row => ({
      date: row.date,
      totalMinutes: Math.round(row.totalMinutes),
      focusMinutes: Math.round(row.focusMinutes),
      breakMinutes: Math.round(row.breakMinutes),
      idleMinutes: Math.round(row.idleMinutes),
      completedTasks: row.completedTasks,
      categories: this.getCategoriesForDate(row.date)
    }));
  }

  /**
   * Get category breakdown for a specific date
   */
  private getCategoriesForDate(date: string): import('../types').CategoryTime[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT
        c.id as categoryId,
        c.name as categoryName,
        c.color as categoryColor,
        SUM(CASE WHEN te.duration IS NOT NULL THEN te.duration ELSE
          CAST((JULIANDAY(COALESCE(te.end_time, te.start_time)) - JULIANDAY(te.start_time)) * 86400 AS INTEGER)
        END) / 60.0 as minutes
      FROM time_entries te
      LEFT JOIN categories c ON te.category = c.name
      WHERE DATE(te.start_time) = ?
        AND c.id IS NOT NULL
      GROUP BY c.id, c.name, c.color
      ORDER BY minutes DESC
      LIMIT 10
    `);

    const rows = stmt.all(date) as any[];
    const total = rows.reduce((sum, r) => sum + r.minutes, 0);

    return rows.map(row => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      categoryColor: row.categoryColor,
      minutes: Math.round(row.minutes),
      percentage: total > 0 ? Math.round((row.minutes / total) * 100) : 0
    }));
  }

  /**
   * Get hourly activity patterns over the last N days
   */
  getHourlyPatterns(days: number): import('../types').HourlyPattern[] {
    if (!this.db) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stmt = this.db.prepare(`
      WITH hourly_data AS (
        SELECT
          CAST(strftime('%H', start_time) AS INTEGER) as hour,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as minutes,
          DATE(start_time) as date
        FROM time_entries
        WHERE datetime(start_time) >= datetime(?)
        GROUP BY hour, DATE(start_time)

        UNION ALL

        SELECT
          CAST(strftime('%H', start_time) AS INTEGER) as hour,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as minutes,
          DATE(start_time) as date
        FROM app_usage
        WHERE datetime(start_time) >= datetime(?)
          AND is_idle = 0
        GROUP BY hour, DATE(start_time)
      )
      SELECT
        hour,
        AVG(minutes) as avgMinutes,
        COUNT(DISTINCT date) as dayCount
      FROM hourly_data
      GROUP BY hour
      ORDER BY hour
    `);

    const rows = stmt.all(startDate.toISOString(), startDate.toISOString()) as any[];

    return rows.map(row => ({
      hour: row.hour,
      avgMinutes: Math.round(row.avgMinutes),
      dayCount: row.dayCount
    }));
  }

  /**
   * Get heatmap data for a specific year
   */
  getHeatmapData(year: number): import('../types').HeatmapDay[] {
    if (!this.db) return [];

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const stmt = this.db.prepare(`
      WITH daily_totals AS (
        SELECT
          DATE(start_time) as date,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as total_minutes
        FROM time_entries
        WHERE DATE(start_time) BETWEEN ? AND ?
        GROUP BY DATE(start_time)

        UNION ALL

        SELECT
          DATE(start_time) as date,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as total_minutes
        FROM app_usage
        WHERE DATE(start_time) BETWEEN ? AND ?
          AND is_idle = 0
        GROUP BY DATE(start_time)
      ),
      focus_breakdown AS (
        SELECT
          DATE(start_time) as date,
          SUM(CASE WHEN session_type = 'focus' AND completed = 1 THEN duration ELSE 0 END) / 60.0 as focus
        FROM pomodoro_sessions
        WHERE DATE(start_time) BETWEEN ? AND ?
        GROUP BY DATE(start_time)
      ),
      app_breakdown AS (
        SELECT
          DATE(start_time) as date,
          SUM(CASE WHEN is_browser = 0 AND is_idle = 0 THEN duration ELSE 0 END) / 60.0 as apps,
          SUM(CASE WHEN is_browser = 1 AND is_idle = 0 THEN duration ELSE 0 END) / 60.0 as browser
        FROM app_usage
        WHERE DATE(start_time) BETWEEN ? AND ?
        GROUP BY DATE(start_time)
      ),
      aggregated AS (
        SELECT
          dt.date,
          SUM(dt.total_minutes) as totalMinutes,
          COALESCE(MAX(fb.focus), 0) as focus,
          COALESCE(MAX(ab.apps), 0) as apps,
          COALESCE(MAX(ab.browser), 0) as browser
        FROM daily_totals dt
        LEFT JOIN focus_breakdown fb ON dt.date = fb.date
        LEFT JOIN app_breakdown ab ON dt.date = ab.date
        GROUP BY dt.date
      ),
      max_val AS (
        SELECT MAX(totalMinutes) as max_minutes FROM aggregated
      )
      SELECT
        a.date,
        a.totalMinutes,
        CASE
          WHEN a.totalMinutes = 0 THEN 0
          WHEN a.totalMinutes / m.max_minutes <= 0.2 THEN 1
          WHEN a.totalMinutes / m.max_minutes <= 0.4 THEN 2
          WHEN a.totalMinutes / m.max_minutes <= 0.7 THEN 3
          ELSE 4
        END as intensity,
        a.focus,
        a.apps,
        a.browser
      FROM aggregated a, max_val m
      ORDER BY a.date
    `);

    const rows = stmt.all(startDate, endDate, startDate, endDate, startDate, endDate, startDate, endDate) as any[];

    return rows.map(row => ({
      date: row.date,
      intensity: row.intensity as 0 | 1 | 2 | 3 | 4,
      totalMinutes: Math.round(row.totalMinutes),
      breakdown: {
        focus: Math.round(row.focus),
        apps: Math.round(row.apps),
        browser: Math.round(row.browser)
      }
    }));
  }

  /**
   * Get weekly summary with comparison to previous week
   */
  getWeeklySummary(weekOffset: number = 0): import('../types').WeeklySummary {
    if (!this.db) {
      return {
        weekStart: '',
        weekEnd: '',
        totalMinutes: 0,
        avgDailyMinutes: 0,
        topDay: null,
        topCategories: [],
        goalsAchieved: 0,
        totalGoals: 0,
        comparisonToPrevious: 0,
        insights: []
      };
    }

    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay() + (weekOffset * 7));
    currentWeekStart.setHours(0, 0, 0, 0);

    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
    currentWeekEnd.setHours(23, 59, 59, 999);

    const weekStart = currentWeekStart.toISOString().split('T')[0];
    const weekEnd = currentWeekEnd.toISOString().split('T')[0];

    // Get total minutes for the week (combining time_entries and app_usage)
    const totalStmt = this.db.prepare(`
      WITH combined_data AS (
        SELECT
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as total_minutes
        FROM time_entries
        WHERE DATE(start_time) BETWEEN ? AND ?

        UNION ALL

        SELECT
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as total_minutes
        FROM app_usage
        WHERE DATE(start_time) BETWEEN ? AND ?
      )
      SELECT SUM(total_minutes) as total_minutes FROM combined_data
    `);
    const totalRow = totalStmt.get(weekStart, weekEnd, weekStart, weekEnd) as any;
    const totalMinutes = Math.round(totalRow?.total_minutes || 0);

    // Get daily breakdown to find top day (combining time_entries and app_usage)
    const dailyStmt = this.db.prepare(`
      WITH daily_combined AS (
        SELECT
          DATE(start_time) as date,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as minutes
        FROM time_entries
        WHERE DATE(start_time) BETWEEN ? AND ?
        GROUP BY DATE(start_time)

        UNION ALL

        SELECT
          DATE(start_time) as date,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as minutes
        FROM app_usage
        WHERE DATE(start_time) BETWEEN ? AND ?
        GROUP BY DATE(start_time)
      )
      SELECT
        date,
        SUM(minutes) as minutes
      FROM daily_combined
      GROUP BY date
      ORDER BY minutes DESC
      LIMIT 1
    `);
    const dailyRow = dailyStmt.get(weekStart, weekEnd, weekStart, weekEnd) as any;
    const topDay = dailyRow ? { date: dailyRow.date, minutes: Math.round(dailyRow.minutes) } : null;

    // Get top categories (combining time_entries and app_usage)
    const catStmt = this.db.prepare(`
      WITH category_combined AS (
        SELECT
          c.id as categoryId,
          c.name as categoryName,
          c.color as categoryColor,
          SUM(CASE WHEN te.duration IS NOT NULL THEN te.duration ELSE
            CAST((JULIANDAY(COALESCE(te.end_time, te.start_time)) - JULIANDAY(te.start_time)) * 86400 AS INTEGER)
          END) / 60.0 as minutes
        FROM time_entries te
        LEFT JOIN categories c ON te.category = c.name
        WHERE DATE(te.start_time) BETWEEN ? AND ?
          AND c.id IS NOT NULL
        GROUP BY c.id

        UNION ALL

        SELECT
          c.id as categoryId,
          c.name as categoryName,
          c.color as categoryColor,
          SUM(CASE WHEN au.duration IS NOT NULL THEN au.duration ELSE
            CAST((JULIANDAY(COALESCE(au.end_time, au.start_time)) - JULIANDAY(au.start_time)) * 86400 AS INTEGER)
          END) / 60.0 as minutes
        FROM app_usage au
        LEFT JOIN categories c ON au.category = c.name
        WHERE DATE(au.start_time) BETWEEN ? AND ?
          AND c.id IS NOT NULL
        GROUP BY c.id
      )
      SELECT
        categoryId,
        categoryName,
        categoryColor,
        SUM(minutes) as minutes
      FROM category_combined
      GROUP BY categoryId
      ORDER BY minutes DESC
      LIMIT 5
    `);
    const catRows = catStmt.all(weekStart, weekEnd, weekStart, weekEnd) as any[];
    const catTotal = catRows.reduce((sum, r) => sum + r.minutes, 0);
    const topCategories = catRows.map(row => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      categoryColor: row.categoryColor,
      minutes: Math.round(row.minutes),
      percentage: catTotal > 0 ? Math.round((row.minutes / catTotal) * 100) : 0
    }));

    // Get goals achievement
    const goalsStmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE
          WHEN gp.achieved = 1 THEN 1
          ELSE 0
        END) as achieved
      FROM productivity_goals pg
      LEFT JOIN goal_progress gp ON pg.id = gp.goal_id
        AND DATE(gp.date) BETWEEN ? AND ?
      WHERE pg.active = 1
    `);
    const goalsRow = goalsStmt.get(weekStart, weekEnd) as any;
    const goalsAchieved = goalsRow?.achieved || 0;
    const totalGoals = goalsRow?.total || 0;

    // Get previous week for comparison (combining time_entries and app_usage)
    const prevWeekStart = new Date(currentWeekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(currentWeekEnd);
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);

    const prevStmt = this.db.prepare(`
      WITH prev_combined_data AS (
        SELECT
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as total_minutes
        FROM time_entries
        WHERE DATE(start_time) BETWEEN ? AND ?

        UNION ALL

        SELECT
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as total_minutes
        FROM app_usage
        WHERE DATE(start_time) BETWEEN ? AND ?
      )
      SELECT SUM(total_minutes) as total_minutes FROM prev_combined_data
    `);
    const prevWeekStartStr = prevWeekStart.toISOString().split('T')[0];
    const prevWeekEndStr = prevWeekEnd.toISOString().split('T')[0];
    const prevRow = prevStmt.get(prevWeekStartStr, prevWeekEndStr, prevWeekStartStr, prevWeekEndStr) as any;
    const prevMinutes = prevRow?.total_minutes || 0;
    const comparisonToPrevious = prevMinutes > 0
      ? Math.round(((totalMinutes - prevMinutes) / prevMinutes) * 100)
      : 0;

    // Generate insights
    const insights = this.generateWeeklyInsights(
      totalMinutes,
      topDay,
      topCategories,
      comparisonToPrevious
    );

    return {
      weekStart,
      weekEnd,
      totalMinutes,
      avgDailyMinutes: Math.round(totalMinutes / 7),
      topDay,
      topCategories,
      goalsAchieved,
      totalGoals,
      comparisonToPrevious,
      insights
    };
  }

  /**
   * Generate behavioral insights from data
   */
  private generateWeeklyInsights(
    totalMinutes: number,
    topDay: { date: string; minutes: number } | null,
    topCategories: import('../types').CategoryTime[],
    comparison: number
  ): string[] {
    const insights: string[] = [];

    if (comparison > 10) {
      insights.push(`Great progress! You're ${comparison}% more productive than last week.`);
    } else if (comparison < -10) {
      insights.push(`Activity decreased ${Math.abs(comparison)}% from last week. Let's get back on track!`);
    }

    if (topDay) {
      const dayName = new Date(topDay.date).toLocaleDateString('en-US', { weekday: 'long' });
      insights.push(`${dayName} was your most productive day with ${topDay.minutes} minutes tracked.`);
    }

    if (topCategories.length > 0) {
      insights.push(`You focused most on ${topCategories[0].categoryName} this week.`);
    }

    const avgDaily = totalMinutes / 7;
    if (avgDaily >= 120) {
      insights.push(`Excellent! You averaged ${Math.round(avgDaily)} minutes per day.`);
    } else if (avgDaily < 60) {
      insights.push(`Try to increase your daily tracking time - currently averaging ${Math.round(avgDaily)} minutes.`);
    }

    return insights;
  }

  /**
   * Get productivity trends over time for charts
   * Groups data by day, week, or month
   */
  getProductivityTrends(
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week' | 'month'
  ): import('../types').ProductivityTrend[] {
    if (!this.db) return [];

    let dateFormat: string;
    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-W%W'; // Year-Week format
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
    }

    const stmt = this.db.prepare(`
      WITH combined_data AS (
        SELECT
          strftime('${dateFormat}', start_time) as period,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as total_minutes
        FROM time_entries
        WHERE DATE(start_time) BETWEEN ? AND ?
        GROUP BY period

        UNION ALL

        SELECT
          strftime('${dateFormat}', start_time) as period,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as total_minutes
        FROM app_usage
        WHERE DATE(start_time) BETWEEN ? AND ? AND (is_idle = 0 OR is_idle IS NULL)
        GROUP BY period
      )
      SELECT
        period as date,
        SUM(total_minutes) as value
      FROM combined_data
      GROUP BY period
      ORDER BY period ASC
    `);

    const rows = stmt.all(startDate, endDate, startDate, endDate) as any[];

    return rows.map(row => ({
      date: row.date,
      value: Math.round(row.value)
    }));
  }

  /**
   * Generate behavioral insights based on activity patterns
   */
  getBehavioralInsights(): import('../types').BehavioralInsight[] {
    if (!this.db) return [];

    const insights: import('../types').BehavioralInsight[] = [];
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const last30DaysStr = last30Days.toISOString().split('T')[0];

    // 1. Peak Hour Insight
    const peakHourStmt = this.db.prepare(`
      WITH hourly_data AS (
        SELECT
          CAST(strftime('%H', start_time) as INTEGER) as hour,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as minutes
        FROM time_entries
        WHERE DATE(start_time) >= ?
        GROUP BY hour

        UNION ALL

        SELECT
          CAST(strftime('%H', start_time) as INTEGER) as hour,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as minutes
        FROM app_usage
        WHERE DATE(start_time) >= ? AND (is_idle = 0 OR is_idle IS NULL)
        GROUP BY hour
      )
      SELECT hour, SUM(minutes) as total_minutes
      FROM hourly_data
      GROUP BY hour
      ORDER BY total_minutes DESC
      LIMIT 1
    `);
    const peakHourRow = peakHourStmt.get(last30DaysStr, last30DaysStr) as any;
    if (peakHourRow) {
      const hour = peakHourRow.hour;
      const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      insights.push({
        type: 'peak_hour',
        title: 'Peak Productivity Hour',
        description: `You're most productive around ${hour}:00 in the ${period}`,
        value: `${hour}:00`
      });
    }

    // 2. Most Productive Day of Week
    const productiveDayStmt = this.db.prepare(`
      WITH daily_data AS (
        SELECT
          CASE CAST(strftime('%w', start_time) as INTEGER)
            WHEN 0 THEN 'Sunday'
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
          END as day_name,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as minutes
        FROM time_entries
        WHERE DATE(start_time) >= ?
        GROUP BY day_name

        UNION ALL

        SELECT
          CASE CAST(strftime('%w', start_time) as INTEGER)
            WHEN 0 THEN 'Sunday'
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
          END as day_name,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as minutes
        FROM app_usage
        WHERE DATE(start_time) >= ? AND (is_idle = 0 OR is_idle IS NULL)
        GROUP BY day_name
      )
      SELECT day_name, SUM(minutes) as total_minutes
      FROM daily_data
      GROUP BY day_name
      ORDER BY total_minutes DESC
      LIMIT 1
    `);
    const productiveDayRow = productiveDayStmt.get(last30DaysStr, last30DaysStr) as any;
    if (productiveDayRow) {
      insights.push({
        type: 'productive_day',
        title: 'Most Productive Day',
        description: `${productiveDayRow.day_name} is your most productive day`,
        value: productiveDayRow.day_name
      });
    }

    // 3. Top Category Trend
    const categoryTrendStmt = this.db.prepare(`
      SELECT
        c.name as category_name,
        SUM(CASE WHEN te.duration IS NOT NULL THEN te.duration ELSE
          CAST((JULIANDAY(COALESCE(te.end_time, te.start_time)) - JULIANDAY(te.start_time)) * 86400 AS INTEGER)
        END) / 60.0 as minutes
      FROM time_entries te
      LEFT JOIN categories c ON te.category_id = c.id
      WHERE DATE(te.start_time) >= ? AND c.name IS NOT NULL
      GROUP BY c.name
      ORDER BY minutes DESC
      LIMIT 1
    `);
    const categoryTrendRow = categoryTrendStmt.get(last30DaysStr) as any;
    if (categoryTrendRow) {
      insights.push({
        type: 'category_trend',
        title: 'Top Focus Area',
        description: `You've spent the most time on ${categoryTrendRow.category_name}`,
        value: `${Math.round(categoryTrendRow.minutes)} min`
      });
    }

    // 4. Distraction Analysis (apps with many short sessions)
    const distractionStmt = this.db.prepare(`
      SELECT
        app_name,
        COUNT(*) as session_count,
        AVG(CASE WHEN duration IS NOT NULL THEN duration ELSE
          CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
        END) / 60.0 as avg_session_minutes
      FROM app_usage
      WHERE DATE(start_time) >= ? AND (is_idle = 0 OR is_idle IS NULL)
      GROUP BY app_name
      HAVING COUNT(*) >= 5 AND (AVG(CASE WHEN duration IS NOT NULL THEN duration ELSE
        CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
      END) / 60.0) < 10
      ORDER BY COUNT(*) DESC
      LIMIT 1
    `);
    const distractionRow = distractionStmt.get(last30DaysStr) as any;
    if (distractionRow) {
      insights.push({
        type: 'distraction',
        title: 'Potential Distraction',
        description: `${distractionRow.app_name} has ${distractionRow.session_count} short sessions`,
        value: `${Math.round(distractionRow.avg_session_minutes)} min avg`
      });
    }

    // 5. Focus Quality (Pomodoro completion rate)
    const focusQualityStmt = this.db.prepare(`
      SELECT
        COUNT(*) as total_sessions,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_sessions
      FROM pomodoro_sessions
      WHERE session_type = 'focus' AND DATE(start_time) >= ?
    `);
    const focusQualityRow = focusQualityStmt.get(last30DaysStr) as any;
    if (focusQualityRow && focusQualityRow.total_sessions > 0) {
      const completionRate = (focusQualityRow.completed_sessions / focusQualityRow.total_sessions) * 100;
      const isGood = completionRate >= 75;
      insights.push({
        type: 'focus_quality',
        title: 'Focus Quality',
        description: isGood
          ? `Great focus! You complete ${Math.round(completionRate)}% of your focus sessions`
          : `Try to improve focus - ${Math.round(completionRate)}% completion rate`,
        value: `${Math.round(completionRate)}%`,
        trend: {
          value: completionRate,
          isPositive: isGood
        }
      });
    }

    // 6. Weekly Streak
    const streakStmt = this.db.prepare(`
      WITH daily_activity AS (
        SELECT DISTINCT DATE(start_time) as activity_date
        FROM time_entries
        WHERE DATE(start_time) >= DATE('now', '-60 days')

        UNION

        SELECT DISTINCT DATE(start_time) as activity_date
        FROM app_usage
        WHERE DATE(start_time) >= DATE('now', '-60 days') AND (is_idle = 0 OR is_idle IS NULL)
      ),
      date_sequence AS (
        SELECT activity_date, LAG(activity_date) OVER (ORDER BY activity_date) as prev_date
        FROM daily_activity
        ORDER BY activity_date DESC
      ),
      streak_calc AS (
        SELECT
          activity_date,
          CASE WHEN julianday(activity_date) - julianday(prev_date) = 1 THEN 0 ELSE 1 END as is_break
        FROM date_sequence
      )
      SELECT COUNT(*) as streak_days
      FROM streak_calc
      WHERE is_break = 0
      ORDER BY activity_date DESC
    `);
    const streakRow = streakStmt.get() as any;
    if (streakRow && streakRow.streak_days > 0) {
      const days = streakRow.streak_days + 1; // +1 to include today
      insights.push({
        type: 'streak',
        title: 'Activity Streak',
        description: days >= 7
          ? `Impressive! ${days} days of consistent tracking`
          : `Keep it up! ${days} day${days > 1 ? 's' : ''} streak`,
        value: `${days} days`,
        trend: {
          value: days,
          isPositive: days >= 7
        }
      });
    }

    return insights;
  }

  /**
   * Get overall analytics summary
   */
  getAnalyticsSummary(): import('../types').AnalyticsSummary {
    if (!this.db) {
      return {
        productivityScore: 0,
        totalProductiveMinutes: 0,
        avgDailyFocusHours: 0,
        peakHour: 9,
        mostProductiveDay: 'Monday',
        weeklyStreak: 0
      };
    }

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const last30DaysStr = last30Days.toISOString().split('T')[0];

    // Total productive minutes (last 30 days)
    // Use app_usage as the primary source to avoid double-counting with manual time_entries
    // app_usage provides comprehensive automatic tracking of all application usage
    const productiveStmt = this.db.prepare(`
      SELECT
        SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
          CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
        END) / 60.0 as total_minutes
      FROM app_usage
      WHERE DATE(start_time) >= ? AND (is_idle = 0 OR is_idle IS NULL)
    `);
    const productiveRow = productiveStmt.get(last30DaysStr) as any;
    const totalProductiveMinutes = Math.round(productiveRow?.total_minutes || 0);

    // Average daily focus hours
    const avgFocusStmt = this.db.prepare(`
      SELECT AVG(daily_minutes) / 60.0 as avg_hours
      FROM (
        SELECT DATE(start_time) as date, SUM(duration) / 60.0 as daily_minutes
        FROM pomodoro_sessions
        WHERE session_type = 'focus' AND completed = 1 AND DATE(start_time) >= ?
        GROUP BY DATE(start_time)
      )
    `);
    const avgFocusRow = avgFocusStmt.get(last30DaysStr) as any;
    const avgDailyFocusHours = parseFloat((avgFocusRow?.avg_hours || 0).toFixed(1));

    // Peak hour
    const peakHourStmt = this.db.prepare(`
      WITH hourly_data AS (
        SELECT
          CAST(strftime('%H', start_time) as INTEGER) as hour,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) as minutes
        FROM time_entries
        WHERE DATE(start_time) >= ?
        GROUP BY hour

        UNION ALL

        SELECT
          CAST(strftime('%H', start_time) as INTEGER) as hour,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) as minutes
        FROM app_usage
        WHERE DATE(start_time) >= ? AND (is_idle = 0 OR is_idle IS NULL)
        GROUP BY hour
      )
      SELECT hour, SUM(minutes) as total_minutes
      FROM hourly_data
      GROUP BY hour
      ORDER BY total_minutes DESC
      LIMIT 1
    `);
    const peakHourRow = peakHourStmt.get(last30DaysStr, last30DaysStr) as any;
    const peakHour = peakHourRow?.hour || 9;

    // Most productive day
    const productiveDayStmt = this.db.prepare(`
      WITH daily_data AS (
        SELECT
          CASE CAST(strftime('%w', start_time) as INTEGER)
            WHEN 0 THEN 'Sunday'
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
          END as day_name,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) as minutes
        FROM time_entries
        WHERE DATE(start_time) >= ?
        GROUP BY day_name

        UNION ALL

        SELECT
          CASE CAST(strftime('%w', start_time) as INTEGER)
            WHEN 0 THEN 'Sunday'
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
          END as day_name,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) as minutes
        FROM app_usage
        WHERE DATE(start_time) >= ? AND (is_idle = 0 OR is_idle IS NULL)
        GROUP BY day_name
      )
      SELECT day_name, SUM(minutes) as total_minutes
      FROM daily_data
      GROUP BY day_name
      ORDER BY total_minutes DESC
      LIMIT 1
    `);
    const productiveDayRow = productiveDayStmt.get(last30DaysStr, last30DaysStr) as any;
    const mostProductiveDay = productiveDayRow?.day_name || 'Monday';

    // Weekly streak - count consecutive days from most recent activity going backwards
    const streakStmt = this.db.prepare(`
      WITH daily_activity AS (
        SELECT DISTINCT DATE(start_time) as activity_date
        FROM time_entries
        WHERE DATE(start_time) >= DATE('now', '-60 days')

        UNION

        SELECT DISTINCT DATE(start_time) as activity_date
        FROM app_usage
        WHERE DATE(start_time) >= DATE('now', '-60 days') AND (is_idle = 0 OR is_idle IS NULL)
      ),
      ordered_dates AS (
        SELECT
          activity_date,
          ROW_NUMBER() OVER (ORDER BY activity_date DESC) as row_num
        FROM daily_activity
      ),
      streak_calc AS (
        SELECT
          od.activity_date,
          od.row_num,
          CASE
            WHEN od.row_num = 1 THEN 0
            WHEN julianday(od.activity_date) = julianday((
              SELECT activity_date
              FROM ordered_dates
              WHERE row_num = od.row_num - 1
            )) - 1 THEN 0
            ELSE 1
          END as is_break
        FROM ordered_dates od
      )
      SELECT COUNT(*) as streak_days
      FROM streak_calc
      WHERE row_num <= (
        SELECT COALESCE(MIN(row_num), 0)
        FROM streak_calc
        WHERE is_break = 1
      )
      OR NOT EXISTS (SELECT 1 FROM streak_calc WHERE is_break = 1)
    `);
    const streakRow = streakStmt.get() as any;
    const weeklyStreak = streakRow?.streak_days || 0;

    // Calculate productivity score (0-100)
    // Formula: weighted combination of factors
    const dailyAvgMinutes = totalProductiveMinutes / 30;
    const focusQualityStmt = this.db.prepare(`
      SELECT
        COUNT(*) as total_sessions,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_sessions
      FROM pomodoro_sessions
      WHERE session_type = 'focus' AND DATE(start_time) >= ?
    `);
    const focusQualityRow = focusQualityStmt.get(last30DaysStr) as any;
    const focusCompletionRate = focusQualityRow?.total_sessions > 0
      ? (focusQualityRow.completed_sessions / focusQualityRow.total_sessions) * 100
      : 50;

    // Productivity score calculation
    const timeScore = Math.min((dailyAvgMinutes / 240) * 40, 40); // Max 40 points for 4+ hours daily
    const focusScore = (focusCompletionRate / 100) * 30; // Max 30 points for 100% focus completion
    const consistencyScore = Math.min((weeklyStreak / 30) * 30, 30); // Max 30 points for 30+ day streak
    const productivityScore = Math.round(timeScore + focusScore + consistencyScore);

    return {
      productivityScore,
      totalProductiveMinutes,
      avgDailyFocusHours,
      peakHour,
      mostProductiveDay,
      weeklyStreak
    };
  }

  /**
   * Analyze top distracting applications
   */
  getDistractionAnalysis(days: number = 30): import('../types').DistractionMetric[] {
    if (!this.db) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const stmt = this.db.prepare(`
      SELECT
        app_name as appName,
        SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
          CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
        END) / 60.0 as totalMinutes,
        COUNT(*) as sessionCount,
        AVG(CASE WHEN duration IS NOT NULL THEN duration ELSE
          CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
        END) / 60.0 as avgSessionMinutes
      FROM app_usage
      WHERE DATE(start_time) >= ? AND (is_idle = 0 OR is_idle IS NULL)
      GROUP BY app_name
      HAVING COUNT(*) >= 3
      ORDER BY COUNT(*) DESC, AVG(CASE WHEN duration IS NOT NULL THEN duration ELSE
        CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
      END) / 60.0 ASC
      LIMIT 10
    `);

    const rows = stmt.all(startDateStr) as any[];

    return rows.map(row => ({
      appName: row.appName,
      totalMinutes: Math.round(row.totalMinutes),
      sessionCount: row.sessionCount,
      avgSessionMinutes: parseFloat(row.avgSessionMinutes.toFixed(1))
    }));
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}