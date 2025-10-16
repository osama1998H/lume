import type { ProductivityGoal, GoalWithProgress, GoalProgress, GoalStats } from './goals';
import type { Todo, TodoWithCategory, TodoStats, TodoStatus, TodoPriority } from './todos';
import type { Category, Tag, AppCategoryMapping, DomainCategoryMapping, CategoryStats, TagStats } from './categories';
import type { ActivitySourceType, UnifiedActivity, UnifiedActivityFilters, UnifiedActivityUpdateOptions, BulkActivityOperation, ActivityConflict, UnifiedActivityStats } from './unified-activity';
import type { ExportResult, ImportResult, ImportOptions } from './data-management';
import type { TimeGap } from './validation';
import type { MCPClient, MCPBridgeStatus, MCPConfigResult, MCPConfigFileInfo } from './mcp';

/**
 * Electron IPC API Interfaces - Namespaced Structure (Phase 4 Refactoring)
 * These interfaces define the shape of the Electron API exposed to the renderer process
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
 * Namespaced Electron API Interface
 * All renderer components use this structured API
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

declare global {
  interface Window {
    electronAPI: IElectronAPINamespaced;
  }
}
