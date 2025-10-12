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

export interface IElectronAPI {
  getTimeEntries: () => Promise<any[]>;
  addTimeEntry: (entry: any) => Promise<number>;
  updateTimeEntry: (id: number, updates: any) => Promise<boolean>;
  getActiveTimeEntry: () => Promise<any | null>;
  getAppUsage: () => Promise<any[]>;
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
  getPomodoroSessions: (limit?: number) => Promise<any[]>;
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
  getTimeEntries: () => ipcRenderer.invoke('get-time-entries'),
  addTimeEntry: (entry) => ipcRenderer.invoke('add-time-entry', entry),
  updateTimeEntry: (id, updates) => ipcRenderer.invoke('update-time-entry', id, updates),
  getActiveTimeEntry: () => ipcRenderer.invoke('get-active-time-entry'),
  getAppUsage: () => ipcRenderer.invoke('get-app-usage'),
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
  getPomodoroSessions: (limit) => ipcRenderer.invoke('get-pomodoro-sessions', limit),
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

contextBridge.exposeInMainWorld('electronAPI', electronAPI);