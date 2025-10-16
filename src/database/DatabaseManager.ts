import Database from 'better-sqlite3';
import path from 'path';

// Migrations
import { MigrationRunner } from './migrations/MigrationRunner';

// Logging
import { logger } from '../services/logging/Logger';

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
import { ImportExportService } from '../services/import-export/ImportExportService';
import { UnifiedActivityService } from '../services/unified-activity/UnifiedActivityService';

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
  private importExportService!: ImportExportService;
  private unifiedActivityService!: UnifiedActivityService;

  /**
   * Check if repositories are initialized
   */
  private ensureInitialized(): void {
    if (!this.db || !this.timeEntryRepo || !this.appUsageRepo || !this.categoryRepo ||
        !this.tagRepo || !this.pomodoroRepo || !this.goalRepo || !this.mappingRepo ||
        !this.todoRepo || !this.analyticsService || !this.importExportService ||
        !this.unifiedActivityService) {
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


      this.db = new Database(this.dbPath);
      this.db.pragma('foreign_keys = ON');

      const migrationRunner = new MigrationRunner(this.db);
      migrationRunner.runMigrations();

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
      this.importExportService = new ImportExportService(this.db, this);
      this.unifiedActivityService = new UnifiedActivityService(this.db, this);

    } catch (error) {
      logger.error('Database initialization failed', {
        error: error instanceof Error ? error.message : String(error),
        dbPath: this.dbPath
      }, error instanceof Error ? error : undefined);
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
      logger.error('Database not initialized for clearAllData');
      return false;
    }

    const doCompact = options.compact !== false; // Default to true

    try {

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

      });

      // Execute the transaction
      clearTransaction();

      // Reset AUTO_INCREMENT sequences for all tables
      this.db.prepare("DELETE FROM sqlite_sequence").run();

      // Only checkpoint and vacuum if compaction is enabled and not inside another transaction
      if (doCompact) {
        // Checkpoint the Write-Ahead Log to ensure changes are flushed
        this.db.pragma('wal_checkpoint(TRUNCATE)');

        // VACUUM to reclaim space and compact the database file
        this.db.prepare('VACUUM').run();
      }

      return true;
    } catch (error) {
      logger.error('Failed to clear database', {
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      return false;
    }
  }

  /**
   * Export all data from the database
   * @returns ExportData object containing all tables and metadata
   */
  exportAllData(): ExportData {
    this.ensureInitialized();
    return this.importExportService.exportAllData();
  }

  /**
   * Import data into the database
   * @param data - ExportData object to import
   * @param options - Import options (strategy, validateOnly)
   * @returns ImportResult with statistics and errors
   */
  importAllData(data: ExportData, options: ImportOptions = { strategy: 'merge' }): ImportResult {
    this.ensureInitialized();
    return this.importExportService.importAllData(data, options);
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
    this.ensureInitialized();
    return this.timeEntryRepo.getByDateRange(startDate, endDate);
  }

  addTimeEntryTags(timeEntryId: number, tagIds: number[]): void {
    this.ensureInitialized();
    this.timeEntryRepo.addTags(timeEntryId, tagIds);
  }

  setTimeEntryTags(timeEntryId: number, tagIds: number[]): void {
    this.ensureInitialized();
    this.timeEntryRepo.setTags(timeEntryId, tagIds);
  }

  getTimeEntryTags(timeEntryId: number): Tag[] {
    this.ensureInitialized();
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
    this.ensureInitialized();
    return this.todoRepo.getAllWithCategory();
  }

  getOverdueTodos(): Todo[] {
    this.ensureInitialized();
    return this.todoRepo.getOverdue();
  }

  linkTodoToTimeEntry(todoId: number, timeEntryId: number): boolean {
    this.ensureInitialized();
    return this.todoRepo.linkTimeEntry(todoId, timeEntryId);
  }

  incrementTodoPomodoro(todoId: number): boolean {
    this.ensureInitialized();
    return this.todoRepo.incrementPomodoroCount(todoId);
  }

  addTodoTags(todoId: number, tagIds: number[]): void {
    this.ensureInitialized();
    this.todoRepo.addTags(todoId, tagIds);
  }

  setTodoTags(todoId: number, tagIds: number[]): void {
    this.ensureInitialized();
    this.todoRepo.setTags(todoId, tagIds);
  }

  getTodoTags(todoId: number): Tag[] {
    this.ensureInitialized();
    return this.todoRepo.getTags(todoId);
  }

  getTodosWithTags(options?: { status?: TodoStatus; priority?: TodoPriority }): (Todo & { tags: Tag[] })[] {
    this.ensureInitialized();
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
    this.ensureInitialized();
    return this.unifiedActivityService.getUnifiedActivities(startDate, endDate, filters);
  }

  /**
   * Get a single unified activity by ID and source type
   */
  getUnifiedActivity(id: number, sourceType: ActivitySourceType): UnifiedActivity | null {
    this.ensureInitialized();
    return this.unifiedActivityService.getUnifiedActivity(id, sourceType);
  }

  /**
   * Update a unified activity
   */
  updateUnifiedActivity(options: UnifiedActivityUpdateOptions): boolean {
    this.ensureInitialized();
    return this.unifiedActivityService.updateUnifiedActivity(options);
  }

  /**
   * Delete a unified activity
   */
  deleteUnifiedActivity(id: number, sourceType: ActivitySourceType): boolean {
    this.ensureInitialized();
    return this.unifiedActivityService.deleteUnifiedActivity(id, sourceType);
  }

  /**
   * Bulk update activities
   */
  bulkUpdateActivities(operation: BulkActivityOperation): { success: boolean; updated: number; failed: number } {
    this.ensureInitialized();
    return this.unifiedActivityService.bulkUpdateActivities(operation);
  }

  /**
   * Bulk delete activities
   */
  bulkDeleteActivities(
    activityIds: Array<{ id: number; sourceType: ActivitySourceType }>
  ): { success: boolean; deleted: number; failed: number } {
    this.ensureInitialized();
    return this.unifiedActivityService.bulkDeleteActivities(activityIds);
  }

  /**
   * Get activity conflicts (overlaps, duplicates, gaps)
   */
  getActivityConflicts(startDate: string, endDate: string): ActivityConflict[] {
    this.ensureInitialized();
    return this.unifiedActivityService.getActivityConflicts(startDate, endDate);
  }

  /**
   * Get unified activity statistics
   */
  getUnifiedActivityStats(startDate: string, endDate: string): UnifiedActivityStats {
    this.ensureInitialized();
    return this.unifiedActivityService.getUnifiedActivityStats(startDate, endDate);
  }

  /**
   * Search activities with full-text search across all activity types
   * Searches through titles, app names, domains, categories, and tags
   */
  searchActivities(
    query: string,
    filters?: UnifiedActivityFilters
  ): UnifiedActivity[] {
    this.ensureInitialized();
    return this.unifiedActivityService.searchActivities(query, filters);
  }

  /**
   * Merge multiple activities into one
   */
  async mergeActivitiesById(
    activityIds: Array<{ id: number; sourceType: ActivitySourceType }>,
    strategy: 'longest' | 'earliest' | 'latest' = 'longest'
  ): Promise<{ success: boolean; mergedActivity?: UnifiedActivity; error?: string }> {
    this.ensureInitialized();
    return this.unifiedActivityService.mergeActivitiesById(activityIds, strategy);
  }
}
