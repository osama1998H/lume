import Database from 'better-sqlite3';

/**
 * MigrationRunner handles all database schema creation and migrations
 * This keeps the schema logic separate from business logic
 */
export class MigrationRunner {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Run all migrations in order
   */
  runMigrations(): void {
    console.log('🗄️  Running database migrations...');

    this.createTimeTables();
    this.createPomodoroTables();
    this.createGoalTables();
    this.createCategorizationTables();
    this.createTodoTables();
    this.createJunctionTables();
    this.addMissingColumns();
    this.createIndexes();

    console.log('✅ Database migrations complete');
  }

  /**
   * Create time tracking tables
   */
  private createTimeTables(): void {
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
  }

  /**
   * Create Pomodoro tracking tables
   */
  private createPomodoroTables(): void {
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
  }

  /**
   * Create goal tracking tables
   */
  private createGoalTables(): void {
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
  }

  /**
   * Create categorization and tagging tables
   */
  private createCategorizationTables(): void {
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

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL DEFAULT '#8B5CF6',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_category_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_name TEXT NOT NULL UNIQUE,
        category_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS domain_category_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT NOT NULL UNIQUE,
        category_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      )
    `);
  }

  /**
   * Create todo tables
   */
  private createTodoTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL CHECK(status IN ('todo', 'in_progress', 'completed', 'cancelled')) DEFAULT 'todo',
        priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
        category_id INTEGER,
        due_date TEXT,
        due_time TEXT,
        completed_at TEXT,
        estimated_minutes INTEGER,
        actual_minutes INTEGER,
        time_entry_id INTEGER,
        pomodoro_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (time_entry_id) REFERENCES time_entries(id) ON DELETE SET NULL
      )
    `);
  }

  /**
   * Create junction tables for many-to-many relationships
   */
  private createJunctionTables(): void {
    // Time Entry to Tags
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

    // App Usage to Tags
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

    // Pomodoro Session to Tags
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

    // Productivity Goal to Tags
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

    // Todo to Tags
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS todo_tags (
        todo_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (todo_id, tag_id),
        FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `);
  }

  /**
   * Add missing columns to existing tables (migrations)
   * Using try-catch to handle already existing columns
   */
  private addMissingColumns(): void {
    // App usage table migrations
    const appUsageMigrations = [
      `ALTER TABLE app_usage ADD COLUMN category TEXT DEFAULT 'application'`,
      `ALTER TABLE app_usage ADD COLUMN domain TEXT`,
      `ALTER TABLE app_usage ADD COLUMN url TEXT`,
      `ALTER TABLE app_usage ADD COLUMN is_browser BOOLEAN DEFAULT 0`,
      `ALTER TABLE app_usage ADD COLUMN is_idle BOOLEAN DEFAULT 0`,
      `ALTER TABLE app_usage ADD COLUMN category_id INTEGER REFERENCES categories(id)`,
    ];

    for (const migration of appUsageMigrations) {
      try {
        this.db.exec(migration);
      } catch (_error) {
        // Column already exists, ignore
      }
    }

    // Time entries table migrations
    try {
      this.db.exec(`ALTER TABLE time_entries ADD COLUMN category_id INTEGER REFERENCES categories(id)`);
    } catch (_error) {
      // Column already exists, ignore
    }

    try {
      this.db.exec(`ALTER TABLE time_entries ADD COLUMN todo_id INTEGER REFERENCES todos(id) ON DELETE SET NULL`);
    } catch (_error) {
      // Column already exists, ignore
    }

    // Pomodoro sessions table migrations
    try {
      this.db.exec(`ALTER TABLE pomodoro_sessions ADD COLUMN todo_id INTEGER REFERENCES todos(id) ON DELETE SET NULL`);
    } catch (_error) {
      // Column already exists, ignore
    }
  }

  /**
   * Create indexes for better query performance
   */
  private createIndexes(): void {
    // Time entries indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON time_entries(start_time);
      CREATE INDEX IF NOT EXISTS idx_time_entries_category_id ON time_entries(category_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_todo_id ON time_entries(todo_id);
    `);

    // App usage indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_app_usage_start_time ON app_usage(start_time);
      CREATE INDEX IF NOT EXISTS idx_app_usage_app_name ON app_usage(app_name);
      CREATE INDEX IF NOT EXISTS idx_app_usage_category ON app_usage(category);
      CREATE INDEX IF NOT EXISTS idx_app_usage_domain ON app_usage(domain);
      CREATE INDEX IF NOT EXISTS idx_app_usage_is_browser ON app_usage(is_browser);
      CREATE INDEX IF NOT EXISTS idx_app_usage_category_id ON app_usage(category_id);
    `);

    // Pomodoro sessions indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_start_time ON pomodoro_sessions(start_time);
      CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_session_type ON pomodoro_sessions(session_type);
      CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_completed ON pomodoro_sessions(completed);
      CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_todo_id ON pomodoro_sessions(todo_id);
    `);

    // Goal indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_goals_active ON productivity_goals(active);
      CREATE INDEX IF NOT EXISTS idx_goals_goal_type ON productivity_goals(goal_type);
      CREATE INDEX IF NOT EXISTS idx_goals_period ON productivity_goals(period);
      CREATE INDEX IF NOT EXISTS idx_goal_progress_date ON goal_progress(date);
      CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_id ON goal_progress(goal_id);
      CREATE INDEX IF NOT EXISTS idx_goal_progress_achieved ON goal_progress(achieved);
    `);

    // Category and tag indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
      CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
    `);

    // Mapping indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_app_category_mappings_app_name ON app_category_mappings(app_name);
      CREATE INDEX IF NOT EXISTS idx_app_category_mappings_category_id ON app_category_mappings(category_id);
      CREATE INDEX IF NOT EXISTS idx_domain_category_mappings_domain ON domain_category_mappings(domain);
      CREATE INDEX IF NOT EXISTS idx_domain_category_mappings_category_id ON domain_category_mappings(category_id);
    `);

    // Junction table indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_time_entry_tags_time_entry_id ON time_entry_tags(time_entry_id);
      CREATE INDEX IF NOT EXISTS idx_time_entry_tags_tag_id ON time_entry_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_app_usage_tags_app_usage_id ON app_usage_tags(app_usage_id);
      CREATE INDEX IF NOT EXISTS idx_app_usage_tags_tag_id ON app_usage_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_todo_tags_todo_id ON todo_tags(todo_id);
      CREATE INDEX IF NOT EXISTS idx_todo_tags_tag_id ON todo_tags(tag_id);
    `);

    // Todo indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
      CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
      CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
      CREATE INDEX IF NOT EXISTS idx_todos_category_id ON todos(category_id);
      CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at);
      CREATE INDEX IF NOT EXISTS idx_todos_time_entry_id ON todos(time_entry_id);
    `);
  }
}
