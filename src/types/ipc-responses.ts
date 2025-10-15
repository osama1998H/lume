/**
 * IPC Response Type Definitions
 *
 * Strongly-typed response interfaces for all IPC handlers.
 * These types ensure type safety across the Electron IPC boundary.
 */

import {
  TimeEntry,
  PomodoroSettings,
  PomodoroStats,
  ProductivityGoal,
  GoalProgress,
  GoalWithProgress,
  GoalStats,
  Todo,
  TodoWithCategory,
  TodoStats,
  Category,
  Tag,
  AppCategoryMapping,
  DomainCategoryMapping,
  CategoryStats,
  TagStats,
  DailyStats,
  HourlyPattern,
  HeatmapDay,
  WeeklySummary,
  ProductivityTrend,
  BehavioralInsight,
  AnalyticsSummary,
  TimelineActivity,
  UnifiedActivity,
  UnifiedActivityStats,
  ActivityConflict,
  TimeGap,
  ExportResult,
  ImportResult,
} from './index';

/**
 * Time Entries IPC Responses
 */
export type AddTimeEntryResponse = number; // Returns inserted ID
export type UpdateTimeEntryResponse = boolean;
export type GetActiveTimeEntryResponse = TimeEntry | null;

/**
 * App Usage IPC Responses
 */
export type AddAppUsageResponse = number; // Returns inserted ID

/**
 * Settings IPC Responses
 */
export interface SettingsResponse {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: boolean;
  autoStart: boolean;
  trackIdle: boolean;
  idleThreshold: number;
  dataRetentionDays: number;
}

export type SaveSettingsResponse = boolean;

/**
 * Activity Tracking IPC Responses
 */
export type ActivityTrackingStartResponse = boolean;
export type ActivityTrackingStopResponse = boolean;
export type ActivityTrackingStatusResponse = boolean;

export interface ActivitySession {
  id: number;
  appName: string;
  windowTitle: string;
  startTime: string;
  endTime: string;
  duration: number;
  category?: string;
}

export type CurrentSessionResponse = ActivitySession | null;
export type RecentSessionsResponse = ActivitySession[];

export interface TopApplication {
  appName: string;
  totalMinutes: number;
  sessionCount: number;
}

export type TopApplicationsResponse = TopApplication[];

export interface TopWebsite {
  domain: string;
  totalMinutes: number;
  visitCount: number;
}

export type TopWebsitesResponse = TopWebsite[];

/**
 * Auto-start IPC Responses
 */
export type AutoStartStatusResponse = boolean;
export type SetAutoStartResponse = boolean;

/**
 * Crash Reporting IPC Responses
 */
export interface CrashReport {
  id: string;
  date: string;
  error: string;
  stackTrace?: string;
}

export type LastCrashReportResponse = CrashReport | null;
export type UploadedReportsResponse = CrashReport[];
export type TestCrashResponse = boolean;

/**
 * Pomodoro Settings IPC Responses
 */
export type GetPomodoroSettingsResponse = PomodoroSettings;
export type SavePomodoroSettingsResponse = boolean;

/**
 * Pomodoro Sessions IPC Responses
 */
export type AddPomodoroSessionResponse = number; // Returns inserted ID
export type UpdatePomodoroSessionResponse = boolean;
export type GetPomodoroStatsResponse = PomodoroStats;

/**
 * Pomodoro Timer IPC Responses
 */
export type PomodoroTimerStartResponse = void;
export type PomodoroTimerPauseResponse = void;
export type PomodoroTimerResumeResponse = void;
export type PomodoroTimerStopResponse = void;
export type PomodoroTimerSkipResponse = void;

export interface PomodoroTimerStatus {
  isRunning: boolean;
  isPaused: boolean;
  sessionType: 'focus' | 'shortBreak' | 'longBreak' | null;
  remainingSeconds: number;
  totalSeconds: number;
  task: string | null;
  todoId: number | null;
}

export type PomodoroTimerStatusResponse = PomodoroTimerStatus;

/**
 * Goals IPC Responses
 */
export type AddGoalResponse = number; // Returns inserted ID
export type UpdateGoalResponse = boolean;
export type DeleteGoalResponse = boolean;
export type GetAllGoalsResponse = ProductivityGoal[];
export type GetTodayGoalsWithProgressResponse = GoalWithProgress[];
export type GetGoalProgressResponse = GoalProgress | null;
export type GetAchievementHistoryResponse = GoalProgress[];
export type GetGoalStatsResponse = GoalStats;

/**
 * Todos IPC Responses
 */
export type AddTodoResponse = number; // Returns inserted ID
export type UpdateTodoResponse = boolean;
export type DeleteTodoResponse = boolean;
export type GetAllTodosResponse = Todo[];
export type GetTodoByIdResponse = Todo | null;
export type GetTodoStatsResponse = TodoStats;
export type GetTodosWithCategoryResponse = TodoWithCategory[];
export type LinkTodoTimeEntryResponse = boolean;
export type IncrementTodoPomodoroResponse = boolean;

/**
 * Categories IPC Responses
 */
export type GetAllCategoriesResponse = Category[];
export type GetCategoryByIdResponse = Category | null;
export type AddCategoryResponse = number; // Returns inserted ID
export type UpdateCategoryResponse = boolean;
export type DeleteCategoryResponse = boolean;

/**
 * Tags IPC Responses
 */
export type GetAllTagsResponse = Tag[];
export type AddTagResponse = number; // Returns inserted ID
export type UpdateTagResponse = boolean;
export type DeleteTagResponse = boolean;

/**
 * Category Mappings IPC Responses
 */
export type GetAllAppMappingsResponse = AppCategoryMapping[];
export type AddAppMappingResponse = number; // Returns inserted ID
export type DeleteAppMappingResponse = boolean;

export type GetAllDomainMappingsResponse = DomainCategoryMapping[];
export type AddDomainMappingResponse = number; // Returns inserted ID
export type DeleteDomainMappingResponse = boolean;

/**
 * Tag Associations IPC Responses
 */
export type GetTagsResponse = Tag[];
export type AddTagsResponse = void;
export type SetTagsResponse = void;

/**
 * Statistics IPC Responses
 */
export type GetCategoryStatsResponse = CategoryStats[];
export type GetTagStatsResponse = TagStats[];

/**
 * Timeline IPC Responses
 */
export type GetTimelineActivitiesResponse = TimelineActivity[];

export interface TimelineSummaryResponse {
  totalActivities: number;
  totalDuration: number;
  averageDuration: number;
  longestActivity: TimelineActivity | null;
  categoryBreakdown: CategoryStats[];
}

/**
 * Analytics IPC Responses
 */
export type GetDailyStatsResponse = DailyStats[];
export type GetHourlyPatternsResponse = HourlyPattern[];
export type GetHeatmapDataResponse = HeatmapDay[];
export type GetWeeklySummaryResponse = WeeklySummary;
export type GetProductivityTrendsResponse = ProductivityTrend[];
export type GetBehavioralInsightsResponse = BehavioralInsight[];
export type GetAnalyticsSummaryResponse = AnalyticsSummary;

export interface DistractionAnalysisItem {
  appName: string;
  totalMinutes: number;
  sessionCount: number;
  avgSessionMinutes: number;
  distractionScore: number;
}

export type GetDistractionAnalysisResponse = DistractionAnalysisItem[];

/**
 * Data Management IPC Responses
 */
export type ClearAllDataResponse = boolean;
export type ExportDataResponse = ExportResult;
export type ImportDataResponse = ImportResult;

/**
 * Unified Activities IPC Responses
 */
export type GetAllActivitiesResponse = UnifiedActivity[];
export type GetActivityByIdResponse = UnifiedActivity | null;
export type UpdateActivityResponse = boolean;
export type DeleteActivityResponse = boolean;

export interface BulkUpdateResponse {
  success: boolean;
  updated: number;
  failed: number;
}

export interface BulkDeleteResponse {
  success: boolean;
  deleted: number;
  failed: number;
}

export type GetActivityConflictsResponse = ActivityConflict[];
export type GetActivityStatsResponse = UnifiedActivityStats;
export type SearchActivitiesResponse = UnifiedActivity[];

export interface MergeActivitiesResponse {
  success: boolean;
  mergedActivity?: UnifiedActivity;
  error?: string;
}

/**
 * Data Quality IPC Responses
 */
export type DetectGapsResponse = TimeGap[];

export interface GapStatisticsResponse {
  totalGaps: number;
  totalUntrackedSeconds: number;
  averageGapSeconds: number;
  longestGapSeconds: number;
}

export interface DuplicateGroup {
  activities: UnifiedActivity[];
  avgSimilarity: number;
}

export type DetectDuplicatesResponse = DuplicateGroup[];

export type FindMergeableResponse = UnifiedActivity[][];

export type FindOrphanedResponse = UnifiedActivity[];

export interface ValidationBatchResponse {
  valid: Array<{ activity: UnifiedActivity; warnings: string[] }>;
  invalid: Array<{ activity: UnifiedActivity; errors: string[]; warnings: string[] }>;
}

export interface RecalculateDurationsResponse {
  success: boolean;
  recalculated: number;
  errors: string[];
}

export interface FindZeroDurationResponse {
  activities: UnifiedActivity[];
  removed: number;
}

export interface DataQualityReportResponse {
  totalActivities: number;
  validActivities: number;
  invalidActivities: number;
  warningsCount: number;
  orphanedCount: number;
  zeroDurationCount: number;
  gapsCount: number;
  duplicateGroupsCount: number;
  qualityScore: number;
}

/**
 * Error Response
 * Standard error response for failed IPC operations
 */
export interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
}

/**
 * Success Response
 * Standard success response for operations without specific return data
 */
export interface SuccessResponse {
  success: true;
  message?: string;
}
