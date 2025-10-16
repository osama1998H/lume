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
  TimeGap,
  Todo,
  TodoWithCategory,
  TodoStats,
  TodoStatus,
  TodoPriority,
  MCPClient,
  MCPBridgeStatus,
  MCPConfigResult,
  MCPConfigFileInfo
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
    start: (task: string, sessionType: string, todoId?: number) => Promise<void>;
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

// Todos namespace
interface ITodosAPI {
  add: (todo: Partial<Todo>) => Promise<number>;
  update: (id: number, updates: Partial<Todo>) => Promise<boolean>;
  delete: (id: number) => Promise<boolean>;
  getAll: (options?: { status?: TodoStatus; priority?: TodoPriority }) => Promise<Todo[]>;
  getById: (id: number) => Promise<Todo | null>;
  getStats: () => Promise<TodoStats>;
  getTodosWithCategory: () => Promise<TodoWithCategory[]>;
  linkTimeEntry: (todoId: number, timeEntryId: number) => Promise<boolean>;
  incrementPomodoro: (todoId: number) => Promise<boolean>;
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
  todos: {
    get: (todoId: number) => Promise<Tag[]>;
    add: (todoId: number, tagIds: number[]) => Promise<void>;
    set: (todoId: number, tagIds: number[]) => Promise<void>;
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

// MCP Configuration namespace
interface IMCPConfigAPI {
  getBridgeStatus: () => Promise<MCPBridgeStatus>;
  getServerPath: () => Promise<string>;
  generateConfig: (client: MCPClient) => Promise<string>;
  autoConfigure: (client: MCPClient) => Promise<MCPConfigResult>;
  detectConfigFile: (client: MCPClient) => Promise<MCPConfigFileInfo>;
  copyToClipboard: (text: string) => Promise<boolean>;
  getClientDisplayName: (client: MCPClient) => Promise<string>;
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
  todos: ITodosAPI;
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
  mcpConfig: IMCPConfigAPI;
}

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
      start: (task, sessionType, todoId) => ipcRenderer.invoke('start-pomodoro-session', task, sessionType, todoId),
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
    add: (goal) => ipcRenderer.invoke('add-goal', { goal }),
    update: (id, updates) => ipcRenderer.invoke('update-goal', { id, updates }),
    delete: (id) => ipcRenderer.invoke('delete-goal', { id }),
    getAll: (activeOnly) => ipcRenderer.invoke('get-goals', activeOnly),
    getTodayWithProgress: () => ipcRenderer.invoke('get-today-goals-with-progress'),
    getProgress: (goalId, date) => ipcRenderer.invoke('get-goal-progress', { goalId, date }),
    getAchievementHistory: (goalId, days) => ipcRenderer.invoke('get-goal-achievement-history', { goalId, days }),
    getStats: () => ipcRenderer.invoke('get-goal-stats'),
  };
}

function createTodosAPI(): ITodosAPI {
  return {
    add: (todo) => ipcRenderer.invoke('add-todo', { todo }),
    update: (id, updates) => ipcRenderer.invoke('update-todo', { id, updates }),
    delete: (id) => ipcRenderer.invoke('delete-todo', { id }),
    getAll: (options) => ipcRenderer.invoke('get-todos', options),
    getById: (id) => ipcRenderer.invoke('get-todo-by-id', id),
    getStats: () => ipcRenderer.invoke('get-todo-stats'),
    getTodosWithCategory: () => ipcRenderer.invoke('get-todos-with-category'),
    linkTimeEntry: (todoId, timeEntryId) => ipcRenderer.invoke('link-todo-time-entry', todoId, timeEntryId),
    incrementPomodoro: (todoId) => ipcRenderer.invoke('increment-todo-pomodoro', todoId),
  };
}

function createCategoriesAPI(): ICategoriesAPI {
  return {
    getAll: () => ipcRenderer.invoke('get-categories'),
    getById: (id) => ipcRenderer.invoke('get-category-by-id', id),
    add: (category) => ipcRenderer.invoke('add-category', { category }),
    update: (id, updates) => ipcRenderer.invoke('update-category', { id, updates }),
    delete: (id) => ipcRenderer.invoke('delete-category', { id }),
  };
}

function createTagsAPI(): ITagsAPI {
  return {
    getAll: () => ipcRenderer.invoke('get-tags'),
    add: (tag) => ipcRenderer.invoke('add-tag', { tag }),
    update: (id, updates) => ipcRenderer.invoke('update-tag', { id, updates }),
    delete: (id) => ipcRenderer.invoke('delete-tag', { id }),
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
    todos: {
      get: (todoId) => ipcRenderer.invoke('get-todo-tags', todoId),
      add: (todoId, tagIds) => ipcRenderer.invoke('add-todo-tags', todoId, tagIds),
      set: (todoId, tagIds) => ipcRenderer.invoke('set-todo-tags', todoId, tagIds),
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
    getDailyStats: (startDate, endDate) => ipcRenderer.invoke('get-daily-productivity-stats', { startDate, endDate }),
    getHourlyPatterns: (days) => ipcRenderer.invoke('get-hourly-patterns', { days }),
    getHeatmap: (year) => ipcRenderer.invoke('get-heatmap-data', { year }),
    getWeeklySummary: (weekOffset) => ipcRenderer.invoke('get-weekly-summary', { weekOffset }),
    getTrends: (startDate, endDate, groupBy) => ipcRenderer.invoke('get-productivity-trends', { startDate, endDate, groupBy }),
    getInsights: () => ipcRenderer.invoke('get-behavioral-insights'),
    getSummary: () => ipcRenderer.invoke('get-analytics-summary'),
    getDistractionAnalysis: (days) => ipcRenderer.invoke('get-distraction-analysis', { days }),
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

function createMCPConfigAPI(): IMCPConfigAPI {
  return {
    getBridgeStatus: () => ipcRenderer.invoke('mcp-get-bridge-status'),
    getServerPath: () => ipcRenderer.invoke('mcp-get-server-path'),
    generateConfig: (client) => ipcRenderer.invoke('mcp-generate-config', client),
    autoConfigure: (client) => ipcRenderer.invoke('mcp-auto-configure', client),
    detectConfigFile: (client) => ipcRenderer.invoke('mcp-detect-config-file', client),
    copyToClipboard: (text) => ipcRenderer.invoke('mcp-copy-to-clipboard', text),
    getClientDisplayName: (client) => ipcRenderer.invoke('mcp-get-client-display-name', client),
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
  todos: createTodosAPI(),
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
  mcpConfig: createMCPConfigAPI(),
};

/**
 * Expose the Namespaced Electron API to the renderer process
 * All renderer components now use the namespaced API structure
 */
contextBridge.exposeInMainWorld('electronAPI', electronAPINamespaced);