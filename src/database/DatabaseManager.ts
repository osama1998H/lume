import Database from 'better-sqlite3';
import path from 'path';

// Migrations
import { MigrationRunner } from './migrations/MigrationRunner';

// Repositories
import { TimeEntryRepository } from './repositories/TimeEntryRepository';
import { AppUsageRepository } from './repositories/AppUsageRepository';
import { CategoryRepository } from './repositories/CategoryRepository';
import { TagRepository } from './repositories/TagRepository';
import { PomodoroRepository } from './repositories/PomodoroRepository';
import { GoalRepository } from './repositories/GoalRepository';
import { MappingRepository } from './repositories/MappingRepository';
import { TodoRepository } from './repositories/TodoRepository';

// Services
import { AnalyticsService } from './analytics/AnalyticsService';

// Types
import type {
  TimeEntry,
  AppUsage,
  Category,
  Tag,
  PomodoroSession,
  PomodoroStats,
  ProductivityGoal,
  GoalProgress,
  GoalWithProgress,
  GoalStats,
  Todo,
  TodoWithCategory,
  TodoStats,
  TodoStatus,
  TodoPriority,
  AppCategoryMapping,
  DomainCategoryMapping,
  DailyStats,
  HourlyPattern,
  HeatmapDay,
  WeeklySummary,
  ProductivityTrend,
  BehavioralInsight,
  AnalyticsSummary,
  ExportData,
  ImportOptions,
  ImportResult,
  UnifiedActivity,
  UnifiedActivityFilters,
  UnifiedActivityUpdateOptions,
  BulkActivityOperation,
  ActivityConflict,
  UnifiedActivityStats,
  ActivitySourceType,
  UnifiedActivityType,
} from '../types';
import type { ActivitySession } from '../types/activity';

/**
 * DatabaseManager - Facade/Coordinator for all database operations
 * Delegates to repositories and services for actual implementation
 * Maintains backward compatibility with existing interface
 */
export class DatabaseManager {
  private db: Database.Database | null = null;
  private dbPath: string | null = null;

  // Repositories
  private timeEntryRepo!: TimeEntryRepository;
  private appUsageRepo!: AppUsageRepository;
  private categoryRepo!: CategoryRepository;
  private tagRepo!: TagRepository;
  private pomodoroRepo!: PomodoroRepository;
  private goalRepo!: GoalRepository;
  private mappingRepo!: MappingRepository;
  private todoRepo!: TodoRepository;

  // Services
  private analyticsService!: AnalyticsService;

  /**
   * Check if repositories are initialized
   */
  private ensureInitialized(): void {
    if (!this.db || !this.timeEntryRepo || !this.appUsageRepo || !this.categoryRepo ||
        !this.tagRepo || !this.pomodoroRepo || !this.goalRepo || !this.mappingRepo ||
        !this.todoRepo || !this.analyticsService) {
      throw new Error('DatabaseManager not initialized. Call initialize() first.');
    }
  }

  /**
   * Initialize the database and all repositories/services
   */
  initialize(userDataPath?: string): void {
    try {
      // Handle both new async style and old sync style for backward compatibility
      if (userDataPath) {
        this.dbPath = path.join(userDataPath, 'lume.db');
      } else {
        throw new Error('Database path not provided');
      }

      console.log('📁 Database path:', this.dbPath);

      this.db = new Database(this.dbPath);
      this.db.pragma('foreign_keys = ON');

      console.log('🔄 Running database migrations...');
      const migrationRunner = new MigrationRunner(this.db);
      migrationRunner.runMigrations();
      console.log('✅ Database migrations completed');

      // Initialize repositories
      this.timeEntryRepo = new TimeEntryRepository(this.db);
      this.appUsageRepo = new AppUsageRepository(this.db);
      this.categoryRepo = new CategoryRepository(this.db);
      this.tagRepo = new TagRepository(this.db);
      this.pomodoroRepo = new PomodoroRepository(this.db);
      this.goalRepo = new GoalRepository(this.db);
      this.mappingRepo = new MappingRepository(this.db);
      this.todoRepo = new TodoRepository(this.db);

      // Initialize services
      this.analyticsService = new AnalyticsService(this.db);

      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      throw error;
    }
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('Database connection closed');
    }
  }

  /**
   * Get database instance (for backwards compatibility)
   */
  getDatabase(): Database.Database | null {
    return this.db;
  }

  /**
   * Clear all data from the database
   * Deletes all records from all tables while preserving the schema
   * Uses a transaction to ensure atomicity
   * @param options - Optional settings to control compaction behavior
   * @returns true if successful, false otherwise
   */
  clearAllData(options: { compact?: boolean } = {}): boolean {
    if (!this.db) {
      console.error('❌ Database not initialized');
      return false;
    }

    const doCompact = options.compact !== false; // Default to true

    try {
      console.log('🗑️  Starting database clear operation...');

      // Use a transaction to ensure all operations succeed or fail together
      const clearTransaction = this.db.transaction(() => {
        // Delete from junction tables first (to avoid foreign key violations)
        this.db!.prepare('DELETE FROM time_entry_tags').run();
        this.db!.prepare('DELETE FROM app_usage_tags').run();
        this.db!.prepare('DELETE FROM pomodoro_session_tags').run();
        this.db!.prepare('DELETE FROM productivity_goal_tags').run();

        // Delete from dependent tables
        this.db!.prepare('DELETE FROM goal_progress').run();

        // Delete from main data tables
        this.db!.prepare('DELETE FROM productivity_goals').run();
        this.db!.prepare('DELETE FROM pomodoro_sessions').run();
        this.db!.prepare('DELETE FROM time_entries').run();
        this.db!.prepare('DELETE FROM app_usage').run();

        // Delete from mapping tables
        this.db!.prepare('DELETE FROM app_category_mappings').run();
        this.db!.prepare('DELETE FROM domain_category_mappings').run();

        // Delete from categorization tables
        this.db!.prepare('DELETE FROM tags').run();
        this.db!.prepare('DELETE FROM categories').run();

        console.log('✅ All data deleted successfully');
      });

      // Execute the transaction
      clearTransaction();

      // Reset AUTO_INCREMENT sequences for all tables
      console.log('🔄 Resetting AUTO_INCREMENT sequences...');
      this.db.prepare("DELETE FROM sqlite_sequence").run();

      // Only checkpoint and vacuum if compaction is enabled and not inside another transaction
      if (doCompact) {
        // Checkpoint the Write-Ahead Log to ensure changes are flushed
        console.log('💾 Flushing Write-Ahead Log...');
        this.db.pragma('wal_checkpoint(TRUNCATE)');

        // VACUUM to reclaim space and compact the database file
        console.log('🗜️  Compacting database (VACUUM)...');
        this.db.prepare('VACUUM').run();
        console.log('✅ Database cleared and compacted successfully');
      } else {
        console.log('✅ Database cleared successfully (compaction skipped)');
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to clear database:', error);
      return false;
    }
  }

  /**
   * Export all data from the database
   * @returns ExportData object containing all tables and metadata
   */
  exportAllData(): ExportData {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      console.log('📦 Starting database export...');

      const exportData: ExportData = {
        version: '2.5.4', // App version from package.json
        schemaVersion: 1, // Current schema version
        exportDate: new Date().toISOString(),
        tables: {
          timeEntries: this.getTimeEntries(),
          appUsage: this.getAppUsage(),
          categories: this.getCategories(),
          tags: this.getTags(),
          pomodoroSessions: this.getPomodoroSessions(),
          productivityGoals: this.getGoals(false), // Get all goals, not just active
          goalProgress: this.getAllGoalProgress(),
          appCategoryMappings: this.getAppCategoryMappings(),
          domainCategoryMappings: this.getDomainCategoryMappings(),
          timeEntryTags: this.getTimeEntryTagsRelations(),
          appUsageTags: this.getAppUsageTagsRelations(),
          pomodoroSessionTags: this.getPomodoroSessionTagsRelations(),
          productivityGoalTags: this.getProductivityGoalTagsRelations(),
        },
      };

      console.log('✅ Database export completed successfully');
      console.log(`📊 Exported ${exportData.tables.timeEntries.length} time entries`);
      console.log(`📊 Exported ${exportData.tables.appUsage.length} app usage records`);
      console.log(`📊 Exported ${exportData.tables.categories.length} categories`);
      console.log(`📊 Exported ${exportData.tables.tags.length} tags`);
      console.log(`📊 Exported ${exportData.tables.pomodoroSessions.length} pomodoro sessions`);
      console.log(`📊 Exported ${exportData.tables.productivityGoals.length} productivity goals`);

      return exportData;
    } catch (error) {
      console.error('❌ Failed to export database:', error);
      throw error;
    }
  }

  /**
   * Import data into the database
   * @param data - ExportData object to import
   * @param options - Import options (strategy, validateOnly)
   * @returns ImportResult with statistics and errors
   */
  importAllData(data: ExportData, options: ImportOptions = { strategy: 'merge' }): ImportResult {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result: ImportResult = {
      success: false,
      recordsImported: 0,
      recordsSkipped: 0,
      recordsUpdated: 0,
      errors: [],
      warnings: [],
    };

    try {
      console.log('📥 Starting database import...');
      console.log(`📋 Import strategy: ${options.strategy}`);

      // Validate data structure
      if (!this.validateExportData(data)) {
        result.errors.push('Invalid export data structure');
        return result;
      }

      // Check version compatibility
      if (data.schemaVersion > 1) {
        result.errors.push(`Incompatible schema version: ${data.schemaVersion}. Current version: 1`);
        return result;
      }

      if (data.schemaVersion < 1) {
        result.warnings.push(`Importing from older schema version: ${data.schemaVersion}`);
      }

      // If validateOnly mode, return here
      if (options.validateOnly) {
        result.success = true;
        return result;
      }

      // Use a transaction to ensure atomicity
      const importTransaction = this.db.transaction(() => {
        // If replace strategy, clear all data first (skip compaction to avoid VACUUM in transaction)
        if (options.strategy === 'replace') {
          console.log('🗑️  Clearing existing data (replace mode)...');
          if (!this.clearAllData({ compact: false })) {
            throw new Error('Failed to clear existing data');
          }
        }

        // Import categories first (they're referenced by other tables)
        result.recordsImported += this.importCategories(data.tables.categories, options.strategy);

        // Import tags
        result.recordsImported += this.importTags(data.tables.tags, options.strategy);

        // Import mappings
        result.recordsImported += this.importAppCategoryMappings(data.tables.appCategoryMappings, options.strategy);
        result.recordsImported += this.importDomainCategoryMappings(data.tables.domainCategoryMappings, options.strategy);

        // Import time entries
        result.recordsImported += this.importTimeEntries(data.tables.timeEntries, options.strategy);

        // Import app usage
        result.recordsImported += this.importAppUsage(data.tables.appUsage, options.strategy);

        // Import pomodoro sessions
        result.recordsImported += this.importPomodoroSessions(data.tables.pomodoroSessions, options.strategy);

        // Import productivity goals
        result.recordsImported += this.importProductivityGoals(data.tables.productivityGoals, options.strategy);

        // Import goal progress
        result.recordsImported += this.importGoalProgress(data.tables.goalProgress, options.strategy);

        // Import tag relations
        result.recordsImported += this.importTagRelations(data.tables, options.strategy);

        console.log('✅ Database import completed successfully');
      });

      // Execute the transaction
      importTransaction();

      // Compact database after transaction if replace strategy was used
      if (options.strategy === 'replace') {
        console.log('💾 Compacting database after replace...');
        this.db.pragma('wal_checkpoint(TRUNCATE)');
        this.db.prepare('VACUUM').run();
        console.log('✅ Database compacted successfully');
      }

      result.success = true;
      console.log(`📊 Imported ${result.recordsImported} records`);
      console.log(`⏭️  Skipped ${result.recordsSkipped} records`);
      console.log(`🔄 Updated ${result.recordsUpdated} records`);

      return result;
    } catch (error) {
      console.error('❌ Failed to import database:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  // ==================== EXPORT HELPER METHODS ====================

  private getAllGoalProgress(): GoalProgress[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT
        id,
        goal_id as goalId,
        date,
        progress_minutes as progressMinutes,
        achieved,
        notified,
        created_at as createdAt,
        updated_at as updatedAt
      FROM goal_progress
      ORDER BY date DESC
    `);

    return stmt.all() as GoalProgress[];
  }

  private getTimeEntryTagsRelations(): Array<{ timeEntryId: number; tagId: number }> {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT time_entry_id as timeEntryId, tag_id as tagId
      FROM time_entry_tags
    `);

    return stmt.all() as Array<{ timeEntryId: number; tagId: number }>;
  }

  private getAppUsageTagsRelations(): Array<{ appUsageId: number; tagId: number }> {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT app_usage_id as appUsageId, tag_id as tagId
      FROM app_usage_tags
    `);

    return stmt.all() as Array<{ appUsageId: number; tagId: number }>;
  }

  private getPomodoroSessionTagsRelations(): Array<{ pomodoroSessionId: number; tagId: number }> {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT pomodoro_session_id as pomodoroSessionId, tag_id as tagId
      FROM pomodoro_session_tags
    `);

    return stmt.all() as Array<{ pomodoroSessionId: number; tagId: number }>;
  }

  private getProductivityGoalTagsRelations(): Array<{ productivityGoalId: number; tagId: number }> {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT productivity_goal_id as productivityGoalId, tag_id as tagId
      FROM productivity_goal_tags
    `);

    return stmt.all() as Array<{ productivityGoalId: number; tagId: number }>;
  }

  // ==================== IMPORT HELPER METHODS ====================

  private validateExportData(data: ExportData): boolean {
    if (!data || typeof data !== 'object') return false;
    if (!data.version || !data.schemaVersion || !data.exportDate) return false;
    if (!data.tables || typeof data.tables !== 'object') return false;

    // Check if all required tables exist
    const requiredTables = [
      'timeEntries', 'appUsage', 'categories', 'tags',
      'pomodoroSessions', 'productivityGoals', 'goalProgress',
      'appCategoryMappings', 'domainCategoryMappings',
      'timeEntryTags', 'appUsageTags', 'pomodoroSessionTags', 'productivityGoalTags'
    ];

    return requiredTables.every(table => Array.isArray(data.tables[table as keyof typeof data.tables]));
  }

  private importCategories(categories: Category[], strategy: string): number {
    let count = 0;
    for (const category of categories) {
      try {
        if (strategy === 'skip_duplicates') {
          const existing = this.getCategoryByName(category.name);
          if (existing) continue;
        }
        this.addCategory(category);
        count++;
      } catch (error) {
        console.warn(`Failed to import category: ${category.name}`, error);
      }
    }
    return count;
  }

  private importTags(tags: Tag[], strategy: string): number {
    let count = 0;
    for (const tag of tags) {
      try {
        if (strategy === 'skip_duplicates') {
          const existing = this.getTagByName(tag.name);
          if (existing) continue;
        }
        this.addTag(tag);
        count++;
      } catch (error) {
        console.warn(`Failed to import tag: ${tag.name}`, error);
      }
    }
    return count;
  }

  private importAppCategoryMappings(mappings: AppCategoryMapping[], strategy: string): number {
    let count = 0;
    for (const mapping of mappings) {
      try {
        if (strategy === 'skip_duplicates') {
          const existing = this.getCategoryIdForApp(mapping.appName);
          if (existing) continue;
        }
        this.addAppCategoryMapping(mapping.appName, mapping.categoryId);
        count++;
      } catch (error) {
        console.warn(`Failed to import app mapping: ${mapping.appName}`, error);
      }
    }
    return count;
  }

  private importDomainCategoryMappings(mappings: DomainCategoryMapping[], strategy: string): number {
    let count = 0;
    for (const mapping of mappings) {
      try {
        if (strategy === 'skip_duplicates') {
          const existing = this.getCategoryIdForDomain(mapping.domain);
          if (existing) continue;
        }
        this.addDomainCategoryMapping(mapping.domain, mapping.categoryId);
        count++;
      } catch (error) {
        console.warn(`Failed to import domain mapping: ${mapping.domain}`, error);
      }
    }
    return count;
  }

  private importTimeEntries(entries: TimeEntry[], _strategy: string): number {
    let count = 0;
    for (const entry of entries) {
      try {
        const entryWithoutId = { ...entry };
        delete entryWithoutId.id;
        delete entryWithoutId.tags; // Tags are imported separately
        this.addTimeEntry(entryWithoutId);
        count++;
      } catch (error) {
        console.warn(`Failed to import time entry: ${entry.task}`, error);
      }
    }
    return count;
  }

  private importAppUsage(usages: AppUsage[], _strategy: string): number {
    let count = 0;
    for (const usage of usages) {
      try {
        const usageWithoutId = { ...usage };
        delete usageWithoutId.id;
        delete usageWithoutId.tags; // Tags are imported separately
        this.addAppUsage(usageWithoutId);
        count++;
      } catch (error) {
        console.warn(`Failed to import app usage: ${usage.appName}`, error);
      }
    }
    return count;
  }

  private importPomodoroSessions(sessions: PomodoroSession[], _strategy: string): number {
    let count = 0;
    for (const session of sessions) {
      try {
        const sessionWithoutId = { ...session };
        delete sessionWithoutId.id;
        delete sessionWithoutId.tags; // Tags are imported separately
        this.addPomodoroSession(sessionWithoutId);
        count++;
      } catch (error) {
        console.warn(`Failed to import pomodoro session: ${session.task}`, error);
      }
    }
    return count;
  }

  private importProductivityGoals(goals: ProductivityGoal[], _strategy: string): number {
    let count = 0;
    for (const goal of goals) {
      try {
        const goalWithoutId = { ...goal };
        delete goalWithoutId.id;
        delete goalWithoutId.tags; // Tags are imported separately
        this.addGoal(goalWithoutId);
        count++;
      } catch (error) {
        console.warn(`Failed to import productivity goal: ${goal.name}`, error);
      }
    }
    return count;
  }

  private importGoalProgress(progress: GoalProgress[], _strategy: string): number {
    if (!this.db) return 0;

    let count = 0;
    for (const prog of progress) {
      try {
        this.updateGoalProgress(prog.goalId, prog.date, prog.progressMinutes);
        count++;
      } catch (error) {
        console.warn(`Failed to import goal progress for goal ${prog.goalId}`, error);
      }
    }
    return count;
  }

  private importTagRelations(tables: ExportData['tables'], _strategy: string): number {
    if (!this.db) return 0;

    let count = 0;

    // Import time entry tags
    for (const relation of tables.timeEntryTags) {
      try {
        this.db.prepare(`
          INSERT OR IGNORE INTO time_entry_tags (time_entry_id, tag_id)
          VALUES (?, ?)
        `).run(relation.timeEntryId, relation.tagId);
        count++;
      } catch (error) {
        console.warn(`Failed to import time entry tag relation`, error);
      }
    }

    // Import app usage tags
    for (const relation of tables.appUsageTags) {
      try {
        this.db.prepare(`
          INSERT OR IGNORE INTO app_usage_tags (app_usage_id, tag_id)
          VALUES (?, ?)
        `).run(relation.appUsageId, relation.tagId);
        count++;
      } catch (error) {
        console.warn(`Failed to import app usage tag relation`, error);
      }
    }

    // Import pomodoro session tags
    for (const relation of tables.pomodoroSessionTags) {
      try {
        this.db.prepare(`
          INSERT OR IGNORE INTO pomodoro_session_tags (pomodoro_session_id, tag_id)
          VALUES (?, ?)
        `).run(relation.pomodoroSessionId, relation.tagId);
        count++;
      } catch (error) {
        console.warn(`Failed to import pomodoro session tag relation`, error);
      }
    }

    // Import productivity goal tags
    for (const relation of tables.productivityGoalTags) {
      try {
        this.db.prepare(`
          INSERT OR IGNORE INTO productivity_goal_tags (productivity_goal_id, tag_id)
          VALUES (?, ?)
        `).run(relation.productivityGoalId, relation.tagId);
        count++;
      } catch (error) {
        console.warn(`Failed to import productivity goal tag relation`, error);
      }
    }

    return count;
  }

  // ==================== TIME ENTRIES ====================

  addTimeEntry(entry: TimeEntry): number {
    this.ensureInitialized();
    return this.timeEntryRepo.insert(entry);
  }

  updateTimeEntry(id: number, updates: Partial<TimeEntry>): boolean {
    this.ensureInitialized();
    return this.timeEntryRepo.update(id, updates);
  }

  deleteTimeEntry(id: number): boolean {
    this.ensureInitialized();
    return this.timeEntryRepo.delete(id);
  }

  getTimeEntries(limit?: number): TimeEntry[] {
    this.ensureInitialized();
    return this.timeEntryRepo.getAll({ limit });
  }

  getTimeEntry(id: number): TimeEntry | null {
    this.ensureInitialized();
    return this.timeEntryRepo.getById(id);
  }

  getActiveTimeEntry(): TimeEntry | null {
    this.ensureInitialized();
    return this.timeEntryRepo.getActive();
  }

  getTimeEntriesByDateRange(startDate: string, endDate: string): TimeEntry[] {
    return this.timeEntryRepo.getByDateRange(startDate, endDate);
  }

  addTimeEntryTags(timeEntryId: number, tagIds: number[]): void {
    this.timeEntryRepo.addTags(timeEntryId, tagIds);
  }

  setTimeEntryTags(timeEntryId: number, tagIds: number[]): void {
    this.timeEntryRepo.setTags(timeEntryId, tagIds);
  }

  getTimeEntryTags(timeEntryId: number): Tag[] {
    return this.timeEntryRepo.getTags(timeEntryId);
  }

  // ==================== APP USAGE ====================

  addAppUsage(usage: AppUsage): number {
    return this.appUsageRepo.insert(usage);
  }

  updateAppUsage(id: number, updates: Partial<AppUsage>): boolean {
    return this.appUsageRepo.update(id, updates);
  }

  deleteAppUsage(id: number): boolean {
    return this.appUsageRepo.delete(id);
  }

  getAppUsage(limit?: number): AppUsage[] {
    return this.appUsageRepo.getAll({ limit });
  }

  getAppUsageByDateRange(startDate: string, endDate: string): AppUsage[] {
    return this.appUsageRepo.getByDateRange(startDate, endDate);
  }

  getActiveAppUsage(): AppUsage[] {
    return this.appUsageRepo.getActive();
  }

  addAppUsageTags(appUsageId: number, tagIds: number[]): void {
    this.appUsageRepo.addTags(appUsageId, tagIds);
  }

  setAppUsageTags(appUsageId: number, tagIds: number[]): void {
    this.appUsageRepo.setTags(appUsageId, tagIds);
  }

  getAppUsageTags(appUsageId: number): Tag[] {
    return this.appUsageRepo.getTags(appUsageId);
  }

  // ==================== CATEGORIES ====================

  addCategory(category: Category): number {
    return this.categoryRepo.insert(category);
  }

  updateCategory(id: number, updates: Partial<Category>): boolean {
    return this.categoryRepo.update(id, updates);
  }

  deleteCategory(id: number): boolean {
    return this.categoryRepo.delete(id);
  }

  getCategories(): Category[] {
    return this.categoryRepo.getAll();
  }

  getCategory(id: number): Category | null {
    return this.categoryRepo.getById(id);
  }

  getCategoryByName(name: string): Category | null {
    return this.categoryRepo.getByName(name);
  }

  categoryNameExists(name: string, excludeId?: number): boolean {
    return this.categoryRepo.nameExists(name, excludeId);
  }

  // ==================== TAGS ====================

  addTag(tag: Tag): number {
    return this.tagRepo.insert(tag);
  }

  updateTag(id: number, updates: Partial<Tag>): boolean {
    return this.tagRepo.update(id, updates);
  }

  deleteTag(id: number): boolean {
    return this.tagRepo.delete(id);
  }

  getTags(): Tag[] {
    return this.tagRepo.getAll();
  }

  getTag(id: number): Tag | null {
    return this.tagRepo.getById(id);
  }

  getTagByName(name: string): Tag | null {
    return this.tagRepo.getByName(name);
  }

  tagNameExists(name: string, excludeId?: number): boolean {
    return this.tagRepo.nameExists(name, excludeId);
  }

  // ==================== POMODORO ====================

  addPomodoroSession(session: PomodoroSession): number {
    return this.pomodoroRepo.insert(session);
  }

  updatePomodoroSession(id: number, updates: Partial<PomodoroSession>): boolean {
    return this.pomodoroRepo.update(id, updates);
  }

  deletePomodoroSession(id: number): boolean {
    return this.pomodoroRepo.delete(id);
  }

  getPomodoroSessions(limit?: number): PomodoroSession[] {
    return this.pomodoroRepo.getAll({ limit });
  }

  getPomodoroSessionsByDateRange(startDate: string, endDate: string): PomodoroSession[] {
    return this.pomodoroRepo.getByDateRange(startDate, endDate);
  }

  getCompletedFocusSessions(limit = 100): PomodoroSession[] {
    return this.pomodoroRepo.getCompletedFocusSessions(limit);
  }

  getPomodoroStats(startDate?: string, endDate?: string): PomodoroStats {
    return this.pomodoroRepo.getStats(startDate, endDate);
  }

  addPomodoroSessionTags(pomodoroSessionId: number, tagIds: number[]): void {
    this.pomodoroRepo.addTags(pomodoroSessionId, tagIds);
  }

  setPomodoroSessionTags(pomodoroSessionId: number, tagIds: number[]): void {
    this.pomodoroRepo.setTags(pomodoroSessionId, tagIds);
  }

  getPomodoroSessionTags(pomodoroSessionId: number): Tag[] {
    return this.pomodoroRepo.getTags(pomodoroSessionId);
  }

  // ==================== GOALS ====================

  addGoal(goal: ProductivityGoal): number {
    return this.goalRepo.insert(goal);
  }

  updateGoal(id: number, updates: Partial<ProductivityGoal>): boolean {
    return this.goalRepo.update(id, updates);
  }

  deleteGoal(id: number): boolean {
    return this.goalRepo.delete(id);
  }

  getGoals(activeOnly = false): ProductivityGoal[] {
    return this.goalRepo.getAll({ activeOnly });
  }

  getGoalProgress(goalId: number, date: string): GoalProgress | null {
    return this.goalRepo.getProgress(goalId, date);
  }

  updateGoalProgress(goalId: number, date: string, minutes: number): void {
    this.goalRepo.updateProgress(goalId, date, minutes);
  }

  getTodayGoalsWithProgress(): GoalWithProgress[] {
    return this.goalRepo.getTodayGoalsWithProgress();
  }

  getGoalAchievementHistory(goalId: number, days: number): GoalProgress[] {
    return this.goalRepo.getAchievementHistory(goalId, days);
  }

  getGoalStats(): GoalStats {
    return this.goalRepo.getStats();
  }

  addProductivityGoalTags(goalId: number, tagIds: number[]): void {
    this.goalRepo.addTags(goalId, tagIds);
  }

  setProductivityGoalTags(goalId: number, tagIds: number[]): void {
    this.goalRepo.setTags(goalId, tagIds);
  }

  getProductivityGoalTags(goalId: number): Tag[] {
    return this.goalRepo.getTags(goalId);
  }

  // ==================== TODOS ====================

  addTodo(todo: Partial<Todo>): number {
    this.ensureInitialized();
    return this.todoRepo.insert(todo);
  }

  updateTodo(id: number, updates: Partial<Todo>): boolean {
    this.ensureInitialized();
    return this.todoRepo.update(id, updates);
  }

  deleteTodo(id: number): boolean {
    this.ensureInitialized();
    return this.todoRepo.delete(id);
  }

  getTodos(options?: { status?: TodoStatus; priority?: TodoPriority }): Todo[] {
    this.ensureInitialized();
    return this.todoRepo.getAll(options);
  }

  getTodo(id: number): Todo | null {
    this.ensureInitialized();
    return this.todoRepo.getById(id);
  }

  getTodoStats(): TodoStats {
    this.ensureInitialized();
    return this.todoRepo.getStats();
  }

  getTodosWithCategory(): TodoWithCategory[] {
    return this.todoRepo.getAllWithCategory();
  }

  getOverdueTodos(): Todo[] {
    return this.todoRepo.getOverdue();
  }

  linkTodoToTimeEntry(todoId: number, timeEntryId: number): boolean {
    return this.todoRepo.linkTimeEntry(todoId, timeEntryId);
  }

  incrementTodoPomodoro(todoId: number): boolean {
    return this.todoRepo.incrementPomodoroCount(todoId);
  }

  addTodoTags(todoId: number, tagIds: number[]): void {
    this.todoRepo.addTags(todoId, tagIds);
  }

  setTodoTags(todoId: number, tagIds: number[]): void {
    this.todoRepo.setTags(todoId, tagIds);
  }

  getTodoTags(todoId: number): Tag[] {
    return this.todoRepo.getTags(todoId);
  }

  getTodosWithTags(options?: { status?: TodoStatus; priority?: TodoPriority }): (Todo & { tags: Tag[] })[] {
    return this.todoRepo.getAllWithTags(options);
  }

  // ==================== CATEGORY MAPPINGS ====================

  addAppCategoryMapping(appName: string, categoryId: number): number {
    return this.mappingRepo.addAppMapping(appName, categoryId);
  }

  deleteAppCategoryMapping(id: number): boolean {
    return this.mappingRepo.deleteAppMapping(id);
  }

  getAppCategoryMappings(): AppCategoryMapping[] {
    return this.mappingRepo.getAppMappings();
  }

  getCategoryIdForApp(appName: string): number | null {
    return this.mappingRepo.getCategoryIdForApp(appName);
  }

  addDomainCategoryMapping(domain: string, categoryId: number): number {
    return this.mappingRepo.addDomainMapping(domain, categoryId);
  }

  deleteDomainCategoryMapping(id: number): boolean {
    return this.mappingRepo.deleteDomainMapping(id);
  }

  getDomainCategoryMappings(): DomainCategoryMapping[] {
    return this.mappingRepo.getDomainMappings();
  }

  getCategoryIdForDomain(domain: string): number | null {
    return this.mappingRepo.getCategoryIdForDomain(domain);
  }

  // ==================== ANALYTICS ====================

  queryTotalActiveTime(startTime: string, endTime: string): number {
    this.ensureInitialized();
    return this.analyticsService.queryTotalActiveTime(startTime, endTime);
  }

  queryCategoryTime(category: string, startTime: string, endTime: string): number {
    this.ensureInitialized();
    return this.analyticsService.queryCategoryTime(category, startTime, endTime);
  }

  queryAppTime(appName: string, startTime: string, endTime: string): number {
    this.ensureInitialized();
    return this.analyticsService.queryAppTime(appName, startTime, endTime);
  }

  getDailyProductivityStats(startDate: string, endDate: string): DailyStats[] {
    this.ensureInitialized();
    return this.analyticsService.getDailyProductivityStats(startDate, endDate);
  }

  getHourlyPatterns(days: number): HourlyPattern[] {
    this.ensureInitialized();
    return this.analyticsService.getHourlyPatterns(days);
  }

  getHeatmapData(year: number): HeatmapDay[] {
    this.ensureInitialized();
    return this.analyticsService.getHeatmapData(year);
  }

  getWeeklySummary(weekOffset: number = 0): WeeklySummary {
    this.ensureInitialized();
    return this.analyticsService.getWeeklySummary(weekOffset);
  }

  getProductivityTrends(startDate: string, endDate: string, groupBy: 'day' | 'week' | 'month'): ProductivityTrend[] {
    this.ensureInitialized();
    return this.analyticsService.getProductivityTrends(startDate, endDate, groupBy);
  }

  getBehavioralInsights(): BehavioralInsight[] {
    this.ensureInitialized();
    return this.analyticsService.getBehavioralInsights();
  }

  getAnalyticsSummary(): AnalyticsSummary {
    this.ensureInitialized();
    return this.analyticsService.getAnalyticsSummary();
  }

  getDistractionAnalysis(days: number = 30): any[] {
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
      avgSessionMinutes: Math.round(row.avgSessionMinutes),
      distractionScore: Math.round(row.sessionCount * (10 / Math.max(row.avgSessionMinutes, 1))),
    }));
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
        au.app_name AS title,
        au.start_time AS startTime,
        au.end_time AS endTime,
        au.duration,
        au.category,
        au.domain,
        au.url,
        au.window_title AS windowTitle,
        au.is_browser AS isBrowser,
        c.id AS categoryId,
        c.name AS categoryName,
        c.color AS categoryColor
      FROM app_usage au
      LEFT JOIN categories c ON au.category = c.name
      WHERE au.end_time IS NOT NULL
        AND datetime(au.start_time) < datetime(?)
        AND datetime(au.end_time) > datetime(?)
      ORDER BY au.start_time ASC
    `);

    const timeEntries = timeEntriesStmt.all(endDate, startDate) as any[];
    const appUsage = appUsageStmt.all(endDate, startDate) as any[];

    return [...timeEntries, ...appUsage].sort((a, b) => {
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }

  getTopApplications(limit = 10): Array<{ name: string; totalDuration: number }> {
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

    return stmt.all(limit) as Array<{ name: string; totalDuration: number }>;
  }

  getTopWebsites(limit = 10): Array<{ domain: string; totalDuration: number }> {
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

    return stmt.all(limit) as Array<{ domain: string; totalDuration: number }>;
  }

  // Backward compatibility alias
  getCategoryById(id: number): Category | null {
    return this.getCategory(id);
  }

  // ==================== ACTIVITY SESSION (Backward Compatibility) ====================

  /**
   * Add activity session (backward compatibility wrapper for addAppUsage)
   * Maps ActivitySession (snake_case) to AppUsage (camelCase)
   */
  addActivitySession(session: ActivitySession): number {
    const appUsage: AppUsage = {
      appName: session.app_name,
      windowTitle: session.window_title,
      category: session.category,
      domain: session.domain,
      url: session.url,
      startTime: session.start_time,
      endTime: session.end_time,
      duration: session.duration,
      isBrowser: session.is_browser,
      isIdle: false,
    };
    return this.addAppUsage(appUsage);
  }

  /**
   * Get activity sessions (backward compatibility wrapper for getAppUsage)
   */
  getActivitySessions(limit?: number): ActivitySession[] {
    const appUsages = this.getAppUsage(limit);
    return appUsages.map(usage => ({
      id: usage.id,
      app_name: usage.appName,
      window_title: usage.windowTitle,
      category: (usage.category as 'application' | 'website') || 'application',
      domain: usage.domain,
      url: usage.url,
      start_time: usage.startTime,
      end_time: usage.endTime,
      duration: usage.duration,
      is_browser: usage.isBrowser || false,
      created_at: usage.createdAt,
    }));
  }

  // ==================== UNIFIED ACTIVITY LOG ====================

  /**
   * Get unified activities from all sources (time entries, app usage, pomodoro)
   * with optional filtering
   */
  getUnifiedActivities(
    startDate: string,
    endDate: string,
    filters?: UnifiedActivityFilters
  ): UnifiedActivity[] {
    if (!this.db) return [];

    const activities: UnifiedActivity[] = [];

    try {
      // Determine which sources to query based on filters
      const sourceTypes = filters?.sourceTypes || ['manual', 'automatic', 'pomodoro'];

      // Query time entries (manual activities)
      if (sourceTypes.includes('manual')) {
        const timeEntries = this.queryTimeEntriesAsUnified(startDate, endDate, filters);
        activities.push(...timeEntries);
      }

      // Query app usage (automatic activities)
      if (sourceTypes.includes('automatic')) {
        const appUsage = this.queryAppUsageAsUnified(startDate, endDate, filters);
        activities.push(...appUsage);
      }

      // Query pomodoro sessions
      if (sourceTypes.includes('pomodoro')) {
        const pomodoroSessions = this.queryPomodoroAsUnified(startDate, endDate, filters);
        activities.push(...pomodoroSessions);
      }

      // Sort by start time
      activities.sort((a, b) => {
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });

      // Apply additional filters
      return this.applyUnifiedActivityFilters(activities, filters);
    } catch (error) {
      console.error('Failed to get unified activities:', error);
      return [];
    }
  }

  /**
   * Query time entries and transform to UnifiedActivity format
   */
  private queryTimeEntriesAsUnified(
    startDate: string,
    endDate: string,
    _filters?: UnifiedActivityFilters
  ): UnifiedActivity[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT
        te.id,
        te.task,
        te.start_time,
        te.end_time,
        te.duration,
        te.category,
        te.category_id,
        te.created_at,
        c.id AS categoryId,
        c.name AS categoryName,
        c.color AS categoryColor
      FROM time_entries te
      LEFT JOIN categories c ON te.category_id = c.id OR te.category = c.name
      WHERE te.end_time IS NOT NULL
        AND datetime(te.start_time) < datetime(?)
        AND datetime(te.end_time) > datetime(?)
      ORDER BY te.start_time ASC
    `);

    const rows = stmt.all(endDate, startDate) as any[];

    return rows.map(row => {
      const tags = row.id ? this.getTimeEntryTags(row.id) : [];

      return {
        id: row.id,
        sourceType: 'manual' as ActivitySourceType,
        type: 'time_entry' as UnifiedActivityType,
        title: row.task,
        startTime: row.start_time,
        endTime: row.end_time,
        duration: row.duration || 0,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        categoryColor: row.categoryColor,
        tags,
        metadata: {
          originalId: row.id,
          originalTable: 'time_entries' as const,
        },
        isEditable: true,
        editableFields: ['title', 'startTime', 'endTime', 'duration', 'categoryId', 'tags'],
        createdAt: row.created_at,
      };
    });
  }

  /**
   * Query app usage and transform to UnifiedActivity format
   */
  private queryAppUsageAsUnified(
    startDate: string,
    endDate: string,
    _filters?: UnifiedActivityFilters
  ): UnifiedActivity[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT
        au.id,
        au.app_name,
        au.window_title,
        au.start_time,
        au.end_time,
        au.duration,
        au.category,
        au.category_id,
        au.domain,
        au.url,
        au.is_browser,
        au.is_idle,
        au.created_at,
        c.id AS categoryId,
        c.name AS categoryName,
        c.color AS categoryColor
      FROM app_usage au
      LEFT JOIN categories c ON au.category_id = c.id OR au.category = c.name
      WHERE au.end_time IS NOT NULL
        AND datetime(au.start_time) < datetime(?)
        AND datetime(au.end_time) > datetime(?)
      ORDER BY au.start_time ASC
    `);

    const rows = stmt.all(endDate, startDate) as any[];

    return rows.map(row => {
      const tags = row.id ? this.getAppUsageTags(row.id) : [];
      const isBrowser = row.is_browser === 1;

      return {
        id: row.id,
        sourceType: 'automatic' as ActivitySourceType,
        type: (isBrowser ? 'browser' : 'app') as UnifiedActivityType,
        title: isBrowser ? (row.domain || row.app_name) : row.app_name,
        startTime: row.start_time,
        endTime: row.end_time,
        duration: row.duration || 0,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        categoryColor: row.categoryColor,
        tags,
        metadata: {
          appName: row.app_name,
          windowTitle: row.window_title,
          domain: row.domain,
          url: row.url,
          isBrowser,
          isIdle: row.is_idle === 1,
          originalId: row.id,
          originalTable: 'app_usage' as const,
        },
        isEditable: true,
        // Automatic activities can only edit category and tags, not time/app
        editableFields: ['categoryId', 'tags'],
        createdAt: row.created_at,
      };
    });
  }

  /**
   * Query pomodoro sessions and transform to UnifiedActivity format
   */
  private queryPomodoroAsUnified(
    startDate: string,
    endDate: string,
    _filters?: UnifiedActivityFilters
  ): UnifiedActivity[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT
        ps.id,
        ps.task,
        ps.session_type,
        ps.start_time,
        ps.end_time,
        ps.duration,
        ps.completed,
        ps.interrupted,
        ps.created_at
      FROM pomodoro_sessions ps
      WHERE ps.end_time IS NOT NULL
        AND datetime(ps.start_time) < datetime(?)
        AND datetime(ps.end_time) > datetime(?)
      ORDER BY ps.start_time ASC
    `);

    const rows = stmt.all(endDate, startDate) as any[];

    return rows.map(row => {
      const tags = row.id ? this.getPomodoroSessionTags(row.id) : [];
      const isFocus = row.session_type === 'focus';

      return {
        id: row.id,
        sourceType: 'pomodoro' as ActivitySourceType,
        type: (isFocus ? 'pomodoro_focus' : 'pomodoro_break') as UnifiedActivityType,
        title: isFocus ? row.task : `${row.session_type} Break`,
        startTime: row.start_time,
        endTime: row.end_time,
        duration: row.duration || 0,
        tags,
        metadata: {
          sessionType: row.session_type,
          completed: row.completed === 1,
          interrupted: row.interrupted === 1,
          originalId: row.id,
          originalTable: 'pomodoro_sessions' as const,
        },
        isEditable: true,
        // Pomodoro sessions can only edit task name and tags, not duration
        editableFields: isFocus ? ['title', 'tags'] : ['tags'],
        createdAt: row.created_at,
      };
    });
  }

  /**
   * Apply additional filters to unified activities
   */
  private applyUnifiedActivityFilters(
    activities: UnifiedActivity[],
    filters?: UnifiedActivityFilters
  ): UnifiedActivity[] {
    if (!filters) return activities;

    return activities.filter(activity => {
      // Filter by activity types
      if (filters.activityTypes && filters.activityTypes.length > 0) {
        if (!filters.activityTypes.includes(activity.type)) {
          return false;
        }
      }

      // Filter by categories
      if (filters.categories && filters.categories.length > 0) {
        if (!activity.categoryId || !filters.categories.includes(activity.categoryId)) {
          return false;
        }
      }

      // Filter by tags
      if (filters.tags && filters.tags.length > 0) {
        const activityTagIds = activity.tags?.map(t => t.id).filter((id): id is number => id != null) || [];
        const hasMatchingTag = filters.tags.some(tagId => activityTagIds.includes(tagId));
        if (!hasMatchingTag) {
          return false;
        }
      }

      // Filter by search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesTitle = activity.title.toLowerCase().includes(query);
        const matchesCategory = activity.categoryName?.toLowerCase().includes(query);
        const matchesApp = activity.metadata?.appName?.toLowerCase().includes(query);
        const matchesDomain = activity.metadata?.domain?.toLowerCase().includes(query);

        if (!matchesTitle && !matchesCategory && !matchesApp && !matchesDomain) {
          return false;
        }
      }

      // Filter by duration
      if (filters.minDuration !== undefined && activity.duration < filters.minDuration) {
        return false;
      }
      if (filters.maxDuration !== undefined && activity.duration > filters.maxDuration) {
        return false;
      }

      // Filter by editability
      if (filters.isEditable !== undefined && activity.isEditable !== filters.isEditable) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get a single unified activity by ID and source type
   */
  getUnifiedActivity(id: number, sourceType: ActivitySourceType): UnifiedActivity | null {
    if (!this.db) return null;

    try {
      const activities = this.getUnifiedActivities(
        new Date('1970-01-01').toISOString(),
        new Date('2100-12-31').toISOString(),
        { sourceTypes: [sourceType] }
      );

      return activities.find(a => a.id === id && a.sourceType === sourceType) || null;
    } catch (error) {
      console.error('Failed to get unified activity:', error);
      return null;
    }
  }

  /**
   * Update a unified activity
   */
  updateUnifiedActivity(options: UnifiedActivityUpdateOptions): boolean {
    if (!this.db) return false;

    const { id, sourceType, updates, validateOverlap: _validateOverlap = true } = options;

    try {
      // Validate that only editable fields are being updated
      const activity = this.getUnifiedActivity(id, sourceType);
      if (!activity) {
        console.error('Activity not found');
        return false;
      }

      if (!activity.isEditable) {
        console.error('Activity is not editable');
        return false;
      }

      // Check if updates contain only editable fields
      const updateKeys = Object.keys(updates);
      const invalidFields = updateKeys.filter(key => !activity.editableFields.includes(key));
      if (invalidFields.length > 0) {
        console.error(`Cannot update non-editable fields: ${invalidFields.join(', ')}`);
        return false;
      }

      // Route to appropriate update method based on source type
      switch (sourceType) {
        case 'manual':
          return this.updateTimeEntryFromUnified(id, updates);
        case 'automatic':
          return this.updateAppUsageFromUnified(id, updates);
        case 'pomodoro':
          return this.updatePomodoroFromUnified(id, updates);
        default:
          return false;
      }
    } catch (error) {
      console.error('Failed to update unified activity:', error);
      return false;
    }
  }

  /**
   * Update time entry from unified activity updates
   */
  private updateTimeEntryFromUnified(id: number, updates: Partial<UnifiedActivity>): boolean {
    const timeEntryUpdates: Partial<TimeEntry> = {};

    if (updates.title !== undefined) timeEntryUpdates.task = updates.title;
    if (updates.startTime !== undefined) timeEntryUpdates.startTime = updates.startTime;
    if (updates.endTime !== undefined) timeEntryUpdates.endTime = updates.endTime;
    if (updates.duration !== undefined) timeEntryUpdates.duration = updates.duration;
    if (updates.categoryId !== undefined) timeEntryUpdates.categoryId = updates.categoryId;

    const success = this.updateTimeEntry(id, timeEntryUpdates);

    // Update tags if provided
    if (success && updates.tags) {
      const tagIds = updates.tags.map(t => t.id).filter((id): id is number => id != null);
      this.setTimeEntryTags(id, tagIds);
    }

    return success;
  }

  /**
   * Update app usage from unified activity updates
   */
  private updateAppUsageFromUnified(id: number, updates: Partial<UnifiedActivity>): boolean {
    const appUsageUpdates: Partial<AppUsage> = {};

    if (updates.categoryId !== undefined) appUsageUpdates.categoryId = updates.categoryId;

    const success = this.updateAppUsage(id, appUsageUpdates);

    // Update tags if provided
    if (success && updates.tags) {
      const tagIds = updates.tags.map(t => t.id).filter((id): id is number => id != null);
      this.setAppUsageTags(id, tagIds);
    }

    return success;
  }

  /**
   * Update pomodoro session from unified activity updates
   */
  private updatePomodoroFromUnified(id: number, updates: Partial<UnifiedActivity>): boolean {
    const pomodoroUpdates: Partial<PomodoroSession> = {};

    if (updates.title !== undefined) pomodoroUpdates.task = updates.title;

    const success = this.updatePomodoroSession(id, pomodoroUpdates);

    // Update tags if provided
    if (success && updates.tags) {
      const tagIds = updates.tags.map(t => t.id).filter((id): id is number => id != null);
      this.setPomodoroSessionTags(id, tagIds);
    }

    return success;
  }

  /**
   * Delete a unified activity
   */
  deleteUnifiedActivity(id: number, sourceType: ActivitySourceType): boolean {
    if (!this.db) return false;

    try {
      switch (sourceType) {
        case 'manual':
          return this.deleteTimeEntry(id);
        case 'automatic':
          return this.deleteAppUsage(id);
        case 'pomodoro':
          return this.deletePomodoroSession(id);
        default:
          return false;
      }
    } catch (error) {
      console.error('Failed to delete unified activity:', error);
      return false;
    }
  }

  /**
   * Bulk update activities
   */
  bulkUpdateActivities(operation: BulkActivityOperation): { success: boolean; updated: number; failed: number } {
    if (!this.db) {
      return { success: false, updated: 0, failed: 0 };
    }

    const result = { success: true, updated: 0, failed: 0 };

    if (operation.operation !== 'update' || !operation.updates) {
      return { success: false, updated: 0, failed: 0 };
    }

    const transaction = this.db.transaction(() => {
      for (const { id, sourceType } of operation.activityIds) {
        try {
          const success = this.updateUnifiedActivity({
            id,
            sourceType,
            updates: operation.updates!,
            validateOverlap: false,
          });

          if (success) {
            result.updated++;
          } else {
            result.failed++;
          }
        } catch (error) {
          console.error(`Failed to update activity ${id}:`, error);
          result.failed++;
        }
      }
    });

    try {
      transaction();
      result.success = true;
    } catch (error) {
      console.error('Bulk update transaction failed:', error);
      result.success = false;
    }

    return result;
  }

  /**
   * Bulk delete activities
   */
  bulkDeleteActivities(
    activityIds: Array<{ id: number; sourceType: ActivitySourceType }>
  ): { success: boolean; deleted: number; failed: number } {
    if (!this.db) {
      return { success: false, deleted: 0, failed: 0 };
    }

    const result = { success: true, deleted: 0, failed: 0 };

    const transaction = this.db.transaction(() => {
      for (const { id, sourceType } of activityIds) {
        try {
          const success = this.deleteUnifiedActivity(id, sourceType);

          if (success) {
            result.deleted++;
          } else {
            result.failed++;
          }
        } catch (error) {
          console.error(`Failed to delete activity ${id}:`, error);
          result.failed++;
        }
      }
    });

    try {
      transaction();
      result.success = true;
    } catch (error) {
      console.error('Bulk delete transaction failed:', error);
      result.success = false;
    }

    return result;
  }

  /**
   * Get activity conflicts (overlaps, duplicates, gaps)
   */
  getActivityConflicts(startDate: string, endDate: string): ActivityConflict[] {
    const activities = this.getUnifiedActivities(startDate, endDate);
    const conflicts: ActivityConflict[] = [];

    // Check for overlaps within same source type
    for (let i = 0; i < activities.length; i++) {
      for (let j = i + 1; j < activities.length; j++) {
        const a1 = activities[i];
        const a2 = activities[j];

        // Skip if either activity is undefined
        if (!a1 || !a2) {
          continue;
        }

        // Only check overlaps within same source type
        if (a1.sourceType !== a2.sourceType) continue;

        const start1 = new Date(a1.startTime).getTime();
        const end1 = new Date(a1.endTime).getTime();
        const start2 = new Date(a2.startTime).getTime();
        const end2 = new Date(a2.endTime).getTime();

        // Check for overlap
        if (start1 < end2 && start2 < end1) {
          conflicts.push({
            conflictType: 'overlap',
            activities: [a1, a2],
            suggestedResolution: 'merge',
            message: `Activities overlap: "${a1.title}" and "${a2.title}"`,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Get unified activity statistics
   */
  getUnifiedActivityStats(startDate: string, endDate: string): UnifiedActivityStats {
    const activities = this.getUnifiedActivities(startDate, endDate);

    const stats: UnifiedActivityStats = {
      totalActivities: activities.length,
      totalDuration: activities.reduce((sum, a) => sum + a.duration, 0),
      bySourceType: {
        manual: activities.filter(a => a.sourceType === 'manual').length,
        automatic: activities.filter(a => a.sourceType === 'automatic').length,
        pomodoro: activities.filter(a => a.sourceType === 'pomodoro').length,
      },
      byCategory: [],
      editableCount: activities.filter(a => a.isEditable).length,
      conflictsCount: this.getActivityConflicts(startDate, endDate).length,
      gapsDetected: 0, // TODO: Implement gap detection
    };

    // Calculate category breakdown
    const categoryMap = new Map<number, { name: string; color: string; time: number; count: number }>();

    for (const activity of activities) {
      if (activity.categoryId && activity.categoryName) {
        const existing = categoryMap.get(activity.categoryId);
        if (existing) {
          existing.time += activity.duration;
          existing.count++;
        } else {
          categoryMap.set(activity.categoryId, {
            name: activity.categoryName,
            color: activity.categoryColor || '#3B82F6',
            time: activity.duration,
            count: 1,
          });
        }
      }
    }

    stats.byCategory = Array.from(categoryMap.entries()).map(([id, data]) => ({
      categoryId: id,
      categoryName: data.name,
      categoryColor: data.color,
      totalTime: data.time,
      percentage: stats.totalDuration > 0 ? (data.time / stats.totalDuration) * 100 : 0,
      activityCount: data.count,
    }));

    return stats;
  }

  /**
   * Search activities with full-text search across all activity types
   * Searches through titles, app names, domains, categories, and tags
   */
  searchActivities(
    query: string,
    filters?: UnifiedActivityFilters
  ): UnifiedActivity[] {
    if (!query.trim()) {
      // If no query, return filtered activities
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30); // Last 30 days by default

      return this.getUnifiedActivities(
        startDate.toISOString(),
        today.toISOString(),
        filters
      );
    }

    // Create search filter
    const dateRange = filters?.dateRange || {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // Last 90 days
      end: new Date().toISOString(),
    };

    const searchFilters: UnifiedActivityFilters = {
      ...filters,
      dateRange,
      searchQuery: query,
    };

    return this.getUnifiedActivities(
      dateRange.start,
      dateRange.end,
      searchFilters
    );
  }

  /**
   * Merge multiple activities into one
   * This is a convenience method that delegates to ActivityMergeService
   * but provides a database-level interface
   */
  async mergeActivitiesById(
    activityIds: Array<{ id: number; sourceType: ActivitySourceType }>,
    strategy: 'longest' | 'earliest' | 'latest' = 'longest'
  ): Promise<{ success: boolean; mergedActivity?: UnifiedActivity; error?: string }> {
    if (!this.db) {
      return { success: false, error: 'Database not initialized' };
    }

    try {
      // Get all activities to merge
      const activitiesToMerge: UnifiedActivity[] = [];

      for (const { id, sourceType } of activityIds) {
        const activity = this.getUnifiedActivity(id, sourceType);
        if (activity) {
          activitiesToMerge.push(activity);
        }
      }

      if (activitiesToMerge.length === 0) {
        return { success: false, error: 'No activities found to merge' };
      }

      if (activitiesToMerge.length === 1) {
        return { success: true, mergedActivity: activitiesToMerge[0] };
      }

      // Check if all activities are from the same source type
      const sourceTypes = new Set(activitiesToMerge.map(a => a.sourceType));
      if (sourceTypes.size > 1) {
        return { success: false, error: 'Cannot merge activities from different source types' };
      }

      const firstActivity = activitiesToMerge[0];
      if (!firstActivity) {
        return { success: false, error: 'No activities found to merge' };
      }

      const sourceType = firstActivity.sourceType;

      // Sort activities by start time
      const sorted = [...activitiesToMerge].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      const firstSorted = sorted[0];
      if (!firstSorted) {
        return { success: false, error: 'Sorted activities array is empty' };
      }

      // Determine base activity based on strategy
      let baseActivity: UnifiedActivity;
      switch (strategy) {
        case 'longest':
          baseActivity = sorted.reduce((prev, current) =>
            current.duration > prev.duration ? current : prev
          , firstSorted);
          break;
        case 'earliest':
          baseActivity = firstSorted;
          break;
        case 'latest': {
          const lastActivity = sorted[sorted.length - 1];
          if (!lastActivity) {
            return { success: false, error: 'Cannot get last activity' };
          }
          baseActivity = lastActivity;
          break;
        }
        default:
          baseActivity = firstSorted;
      }

      // Calculate merged time range
      const earliestStart = firstSorted.startTime;
      const latestEnd = sorted.reduce((latest, activity) =>
        new Date(activity.endTime).getTime() > new Date(latest).getTime() ? activity.endTime : latest
      , firstSorted.endTime);

      // Calculate merged duration
      const mergedDuration = Math.floor(
        (new Date(latestEnd).getTime() - new Date(earliestStart).getTime()) / 1000
      );

      // Combine tags from all activities (deduplicate by tag ID)
      const allTags = this.mergeTags(activitiesToMerge);

      // Use transaction to update base activity and delete others
      const transaction = this.db.transaction(() => {
        // Update the base activity with merged data
        const updateResult = this.updateUnifiedActivity({
          id: baseActivity.id,
          sourceType: baseActivity.sourceType,
          updates: {
            startTime: earliestStart,
            endTime: latestEnd,
            duration: mergedDuration,
            tags: allTags,
          },
          validateOverlap: false,
        });

        if (!updateResult) {
          throw new Error('Failed to update base activity');
        }

        // Delete other activities
        for (const activity of sorted) {
          if (activity.id !== baseActivity.id) {
            this.deleteUnifiedActivity(activity.id, activity.sourceType);
          }
        }
      });

      transaction();

      // Get the updated merged activity
      const mergedActivity = this.getUnifiedActivity(baseActivity.id, sourceType);

      return {
        success: true,
        mergedActivity: mergedActivity || undefined,
      };
    } catch (error) {
      console.error('Failed to merge activities:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Helper method to merge tags from multiple activities
   * Deduplicates by tag ID
   */
  private mergeTags(activities: UnifiedActivity[]): Tag[] {
    const tagMap = new Map<number, Tag>();

    for (const activity of activities) {
      if (activity.tags) {
        for (const tag of activity.tags) {
          if (tag.id && !tagMap.has(tag.id)) {
            tagMap.set(tag.id, tag);
          }
        }
      }
    }

    return Array.from(tagMap.values());
  }
}
