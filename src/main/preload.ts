import { contextBridge, ipcRenderer } from 'electron';
import type {
  ProductivityGoal,
  GoalWithProgress,
  GoalProgress,
  GoalStats,
  Category,
  Tag,
  AppCategoryMapping,
  DomainCategoryMapping,
  CategoryStats,
  TagStats,
  ExportResult,
  ImportOptions,
  ImportResult,
  UnifiedActivity,
  UnifiedActivityFilters,
  UnifiedActivityUpdateOptions,
  BulkActivityOperation,
  ActivityConflict,
  UnifiedActivityStats,
  ActivitySourceType,
  TimeGap
} from '../types';

// Note: Sentry is initialized in the main process only, not in preload
// Preload script should not initialize Sentry to avoid duplicate tracking

/**
 * Namespaced API Interfaces (Phase 4 Refactoring)
 * Organizes IPC methods into logical groups for better discoverability
 */

// Time Entries namespace
interface ITimeEntriesAPI {
  add: (entry: any) => Promise<number>;
  update: (id: number, updates: any) => Promise<boolean>;
  getActive: () => Promise<any | null>;
}

// App Usage namespace
interface IAppUsageAPI {
  add: (usage: any) => Promise<number>;
}

// Settings namespace
interface ISettingsAPI {
  get: () => Promise<any>;
  save: (settings: any) => Promise<boolean>;
}

// Activity Tracking namespace
interface IActivityTrackingAPI {
  start: () => Promise<boolean>;
  stop: () => Promise<boolean>;
  getStatus: () => Promise<boolean>;
  getCurrentSession: () => Promise<any>;
  getRecentSessions: (limit?: number) => Promise<any[]>;
  getTopApplications: (limit?: number) => Promise<any[]>;
  getTopWebsites: (limit?: number) => Promise<any[]>;
}

// Auto-start namespace
interface IAutoStartAPI {
  getStatus: () => Promise<boolean>;
  set: (enabled: boolean) => Promise<boolean>;
}

// Crash Reporting namespace
interface ICrashReportingAPI {
  getLastReport: () => Promise<any>;
  getUploadedReports: () => Promise<any[]>;
  test: () => Promise<boolean>;
}

// Pomodoro namespace (nested)
interface IPomodoroAPI {
  settings: {
    get: () => Promise<any>;
    save: (settings: any) => Promise<boolean>;
  };
  sessions: {
    add: (session: any) => Promise<number>;
    update: (id: number, updates: any) => Promise<boolean>;
    getStats: (startDate?: string, endDate?: string) => Promise<any>;
  };
  timer: {
    start: (task: string, sessionType: string) => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    stop: () => Promise<void>;
    skip: () => Promise<void>;
    getStatus: () => Promise<any>;
  };
}

// Goals namespace
interface IGoalsAPI {
  add: (goal: ProductivityGoal) => Promise<number>;
  update: (id: number, updates: Partial<ProductivityGoal>) => Promise<boolean>;
  delete: (id: number) => Promise<boolean>;
  getAll: (activeOnly?: boolean) => Promise<ProductivityGoal[]>;
  getTodayWithProgress: () => Promise<GoalWithProgress[]>;
  getProgress: (goalId: number, date: string) => Promise<GoalProgress | null>;
  getAchievementHistory: (goalId: number, days: number) => Promise<GoalProgress[]>;
  getStats: () => Promise<GoalStats>;
}

// Categories namespace
interface ICategoriesAPI {
  getAll: () => Promise<Category[]>;
  getById: (id: number) => Promise<Category | null>;
  add: (category: Category) => Promise<number>;
  update: (id: number, updates: Partial<Category>) => Promise<boolean>;
  delete: (id: number) => Promise<boolean>;
}

// Tags namespace
interface ITagsAPI {
  getAll: () => Promise<Tag[]>;
  add: (tag: Tag) => Promise<number>;
  update: (id: number, updates: Partial<Tag>) => Promise<boolean>;
  delete: (id: number) => Promise<boolean>;
}

// Category Mappings namespace (nested)
interface ICategoryMappingsAPI {
  apps: {
    getAll: () => Promise<AppCategoryMapping[]>;
    add: (appName: string, categoryId: number) => Promise<number>;
    delete: (id: number) => Promise<boolean>;
  };
  domains: {
    getAll: () => Promise<DomainCategoryMapping[]>;
    add: (domain: string, categoryId: number) => Promise<number>;
    delete: (id: number) => Promise<boolean>;
  };
}

// Tag Associations namespace (nested)
interface ITagAssociationsAPI {
  timeEntries: {
    get: (timeEntryId: number) => Promise<Tag[]>;
    add: (timeEntryId: number, tagIds: number[]) => Promise<void>;
  };
  appUsage: {
    get: (appUsageId: number) => Promise<Tag[]>;
    add: (appUsageId: number, tagIds: number[]) => Promise<void>;
  };
  pomodoroSessions: {
    get: (pomodoroSessionId: number) => Promise<Tag[]>;
    add: (pomodoroSessionId: number, tagIds: number[]) => Promise<void>;
    set: (pomodoroSessionId: number, tagIds: number[]) => Promise<void>;
  };
  productivityGoals: {
    get: (productivityGoalId: number) => Promise<Tag[]>;
    add: (productivityGoalId: number, tagIds: number[]) => Promise<void>;
    set: (productivityGoalId: number, tagIds: number[]) => Promise<void>;
  };
}

// Statistics namespace
interface IStatisticsAPI {
  getCategories: (startDate?: string, endDate?: string) => Promise<CategoryStats[]>;
  getTags: (startDate?: string, endDate?: string) => Promise<TagStats[]>;
}

// Timeline namespace
interface ITimelineAPI {
  getActivities: (startDate: string, endDate: string) => Promise<any[]>;
  getSummary: (startDate: string, endDate: string) => Promise<any>;
}

// Analytics namespace
interface IAnalyticsAPI {
  getDailyStats: (startDate: string, endDate: string) => Promise<any[]>;
  getHourlyPatterns: (days: number) => Promise<any[]>;
  getHeatmap: (year: number) => Promise<any[]>;
  getWeeklySummary: (weekOffset: number) => Promise<any>;
  getTrends: (startDate: string, endDate: string, groupBy: 'day' | 'week' | 'month') => Promise<any[]>;
  getInsights: () => Promise<any[]>;
  getSummary: () => Promise<any>;
  getDistractionAnalysis: (days: number) => Promise<any[]>;
}

// Data Management namespace
interface IDataManagementAPI {
  clearAll: () => Promise<boolean>;
  export: (format: 'json' | 'csv') => Promise<ExportResult>;
  import: (format: 'json' | 'csv', options?: ImportOptions) => Promise<ImportResult>;
}

// Unified Activities namespace (nested)
interface IActivitiesAPI {
  getAll: (startDate: string, endDate: string, filters?: UnifiedActivityFilters) => Promise<UnifiedActivity[]>;
  getById: (id: number, sourceType: ActivitySourceType) => Promise<UnifiedActivity | null>;
  update: (options: UnifiedActivityUpdateOptions) => Promise<boolean>;
  delete: (id: number, sourceType: ActivitySourceType) => Promise<boolean>;
  bulk: {
    update: (operation: BulkActivityOperation) => Promise<{ success: boolean; updated: number; failed: number }>;
    delete: (activityIds: Array<{ id: number; sourceType: ActivitySourceType }>) => Promise<{ success: boolean; deleted: number; failed: number }>;
  };
  conflicts: {
    get: (startDate: string, endDate: string) => Promise<ActivityConflict[]>;
  };
  stats: {
    get: (startDate: string, endDate: string) => Promise<UnifiedActivityStats>;
  };
  search: (query: string, filters?: UnifiedActivityFilters) => Promise<UnifiedActivity[]>;
  merge: (activityIds: Array<{ id: number; sourceType: ActivitySourceType }>, strategy?: 'longest' | 'earliest' | 'latest') => Promise<{ success: boolean; mergedActivity?: UnifiedActivity; error?: string }>;
}

// Data Quality namespace (nested)
interface IDataQualityAPI {
  gaps: {
    detect: (startDate: string, endDate: string, minGapMinutes?: number) => Promise<TimeGap[]>;
    getStatistics: (startDate: string, endDate: string, minGapMinutes?: number) => Promise<{
      totalGaps: number;
      totalUntrackedSeconds: number;
      averageGapSeconds: number;
      longestGapSeconds: number;
    }>;
  };
  duplicates: {
    detect: (startDate: string, endDate: string, similarityThreshold?: number) => Promise<Array<{
      activities: UnifiedActivity[];
      avgSimilarity: number;
    }>>;
  };
  mergeable: {
    find: (startDate: string, endDate: string, maxGapSeconds?: number) => Promise<UnifiedActivity[][]>;
  };
  orphaned: {
    find: (startDate: string, endDate: string) => Promise<UnifiedActivity[]>;
  };
  validation: {
    validateBatch: (startDate: string, endDate: string) => Promise<{
      valid: Array<{ activity: UnifiedActivity; warnings: string[] }>;
      invalid: Array<{ activity: UnifiedActivity; errors: string[]; warnings: string[] }>;
    }>;
  };
  durations: {
    recalculate: (startDate: string, endDate: string) => Promise<{
      success: boolean;
      recalculated: number;
      errors: string[];
    }>;
  };
  zeroDuration: {
    find: (startDate: string, endDate: string, removeIfConfirmed?: boolean) => Promise<{
      activities: UnifiedActivity[];
      removed: number;
    }>;
  };
  report: {
    get: (startDate: string, endDate: string) => Promise<{
      totalActivities: number;
      validActivities: number;
      invalidActivities: number;
      warningsCount: number;
      orphanedCount: number;
      zeroDurationCount: number;
      gapsCount: number;
      duplicateGroupsCount: number;
      qualityScore: number;
    }>;
  };
}

/**
 * New Namespaced Electron API Interface
 * @see Phase 4 Refactoring for better API organization
 */
export interface IElectronAPINamespaced {
  timeEntries: ITimeEntriesAPI;
  appUsage: IAppUsageAPI;
  settings: ISettingsAPI;
  activityTracking: IActivityTrackingAPI;
  autoStart: IAutoStartAPI;
  crashReporting: ICrashReportingAPI;
  pomodoro: IPomodoroAPI;
  goals: IGoalsAPI;
  categories: ICategoriesAPI;
  tags: ITagsAPI;
  categoryMappings: ICategoryMappingsAPI;
  tagAssociations: ITagAssociationsAPI;
  statistics: IStatisticsAPI;
  timeline: ITimelineAPI;
  analytics: IAnalyticsAPI;
  dataManagement: IDataManagementAPI;
  activities: IActivitiesAPI;
  dataQuality: IDataQualityAPI;
}

/**
 * Legacy Flat API Interface (Deprecated - for backward compatibility)
 * @deprecated Use namespaced API (IElectronAPINamespaced) instead
 */
export interface IElectronAPI {
  addTimeEntry: (entry: any) => Promise<number>;
  updateTimeEntry: (id: number, updates: any) => Promise<boolean>;
  getActiveTimeEntry: () => Promise<any | null>;
  addAppUsage: (usage: any) => Promise<number>;
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<boolean>;
  startActivityTracking: () => Promise<boolean>;
  stopActivityTracking: () => Promise<boolean>;
  getActivityTrackingStatus: () => Promise<boolean>;
  getCurrentActivitySession: () => Promise<any>;
  getRecentActivitySessions: (limit?: number) => Promise<any[]>;
  getTopApplications: (limit?: number) => Promise<any[]>;
  getTopWebsites: (limit?: number) => Promise<any[]>;
  // Auto-start API
  getAutoStartStatus: () => Promise<boolean>;
  setAutoStart: (enabled: boolean) => Promise<boolean>;
  getLastCrashReport: () => Promise<any>;
  getUploadedCrashReports: () => Promise<any[]>;
  testCrashReporting: () => Promise<boolean>;
  // Pomodoro API
  getPomodoroSettings: () => Promise<any>;
  savePomodoroSettings: (settings: any) => Promise<boolean>;
  addPomodoroSession: (session: any) => Promise<number>;
  updatePomodoroSession: (id: number, updates: any) => Promise<boolean>;
  getPomodoroStats: (startDate?: string, endDate?: string) => Promise<any>;
  // Pomodoro Timer Control
  startPomodoroSession: (task: string, sessionType: string) => Promise<void>;
  pausePomodoroSession: () => Promise<void>;
  resumePomodoroSession: () => Promise<void>;
  stopPomodoroSession: () => Promise<void>;
  skipPomodoroSession: () => Promise<void>;
  getPomodoroStatus: () => Promise<any>;
  // Productivity Goals API
  addGoal: (goal: ProductivityGoal) => Promise<number>;
  updateGoal: (id: number, updates: Partial<ProductivityGoal>) => Promise<boolean>;
  deleteGoal: (id: number) => Promise<boolean>;
  getGoals: (activeOnly?: boolean) => Promise<ProductivityGoal[]>;
  getTodayGoalsWithProgress: () => Promise<GoalWithProgress[]>;
  getGoalProgress: (goalId: number, date: string) => Promise<GoalProgress | null>;
  getGoalAchievementHistory: (goalId: number, days: number) => Promise<GoalProgress[]>;
  getGoalStats: () => Promise<GoalStats>;
  // Categories API
  getCategories: () => Promise<Category[]>;
  getCategoryById: (id: number) => Promise<Category | null>;
  addCategory: (category: Category) => Promise<number>;
  updateCategory: (id: number, updates: Partial<Category>) => Promise<boolean>;
  deleteCategory: (id: number) => Promise<boolean>;
  // Tags API
  getTags: () => Promise<Tag[]>;
  addTag: (tag: Tag) => Promise<number>;
  updateTag: (id: number, updates: Partial<Tag>) => Promise<boolean>;
  deleteTag: (id: number) => Promise<boolean>;
  // Category Mappings API
  getAppCategoryMappings: () => Promise<AppCategoryMapping[]>;
  addAppCategoryMapping: (appName: string, categoryId: number) => Promise<number>;
  deleteAppCategoryMapping: (id: number) => Promise<boolean>;
  getDomainCategoryMappings: () => Promise<DomainCategoryMapping[]>;
  addDomainCategoryMapping: (domain: string, categoryId: number) => Promise<number>;
  deleteDomainCategoryMapping: (id: number) => Promise<boolean>;
  // Tag Associations API
  getTimeEntryTags: (timeEntryId: number) => Promise<Tag[]>;
  addTimeEntryTags: (timeEntryId: number, tagIds: number[]) => Promise<void>;
  getAppUsageTags: (appUsageId: number) => Promise<Tag[]>;
  addAppUsageTags: (appUsageId: number, tagIds: number[]) => Promise<void>;
  getPomodoroSessionTags: (pomodoroSessionId: number) => Promise<Tag[]>;
  addPomodoroSessionTags: (pomodoroSessionId: number, tagIds: number[]) => Promise<void>;
  setPomodoroSessionTags: (pomodoroSessionId: number, tagIds: number[]) => Promise<void>;
  getProductivityGoalTags: (productivityGoalId: number) => Promise<Tag[]>;
  addProductivityGoalTags: (productivityGoalId: number, tagIds: number[]) => Promise<void>;
  setProductivityGoalTags: (productivityGoalId: number, tagIds: number[]) => Promise<void>;
  // Statistics API
  getCategoryStats: (startDate?: string, endDate?: string) => Promise<CategoryStats[]>;
  getTagStats: (startDate?: string, endDate?: string) => Promise<TagStats[]>;
  // Timeline API
  getTimelineActivities: (startDate: string, endDate: string) => Promise<any[]>;
  getTimelineSummary: (startDate: string, endDate: string) => Promise<any>;
  // Analytics API
  getDailyProductivityStats: (startDate: string, endDate: string) => Promise<any[]>;
  getHourlyPatterns: (days: number) => Promise<any[]>;
  getHeatmapData: (year: number) => Promise<any[]>;
  getWeeklySummary: (weekOffset: number) => Promise<any>;
  getProductivityTrends: (startDate: string, endDate: string, groupBy: 'day' | 'week' | 'month') => Promise<any[]>;
  getBehavioralInsights: () => Promise<any[]>;
  getAnalyticsSummary: () => Promise<any>;
  getDistractionAnalysis: (days: number) => Promise<any[]>;
  // Data Management API
  clearAllData: () => Promise<boolean>;
  exportData: (format: 'json' | 'csv') => Promise<ExportResult>;
  importData: (format: 'json' | 'csv', options?: ImportOptions) => Promise<ImportResult>;
  // Unified Activity Log API
  getUnifiedActivities: (startDate: string, endDate: string, filters?: UnifiedActivityFilters) => Promise<UnifiedActivity[]>;
  getUnifiedActivity: (id: number, sourceType: ActivitySourceType) => Promise<UnifiedActivity | null>;
  updateUnifiedActivity: (options: UnifiedActivityUpdateOptions) => Promise<boolean>;
  deleteUnifiedActivity: (id: number, sourceType: ActivitySourceType) => Promise<boolean>;
  bulkUpdateActivities: (operation: BulkActivityOperation) => Promise<{ success: boolean; updated: number; failed: number }>;
  bulkDeleteActivities: (activityIds: Array<{ id: number; sourceType: ActivitySourceType }>) => Promise<{ success: boolean; deleted: number; failed: number }>;
  getActivityConflicts: (startDate: string, endDate: string) => Promise<ActivityConflict[]>;
  getUnifiedActivityStats: (startDate: string, endDate: string) => Promise<UnifiedActivityStats>;
  searchActivities: (query: string, filters?: UnifiedActivityFilters) => Promise<UnifiedActivity[]>;
  mergeActivities: (activityIds: Array<{ id: number; sourceType: ActivitySourceType }>, strategy?: 'longest' | 'earliest' | 'latest') => Promise<{ success: boolean; mergedActivity?: UnifiedActivity; error?: string }>;

  // Data Quality API
  detectActivityGaps: (startDate: string, endDate: string, minGapMinutes?: number) => Promise<TimeGap[]>;
  getGapStatistics: (startDate: string, endDate: string, minGapMinutes?: number) => Promise<{
    totalGaps: number;
    totalUntrackedSeconds: number;
    averageGapSeconds: number;
    longestGapSeconds: number;
  }>;
  detectDuplicateActivities: (startDate: string, endDate: string, similarityThreshold?: number) => Promise<Array<{
    activities: UnifiedActivity[];
    avgSimilarity: number;
  }>>;
  findMergeableGroups: (startDate: string, endDate: string, maxGapSeconds?: number) => Promise<UnifiedActivity[][]>;
  findOrphanedActivities: (startDate: string, endDate: string) => Promise<UnifiedActivity[]>;
  validateActivitiesBatch: (startDate: string, endDate: string) => Promise<{
    valid: Array<{ activity: UnifiedActivity; warnings: string[] }>;
    invalid: Array<{ activity: UnifiedActivity; errors: string[]; warnings: string[] }>;
  }>;
  recalculateActivityDurations: (startDate: string, endDate: string) => Promise<{
    success: boolean;
    recalculated: number;
    errors: string[];
  }>;
  findZeroDurationActivities: (startDate: string, endDate: string, removeIfConfirmed?: boolean) => Promise<{
    activities: UnifiedActivity[];
    removed: number;
  }>;
  getDataQualityReport: (startDate: string, endDate: string) => Promise<{
    totalActivities: number;
    validActivities: number;
    invalidActivities: number;
    warningsCount: number;
    orphanedCount: number;
    zeroDurationCount: number;
    gapsCount: number;
    duplicateGroupsCount: number;
    qualityScore: number;
  }>;
}

const electronAPI: IElectronAPI = {
  addTimeEntry: (entry) => ipcRenderer.invoke('add-time-entry', entry),
  updateTimeEntry: (id, updates) => ipcRenderer.invoke('update-time-entry', id, updates),
  getActiveTimeEntry: () => ipcRenderer.invoke('get-active-time-entry'),
  addAppUsage: (usage) => ipcRenderer.invoke('add-app-usage', usage),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  startActivityTracking: () => ipcRenderer.invoke('start-activity-tracking'),
  stopActivityTracking: () => ipcRenderer.invoke('stop-activity-tracking'),
  getActivityTrackingStatus: () => ipcRenderer.invoke('get-activity-tracking-status'),
  getCurrentActivitySession: () => ipcRenderer.invoke('get-current-activity-session'),
  getRecentActivitySessions: (limit) => ipcRenderer.invoke('get-recent-activity-sessions', limit),
  getTopApplications: (limit) => ipcRenderer.invoke('get-top-applications', limit),
  getTopWebsites: (limit) => ipcRenderer.invoke('get-top-websites', limit),
  // Auto-start API
  getAutoStartStatus: () => ipcRenderer.invoke('get-auto-start-status'),
  setAutoStart: (enabled) => ipcRenderer.invoke('set-auto-start', enabled),
  getLastCrashReport: () => ipcRenderer.invoke('get-last-crash-report'),
  getUploadedCrashReports: () => ipcRenderer.invoke('get-uploaded-crash-reports'),
  testCrashReporting: () => ipcRenderer.invoke('test-crash-reporting'),
  // Pomodoro API
  getPomodoroSettings: () => ipcRenderer.invoke('get-pomodoro-settings'),
  savePomodoroSettings: (settings) => ipcRenderer.invoke('save-pomodoro-settings', settings),
  addPomodoroSession: (session) => ipcRenderer.invoke('add-pomodoro-session', session),
  updatePomodoroSession: (id, updates) => ipcRenderer.invoke('update-pomodoro-session', id, updates),
  getPomodoroStats: (startDate, endDate) => ipcRenderer.invoke('get-pomodoro-stats', startDate, endDate),
  // Pomodoro Timer Control
  startPomodoroSession: (task, sessionType) => ipcRenderer.invoke('start-pomodoro-session', task, sessionType),
  pausePomodoroSession: () => ipcRenderer.invoke('pause-pomodoro-session'),
  resumePomodoroSession: () => ipcRenderer.invoke('resume-pomodoro-session'),
  stopPomodoroSession: () => ipcRenderer.invoke('stop-pomodoro-session'),
  skipPomodoroSession: () => ipcRenderer.invoke('skip-pomodoro-session'),
  getPomodoroStatus: () => ipcRenderer.invoke('get-pomodoro-status'),
  // Productivity Goals API
  addGoal: (goal) => ipcRenderer.invoke('add-goal', goal),
  updateGoal: (id, updates) => ipcRenderer.invoke('update-goal', id, updates),
  deleteGoal: (id) => ipcRenderer.invoke('delete-goal', id),
  getGoals: (activeOnly) => ipcRenderer.invoke('get-goals', activeOnly),
  getTodayGoalsWithProgress: () => ipcRenderer.invoke('get-today-goals-with-progress'),
  getGoalProgress: (goalId, date) => ipcRenderer.invoke('get-goal-progress', goalId, date),
  getGoalAchievementHistory: (goalId, days) => ipcRenderer.invoke('get-goal-achievement-history', goalId, days),
  getGoalStats: () => ipcRenderer.invoke('get-goal-stats'),
  // Categories API
  getCategories: () => ipcRenderer.invoke('get-categories'),
  getCategoryById: (id) => ipcRenderer.invoke('get-category-by-id', id),
  addCategory: (category) => ipcRenderer.invoke('add-category', category),
  updateCategory: (id, updates) => ipcRenderer.invoke('update-category', id, updates),
  deleteCategory: (id) => ipcRenderer.invoke('delete-category', id),
  // Tags API
  getTags: () => ipcRenderer.invoke('get-tags'),
  addTag: (tag) => ipcRenderer.invoke('add-tag', tag),
  updateTag: (id, updates) => ipcRenderer.invoke('update-tag', id, updates),
  deleteTag: (id) => ipcRenderer.invoke('delete-tag', id),
  // Category Mappings API
  getAppCategoryMappings: () => ipcRenderer.invoke('get-app-category-mappings'),
  addAppCategoryMapping: (appName, categoryId) => ipcRenderer.invoke('add-app-category-mapping', appName, categoryId),
  deleteAppCategoryMapping: (id) => ipcRenderer.invoke('delete-app-category-mapping', id),
  getDomainCategoryMappings: () => ipcRenderer.invoke('get-domain-category-mappings'),
  addDomainCategoryMapping: (domain, categoryId) => ipcRenderer.invoke('add-domain-category-mapping', domain, categoryId),
  deleteDomainCategoryMapping: (id) => ipcRenderer.invoke('delete-domain-category-mapping', id),
  // Tag Associations API
  getTimeEntryTags: (timeEntryId) => ipcRenderer.invoke('get-time-entry-tags', timeEntryId),
  addTimeEntryTags: (timeEntryId, tagIds) => ipcRenderer.invoke('add-time-entry-tags', timeEntryId, tagIds),
  getAppUsageTags: (appUsageId) => ipcRenderer.invoke('get-app-usage-tags', appUsageId),
  addAppUsageTags: (appUsageId, tagIds) => ipcRenderer.invoke('add-app-usage-tags', appUsageId, tagIds),
  getPomodoroSessionTags: (pomodoroSessionId: number) => ipcRenderer.invoke('get-pomodoro-session-tags', pomodoroSessionId),
  addPomodoroSessionTags: (pomodoroSessionId: number, tagIds: number[]) => ipcRenderer.invoke('add-pomodoro-session-tags', pomodoroSessionId, tagIds),
  setPomodoroSessionTags: (pomodoroSessionId: number, tagIds: number[]) => ipcRenderer.invoke('set-pomodoro-session-tags', pomodoroSessionId, tagIds),
  getProductivityGoalTags: (productivityGoalId: number) => ipcRenderer.invoke('get-productivity-goal-tags', productivityGoalId),
  addProductivityGoalTags: (productivityGoalId: number, tagIds: number[]) => ipcRenderer.invoke('add-productivity-goal-tags', productivityGoalId, tagIds),
  setProductivityGoalTags: (productivityGoalId: number, tagIds: number[]) => ipcRenderer.invoke('set-productivity-goal-tags', productivityGoalId, tagIds),
  // Statistics API
  getCategoryStats: (startDate, endDate) => ipcRenderer.invoke('get-category-stats', startDate, endDate),
  getTagStats: (startDate, endDate) => ipcRenderer.invoke('get-tag-stats', startDate, endDate),
  // Timeline API
  getTimelineActivities: (startDate, endDate) => ipcRenderer.invoke('get-timeline-activities', startDate, endDate),
  getTimelineSummary: (startDate, endDate) => ipcRenderer.invoke('get-timeline-summary', startDate, endDate),
  // Analytics API
  getDailyProductivityStats: (startDate, endDate) => ipcRenderer.invoke('get-daily-productivity-stats', startDate, endDate),
  getHourlyPatterns: (days) => ipcRenderer.invoke('get-hourly-patterns', days),
  getHeatmapData: (year) => ipcRenderer.invoke('get-heatmap-data', year),
  getWeeklySummary: (weekOffset) => ipcRenderer.invoke('get-weekly-summary', weekOffset),
  getProductivityTrends: (startDate, endDate, groupBy) => ipcRenderer.invoke('get-productivity-trends', startDate, endDate, groupBy),
  getBehavioralInsights: () => ipcRenderer.invoke('get-behavioral-insights'),
  getAnalyticsSummary: () => ipcRenderer.invoke('get-analytics-summary'),
  getDistractionAnalysis: (days) => ipcRenderer.invoke('get-distraction-analysis', days),
  // Data Management API
  clearAllData: () => ipcRenderer.invoke('clear-all-data'),
  exportData: (format) => ipcRenderer.invoke('export-data', format),
  importData: (format, options) => ipcRenderer.invoke('import-data', format, options),
  // Unified Activity Log API
  getUnifiedActivities: (startDate, endDate, filters) => ipcRenderer.invoke('get-unified-activities', startDate, endDate, filters),
  getUnifiedActivity: (id, sourceType) => ipcRenderer.invoke('get-unified-activity', id, sourceType),
  updateUnifiedActivity: (options) => ipcRenderer.invoke('update-unified-activity', options),
  deleteUnifiedActivity: (id, sourceType) => ipcRenderer.invoke('delete-unified-activity', id, sourceType),
  bulkUpdateActivities: (operation) => ipcRenderer.invoke('bulk-update-activities', operation),
  bulkDeleteActivities: (activityIds) => ipcRenderer.invoke('bulk-delete-activities', activityIds),
  getActivityConflicts: (startDate, endDate) => ipcRenderer.invoke('get-activity-conflicts', startDate, endDate),
  getUnifiedActivityStats: (startDate, endDate) => ipcRenderer.invoke('get-unified-activity-stats', startDate, endDate),
  searchActivities: (query, filters) => ipcRenderer.invoke('search-activities', query, filters),
  mergeActivities: (activityIds, strategy) => ipcRenderer.invoke('merge-activities', activityIds, strategy),

  // Data Quality API
  detectActivityGaps: (startDate, endDate, minGapMinutes) => ipcRenderer.invoke('detect-activity-gaps', startDate, endDate, minGapMinutes),
  getGapStatistics: (startDate, endDate, minGapMinutes) => ipcRenderer.invoke('get-gap-statistics', startDate, endDate, minGapMinutes),
  detectDuplicateActivities: (startDate, endDate, similarityThreshold) => ipcRenderer.invoke('detect-duplicate-activities', startDate, endDate, similarityThreshold),
  findMergeableGroups: (startDate, endDate, maxGapSeconds) => ipcRenderer.invoke('find-mergeable-groups', startDate, endDate, maxGapSeconds),
  findOrphanedActivities: (startDate, endDate) => ipcRenderer.invoke('find-orphaned-activities', startDate, endDate),
  validateActivitiesBatch: (startDate, endDate) => ipcRenderer.invoke('validate-activities-batch', startDate, endDate),
  recalculateActivityDurations: (startDate, endDate) => ipcRenderer.invoke('recalculate-activity-durations', startDate, endDate),
  findZeroDurationActivities: (startDate, endDate, removeIfConfirmed) => ipcRenderer.invoke('find-zero-duration-activities', startDate, endDate, removeIfConfirmed),
  getDataQualityReport: (startDate, endDate) => ipcRenderer.invoke('get-data-quality-report', startDate, endDate),
};

/**
 * Helper Functions to Create Namespaced API Objects (Phase 4 Refactoring)
 * Each function returns an object with methods organized by namespace
 */

function createTimeEntriesAPI(): ITimeEntriesAPI {
  return {
    add: (entry) => ipcRenderer.invoke('add-time-entry', entry),
    update: (id, updates) => ipcRenderer.invoke('update-time-entry', id, updates),
    getActive: () => ipcRenderer.invoke('get-active-time-entry'),
  };
}

function createAppUsageAPI(): IAppUsageAPI {
  return {
    add: (usage) => ipcRenderer.invoke('add-app-usage', usage),
  };
}

function createSettingsAPI(): ISettingsAPI {
  return {
    get: () => ipcRenderer.invoke('get-settings'),
    save: (settings) => ipcRenderer.invoke('save-settings', settings),
  };
}

function createActivityTrackingAPI(): IActivityTrackingAPI {
  return {
    start: () => ipcRenderer.invoke('start-activity-tracking'),
    stop: () => ipcRenderer.invoke('stop-activity-tracking'),
    getStatus: () => ipcRenderer.invoke('get-activity-tracking-status'),
    getCurrentSession: () => ipcRenderer.invoke('get-current-activity-session'),
    getRecentSessions: (limit) => ipcRenderer.invoke('get-recent-activity-sessions', limit),
    getTopApplications: (limit) => ipcRenderer.invoke('get-top-applications', limit),
    getTopWebsites: (limit) => ipcRenderer.invoke('get-top-websites', limit),
  };
}

function createAutoStartAPI(): IAutoStartAPI {
  return {
    getStatus: () => ipcRenderer.invoke('get-auto-start-status'),
    set: (enabled) => ipcRenderer.invoke('set-auto-start', enabled),
  };
}

function createCrashReportingAPI(): ICrashReportingAPI {
  return {
    getLastReport: () => ipcRenderer.invoke('get-last-crash-report'),
    getUploadedReports: () => ipcRenderer.invoke('get-uploaded-crash-reports'),
    test: () => ipcRenderer.invoke('test-crash-reporting'),
  };
}

function createPomodoroAPI(): IPomodoroAPI {
  return {
    settings: {
      get: () => ipcRenderer.invoke('get-pomodoro-settings'),
      save: (settings) => ipcRenderer.invoke('save-pomodoro-settings', settings),
    },
    sessions: {
      add: (session) => ipcRenderer.invoke('add-pomodoro-session', session),
      update: (id, updates) => ipcRenderer.invoke('update-pomodoro-session', id, updates),
      getStats: (startDate, endDate) => ipcRenderer.invoke('get-pomodoro-stats', startDate, endDate),
    },
    timer: {
      start: (task, sessionType) => ipcRenderer.invoke('start-pomodoro-session', task, sessionType),
      pause: () => ipcRenderer.invoke('pause-pomodoro-session'),
      resume: () => ipcRenderer.invoke('resume-pomodoro-session'),
      stop: () => ipcRenderer.invoke('stop-pomodoro-session'),
      skip: () => ipcRenderer.invoke('skip-pomodoro-session'),
      getStatus: () => ipcRenderer.invoke('get-pomodoro-status'),
    },
  };
}

function createGoalsAPI(): IGoalsAPI {
  return {
    add: (goal) => ipcRenderer.invoke('add-goal', goal),
    update: (id, updates) => ipcRenderer.invoke('update-goal', id, updates),
    delete: (id) => ipcRenderer.invoke('delete-goal', id),
    getAll: (activeOnly) => ipcRenderer.invoke('get-goals', activeOnly),
    getTodayWithProgress: () => ipcRenderer.invoke('get-today-goals-with-progress'),
    getProgress: (goalId, date) => ipcRenderer.invoke('get-goal-progress', goalId, date),
    getAchievementHistory: (goalId, days) => ipcRenderer.invoke('get-goal-achievement-history', goalId, days),
    getStats: () => ipcRenderer.invoke('get-goal-stats'),
  };
}

function createCategoriesAPI(): ICategoriesAPI {
  return {
    getAll: () => ipcRenderer.invoke('get-categories'),
    getById: (id) => ipcRenderer.invoke('get-category-by-id', id),
    add: (category) => ipcRenderer.invoke('add-category', category),
    update: (id, updates) => ipcRenderer.invoke('update-category', id, updates),
    delete: (id) => ipcRenderer.invoke('delete-category', id),
  };
}

function createTagsAPI(): ITagsAPI {
  return {
    getAll: () => ipcRenderer.invoke('get-tags'),
    add: (tag) => ipcRenderer.invoke('add-tag', tag),
    update: (id, updates) => ipcRenderer.invoke('update-tag', id, updates),
    delete: (id) => ipcRenderer.invoke('delete-tag', id),
  };
}

function createCategoryMappingsAPI(): ICategoryMappingsAPI {
  return {
    apps: {
      getAll: () => ipcRenderer.invoke('get-app-category-mappings'),
      add: (appName, categoryId) => ipcRenderer.invoke('add-app-category-mapping', appName, categoryId),
      delete: (id) => ipcRenderer.invoke('delete-app-category-mapping', id),
    },
    domains: {
      getAll: () => ipcRenderer.invoke('get-domain-category-mappings'),
      add: (domain, categoryId) => ipcRenderer.invoke('add-domain-category-mapping', domain, categoryId),
      delete: (id) => ipcRenderer.invoke('delete-domain-category-mapping', id),
    },
  };
}

function createTagAssociationsAPI(): ITagAssociationsAPI {
  return {
    timeEntries: {
      get: (timeEntryId) => ipcRenderer.invoke('get-time-entry-tags', timeEntryId),
      add: (timeEntryId, tagIds) => ipcRenderer.invoke('add-time-entry-tags', timeEntryId, tagIds),
    },
    appUsage: {
      get: (appUsageId) => ipcRenderer.invoke('get-app-usage-tags', appUsageId),
      add: (appUsageId, tagIds) => ipcRenderer.invoke('add-app-usage-tags', appUsageId, tagIds),
    },
    pomodoroSessions: {
      get: (pomodoroSessionId) => ipcRenderer.invoke('get-pomodoro-session-tags', pomodoroSessionId),
      add: (pomodoroSessionId, tagIds) => ipcRenderer.invoke('add-pomodoro-session-tags', pomodoroSessionId, tagIds),
      set: (pomodoroSessionId, tagIds) => ipcRenderer.invoke('set-pomodoro-session-tags', pomodoroSessionId, tagIds),
    },
    productivityGoals: {
      get: (productivityGoalId) => ipcRenderer.invoke('get-productivity-goal-tags', productivityGoalId),
      add: (productivityGoalId, tagIds) => ipcRenderer.invoke('add-productivity-goal-tags', productivityGoalId, tagIds),
      set: (productivityGoalId, tagIds) => ipcRenderer.invoke('set-productivity-goal-tags', productivityGoalId, tagIds),
    },
  };
}

function createStatisticsAPI(): IStatisticsAPI {
  return {
    getCategories: (startDate, endDate) => ipcRenderer.invoke('get-category-stats', startDate, endDate),
    getTags: (startDate, endDate) => ipcRenderer.invoke('get-tag-stats', startDate, endDate),
  };
}

function createTimelineAPI(): ITimelineAPI {
  return {
    getActivities: (startDate, endDate) => ipcRenderer.invoke('get-timeline-activities', startDate, endDate),
    getSummary: (startDate, endDate) => ipcRenderer.invoke('get-timeline-summary', startDate, endDate),
  };
}

function createAnalyticsAPI(): IAnalyticsAPI {
  return {
    getDailyStats: (startDate, endDate) => ipcRenderer.invoke('get-daily-productivity-stats', startDate, endDate),
    getHourlyPatterns: (days) => ipcRenderer.invoke('get-hourly-patterns', days),
    getHeatmap: (year) => ipcRenderer.invoke('get-heatmap-data', year),
    getWeeklySummary: (weekOffset) => ipcRenderer.invoke('get-weekly-summary', weekOffset),
    getTrends: (startDate, endDate, groupBy) => ipcRenderer.invoke('get-productivity-trends', startDate, endDate, groupBy),
    getInsights: () => ipcRenderer.invoke('get-behavioral-insights'),
    getSummary: () => ipcRenderer.invoke('get-analytics-summary'),
    getDistractionAnalysis: (days) => ipcRenderer.invoke('get-distraction-analysis', days),
  };
}

function createDataManagementAPI(): IDataManagementAPI {
  return {
    clearAll: () => ipcRenderer.invoke('clear-all-data'),
    export: (format) => ipcRenderer.invoke('export-data', format),
    import: (format, options) => ipcRenderer.invoke('import-data', format, options),
  };
}

function createActivitiesAPI(): IActivitiesAPI {
  return {
    getAll: (startDate, endDate, filters) => ipcRenderer.invoke('get-unified-activities', startDate, endDate, filters),
    getById: (id, sourceType) => ipcRenderer.invoke('get-unified-activity', id, sourceType),
    update: (options) => ipcRenderer.invoke('update-unified-activity', options),
    delete: (id, sourceType) => ipcRenderer.invoke('delete-unified-activity', id, sourceType),
    bulk: {
      update: (operation) => ipcRenderer.invoke('bulk-update-activities', operation),
      delete: (activityIds) => ipcRenderer.invoke('bulk-delete-activities', activityIds),
    },
    conflicts: {
      get: (startDate, endDate) => ipcRenderer.invoke('get-activity-conflicts', startDate, endDate),
    },
    stats: {
      get: (startDate, endDate) => ipcRenderer.invoke('get-unified-activity-stats', startDate, endDate),
    },
    search: (query, filters) => ipcRenderer.invoke('search-activities', query, filters),
    merge: (activityIds, strategy) => ipcRenderer.invoke('merge-activities', activityIds, strategy),
  };
}

function createDataQualityAPI(): IDataQualityAPI {
  return {
    gaps: {
      detect: (startDate, endDate, minGapMinutes) => ipcRenderer.invoke('detect-activity-gaps', startDate, endDate, minGapMinutes),
      getStatistics: (startDate, endDate, minGapMinutes) => ipcRenderer.invoke('get-gap-statistics', startDate, endDate, minGapMinutes),
    },
    duplicates: {
      detect: (startDate, endDate, similarityThreshold) => ipcRenderer.invoke('detect-duplicate-activities', startDate, endDate, similarityThreshold),
    },
    mergeable: {
      find: (startDate, endDate, maxGapSeconds) => ipcRenderer.invoke('find-mergeable-groups', startDate, endDate, maxGapSeconds),
    },
    orphaned: {
      find: (startDate, endDate) => ipcRenderer.invoke('find-orphaned-activities', startDate, endDate),
    },
    validation: {
      validateBatch: (startDate, endDate) => ipcRenderer.invoke('validate-activities-batch', startDate, endDate),
    },
    durations: {
      recalculate: (startDate, endDate) => ipcRenderer.invoke('recalculate-activity-durations', startDate, endDate),
    },
    zeroDuration: {
      find: (startDate, endDate, removeIfConfirmed) => ipcRenderer.invoke('find-zero-duration-activities', startDate, endDate, removeIfConfirmed),
    },
    report: {
      get: (startDate, endDate) => ipcRenderer.invoke('get-data-quality-report', startDate, endDate),
    },
  };
}

/**
 * Create Namespaced Electron API
 * This is the new, organized API structure
 */
const electronAPINamespaced: IElectronAPINamespaced = {
  timeEntries: createTimeEntriesAPI(),
  appUsage: createAppUsageAPI(),
  settings: createSettingsAPI(),
  activityTracking: createActivityTrackingAPI(),
  autoStart: createAutoStartAPI(),
  crashReporting: createCrashReportingAPI(),
  pomodoro: createPomodoroAPI(),
  goals: createGoalsAPI(),
  categories: createCategoriesAPI(),
  tags: createTagsAPI(),
  categoryMappings: createCategoryMappingsAPI(),
  tagAssociations: createTagAssociationsAPI(),
  statistics: createStatisticsAPI(),
  timeline: createTimelineAPI(),
  analytics: createAnalyticsAPI(),
  dataManagement: createDataManagementAPI(),
  activities: createActivitiesAPI(),
  dataQuality: createDataQualityAPI(),
};

/**
 * Hybrid API - Contains both namespaced (new) and flat (legacy) methods
 * This allows gradual migration without breaking existing code
 */
const hybridAPI = {
  // New namespaced API
  ...electronAPINamespaced,
  // Legacy flat API (deprecated but still working)
  ...electronAPI,
};

contextBridge.exposeInMainWorld('electronAPI', hybridAPI);