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
  AppCategoryMapping,
  DomainCategoryMapping,
  DailyStats,
  HourlyPattern,
  HeatmapDay,
  WeeklySummary,
  ProductivityTrend,
  BehavioralInsight,
  AnalyticsSummary,
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

  // Services
  private analyticsService!: AnalyticsService;

  /**
   * Initialize the database and all repositories/services
   */
  initialize(userDataPath?: string): void {
    try {
      // Handle both new async style and old sync style for backward compatibility
      if (userDataPath) {
        this.dbPath = path.join(userDataPath, 'lume.db');
      } else if (this.dbPath) {
        // Already initialized
        return;
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

  // ==================== TIME ENTRIES ====================

  addTimeEntry(entry: TimeEntry): number {
    return this.timeEntryRepo.insert(entry);
  }

  updateTimeEntry(id: number, updates: Partial<TimeEntry>): boolean {
    return this.timeEntryRepo.update(id, updates);
  }

  deleteTimeEntry(id: number): boolean {
    return this.timeEntryRepo.delete(id);
  }

  getTimeEntries(limit?: number): TimeEntry[] {
    return this.timeEntryRepo.getAll({ limit });
  }

  getTimeEntry(id: number): TimeEntry | null {
    return this.timeEntryRepo.getById(id);
  }

  getActiveTimeEntry(): TimeEntry | null {
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
    return this.analyticsService.queryTotalActiveTime(startTime, endTime);
  }

  queryCategoryTime(category: string, startTime: string, endTime: string): number {
    return this.analyticsService.queryCategoryTime(category, startTime, endTime);
  }

  queryAppTime(appName: string, startTime: string, endTime: string): number {
    return this.analyticsService.queryAppTime(appName, startTime, endTime);
  }

  getDailyProductivityStats(startDate: string, endDate: string): DailyStats[] {
    return this.analyticsService.getDailyProductivityStats(startDate, endDate);
  }

  getHourlyPatterns(days: number): HourlyPattern[] {
    return this.analyticsService.getHourlyPatterns(days);
  }

  getHeatmapData(year: number): HeatmapDay[] {
    return this.analyticsService.getHeatmapData(year);
  }

  getWeeklySummary(weekOffset: number = 0): WeeklySummary {
    return this.analyticsService.getWeeklySummary(weekOffset);
  }

  getProductivityTrends(startDate: string, endDate: string, groupBy: 'day' | 'week' | 'month'): ProductivityTrend[] {
    return this.analyticsService.getProductivityTrends(startDate, endDate, groupBy);
  }

  getBehavioralInsights(): BehavioralInsight[] {
    return this.analyticsService.getBehavioralInsights();
  }

  getAnalyticsSummary(): AnalyticsSummary {
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
}

// Export singleton instance
export default new DatabaseManager();
