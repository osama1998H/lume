import type { CSSProperties } from 'react';

export interface TimeEntry {
  id?: number;
  task: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  category?: string; // Kept for backward compatibility
  categoryId?: number; // New category ID reference
  tags?: Tag[]; // Tags associated with this entry
  createdAt?: string;
}

export interface AppUsage {
  id?: number;
  appName: string;
  windowTitle?: string;
  category?: string; // Kept for backward compatibility
  categoryId?: number; // New category ID reference
  domain?: string;
  url?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  isBrowser?: boolean;
  isIdle?: boolean;
  tags?: Tag[]; // Tags associated with this usage
  createdAt?: string;
}

export interface PomodoroSession {
  id?: number;
  task: string;
  sessionType: 'focus' | 'shortBreak' | 'longBreak';
  duration: number; // in seconds
  startTime: string;
  endTime?: string;
  completed: boolean;
  interrupted: boolean;
  tags?: Tag[]; // Tags associated with this session
  createdAt?: string;
}

export interface PomodoroSettings {
  focusDuration: number; // in minutes, default 25
  shortBreakDuration: number; // in minutes, default 5
  longBreakDuration: number; // in minutes, default 15
  longBreakInterval: number; // after how many sessions, default 4
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  dailyGoal: number; // number of focus sessions
}

export interface PomodoroStats {
  totalSessions: number;
  completedSessions: number;
  totalFocusTime: number; // in seconds
  totalBreakTime: number; // in seconds
  completionRate: number; // percentage
  currentStreak: number; // consecutive days with completed sessions
}

// Productivity Goals Types
export type GoalOperator = 'gte' | 'lte' | 'eq';
export type GoalPeriod = 'daily' | 'weekly';
export type GoalType = 'daily_time' | 'weekly_time' | 'category' | 'app_limit';
export type GoalStatus = 'not_started' | 'in_progress' | 'achieved' | 'exceeded' | 'failed';

export interface ProductivityGoal {
  id?: number;
  name: string;
  description?: string;
  goalType: GoalType;
  category?: string;
  appName?: string;
  targetMinutes: number;
  operator: GoalOperator;
  period: GoalPeriod;
  active: boolean;
  notificationsEnabled: boolean;
  notifyAtPercentage: number; // 50, 75, 90, or 100
  tags?: Tag[]; // Tags associated with this goal
  createdAt?: string;
  updatedAt?: string;
}

export interface GoalProgress {
  id?: number;
  goalId: number;
  date: string; // YYYY-MM-DD
  progressMinutes: number;
  achieved: boolean;
  notified: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface GoalWithProgress extends ProductivityGoal {
  todayProgress?: GoalProgress;
  progressPercentage: number;
  timeRemaining: number;
  status: GoalStatus;
}

export interface GoalStats {
  totalGoals: number;
  activeGoals: number;
  achievedToday: number;
  currentStreak: number;
  longestStreak: number;
  achievementRate: number; // percentage
}

// Categorization & Tagging Types
export interface Category {
  id?: number;
  name: string;
  color: string; // Hex color
  icon?: string; // Lucide icon name
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Tag {
  id?: number;
  name: string;
  color: string; // Hex color
  createdAt?: string;
}

export interface AppCategoryMapping {
  id?: number;
  appName: string;
  categoryId: number;
  categoryName?: string;
  categoryColor?: string;
  createdAt?: string;
}

export interface DomainCategoryMapping {
  id?: number;
  domain: string;
  categoryId: number;
  categoryName?: string;
  categoryColor?: string;
  createdAt?: string;
}

export interface CategoryStats {
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  totalTime: number; // in seconds
  percentage: number;
  activityCount: number;
}

export interface TagStats {
  tagId: number;
  tagName: string;
  tagColor: string;
  totalTime: number; // in seconds
  percentage: number;
  activityCount: number;
}

// Timeline Types
export interface TimelineActivity {
  id: number;
  type: 'app' | 'browser' | 'time_entry';
  title: string;
  startTime: string;
  endTime: string;
  duration: number; // in seconds
  categoryId?: number;
  categoryName?: string;
  categoryColor?: string;
  tags?: Tag[];
  metadata?: {
    appName?: string;
    windowTitle?: string;
    domain?: string;
    url?: string;
    isIdle?: boolean;
  };
}

export interface TimelineItem {
  id: number;
  group: number;
  title: string;
  start_time: number; // timestamp
  end_time: number; // timestamp
  canMove: boolean;
  canResize: boolean;
  canChangeGroup: boolean;
  itemProps?: {
    className?: string;
    style?: CSSProperties;
  };
}

export interface TimelineGroup {
  id: number;
  title: string;
  stackItems?: boolean;
  height?: number;
}

export interface TimelineFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  activityTypes: ('app' | 'browser' | 'time_entry')[];
  categories: number[];
  tags: number[];
  searchQuery: string;
}

export interface TimelineSummary {
  totalActivities: number;
  totalDuration: number; // in seconds
  averageDuration: number; // in seconds
  longestActivity: TimelineActivity | null;
  categoryBreakdown: CategoryStats[];
}

// Unified Activity Types (for Activity Log feature)
export type ActivitySourceType = 'manual' | 'automatic' | 'pomodoro';
export type UnifiedActivityType = 'time_entry' | 'app' | 'browser' | 'pomodoro_focus' | 'pomodoro_break';
export type ConflictType = 'overlap' | 'duplicate' | 'gap';

/**
 * Unified Activity - Combines TimeEntry, AppUsage, and PomodoroSession
 * into a single interface for the unified activity log
 */
export interface UnifiedActivity {
  // Core fields
  id: number;
  sourceType: ActivitySourceType; // Where did this activity come from
  type: UnifiedActivityType; // Specific activity type
  title: string; // Task name, app name, or "Focus Session"
  startTime: string; // ISO string
  endTime: string; // ISO string
  duration: number; // in seconds

  // Categorization
  categoryId?: number;
  categoryName?: string;
  categoryColor?: string;
  tags?: Tag[];

  // Source-specific metadata
  metadata?: UnifiedActivityMetadata;

  // Editability flags
  isEditable: boolean; // Can this activity be edited
  editableFields: string[]; // Which fields can be edited (e.g., ['title', 'categoryId', 'tags'])

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Metadata specific to each activity type
 */
export interface UnifiedActivityMetadata {
  // For automatic app/browser activities
  appName?: string;
  windowTitle?: string;
  domain?: string;
  url?: string;
  isBrowser?: boolean;
  isIdle?: boolean;

  // For pomodoro sessions
  sessionType?: 'focus' | 'shortBreak' | 'longBreak';
  completed?: boolean;
  interrupted?: boolean;

  // Original IDs for referencing source tables
  originalId?: number;
  originalTable?: 'time_entries' | 'app_usage' | 'pomodoro_sessions';
}

/**
 * Filters for querying unified activities
 */
export interface UnifiedActivityFilters {
  dateRange?: {
    start: string; // ISO string
    end: string; // ISO string
  };
  sourceTypes?: ActivitySourceType[]; // Filter by source
  activityTypes?: UnifiedActivityType[]; // Filter by type
  categories?: number[]; // Category IDs
  tags?: number[]; // Tag IDs
  searchQuery?: string; // Full-text search
  minDuration?: number; // Min duration in seconds
  maxDuration?: number; // Max duration in seconds
  isEditable?: boolean; // Only editable/non-editable activities
}

/**
 * Options for updating unified activities
 */
export interface UnifiedActivityUpdateOptions {
  id: number;
  sourceType: ActivitySourceType;
  updates: Partial<UnifiedActivity>;
  validateOverlap?: boolean; // Check for time overlaps
  resolveConflicts?: 'merge' | 'split' | 'cancel'; // How to handle conflicts
}

/**
 * Bulk operation options
 */
export interface BulkActivityOperation {
  activityIds: Array<{ id: number; sourceType: ActivitySourceType }>;
  operation: 'update' | 'delete' | 'merge';
  updates?: Partial<UnifiedActivity>; // For bulk updates
  mergeStrategy?: 'longest' | 'earliest' | 'latest'; // For merge operations
  addTagIds?: number[]; // Tag IDs to add to activities
  removeTagIds?: number[]; // Tag IDs to remove from activities
}

/**
 * Activity conflict detection result
 */
export interface ActivityConflict {
  conflictType: 'overlap' | 'duplicate' | 'gap';
  activities: UnifiedActivity[];
  suggestedResolution?: 'merge' | 'split' | 'delete_one' | 'adjust_time';
  message: string;
}

/**
 * Statistics for unified activities
 */
export interface UnifiedActivityStats {
  totalActivities: number;
  totalDuration: number; // in seconds
  bySourceType: {
    manual: number;
    automatic: number;
    pomodoro: number;
  };
  byCategory: CategoryStats[];
  editableCount: number;
  conflictsCount: number;
  gapsDetected: number;
}

// Activity Validation & Merge Types
/**
 * Result of activity validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Result of overlap detection
 */
export interface OverlapResult {
  hasOverlap: boolean;
  overlappingActivities: UnifiedActivity[];
  overlapDuration: number; // in seconds
}

/**
 * Result of duplicate detection
 */
export interface DuplicateResult {
  isDuplicate: boolean;
  duplicateActivities: UnifiedActivity[];
  similarity: number; // 0-100%
}

/**
 * Activity with its resolution action
 */
export interface ResolvedActivity {
  activity: UnifiedActivity;
  action: 'keep' | 'delete' | 'update';
}

/**
 * Suggestion for merging activities
 */
export interface MergeSuggestion {
  canMerge: boolean;
  reason: string;
  confidence: number; // 0-100%
  mergedActivity?: UnifiedActivity;
}

/**
 * Time gap between activities
 */
export interface TimeGap {
  startTime: string; // ISO string
  endTime: string; // ISO string
  duration: number; // in seconds
  beforeActivity?: UnifiedActivity;
  afterActivity?: UnifiedActivity;
}

// Analytics Types
export interface DailyStats {
  date: string; // ISO date string
  totalMinutes: number;
  focusMinutes: number;
  breakMinutes: number;
  idleMinutes: number;
  completedTasks: number;
  categories: CategoryTime[];
}

export interface CategoryTime {
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  minutes: number;
  percentage: number;
}

export interface HourlyPattern {
  hour: number; // 0-23
  avgMinutes: number;
  dayCount: number; // how many days contributed to this average
}

export interface HeatmapDay {
  date: string; // ISO date string
  intensity: 0 | 1 | 2 | 3 | 4; // 0 = none, 4 = highest
  totalMinutes: number;
  breakdown: {
    focus: number;
    apps: number;
    browser: number;
  };
}

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  totalMinutes: number;
  avgDailyMinutes: number;
  topDay: { date: string; minutes: number } | null;
  topCategories: CategoryTime[];
  goalsAchieved: number;
  totalGoals: number;
  comparisonToPrevious: number; // percentage change from previous week
  insights: string[];
}

export interface ProductivityTrend {
  date: string;
  value: number;
  category?: string;
}

export interface PeakHour {
  hour: number;
  avgMinutes: number;
  daysAnalyzed: number;
}

export interface IdlePattern {
  dayOfWeek: string;
  hour: number;
  avgIdleMinutes: number;
}

export interface DistractionMetric {
  appName: string;
  totalMinutes: number;
  sessionCount: number;
  avgSessionMinutes: number;
}

export interface BehavioralInsight {
  type: 'peak_hour' | 'productive_day' | 'category_trend' | 'distraction' | 'streak' | 'focus_quality';
  title: string;
  description: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export interface AnalyticsSummary {
  productivityScore: number; // 0-100
  totalProductiveMinutes: number;
  avgDailyFocusHours: number;
  peakHour: number;
  mostProductiveDay: string;
  weeklyStreak: number;
}

// Data Export/Import Types
export interface ExportData {
  version: string; // App version
  schemaVersion: number; // Database schema version
  exportDate: string; // ISO timestamp
  tables: {
    timeEntries: TimeEntry[];
    appUsage: AppUsage[];
    categories: Category[];
    tags: Tag[];
    pomodoroSessions: PomodoroSession[];
    productivityGoals: ProductivityGoal[];
    goalProgress: GoalProgress[];
    appCategoryMappings: AppCategoryMapping[];
    domainCategoryMappings: DomainCategoryMapping[];
    timeEntryTags: Array<{ timeEntryId: number; tagId: number }>;
    appUsageTags: Array<{ appUsageId: number; tagId: number }>;
    pomodoroSessionTags: Array<{ pomodoroSessionId: number; tagId: number }>;
    productivityGoalTags: Array<{ productivityGoalId: number; tagId: number }>;
  };
}

export type ImportStrategy = 'merge' | 'replace' | 'skip_duplicates';

export interface ImportOptions {
  strategy: ImportStrategy;
  validateOnly?: boolean; // If true, only validate without importing
}

export interface ImportResult {
  success: boolean;
  recordsImported: number;
  recordsSkipped: number;
  recordsUpdated: number;
  errors: string[];
  warnings: string[];
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface ElectronAPI {
  getTimeEntries: () => Promise<TimeEntry[]>;
  addTimeEntry: (entry: TimeEntry) => Promise<number>;
  updateTimeEntry: (id: number, updates: Partial<TimeEntry>) => Promise<boolean>;
  getActiveTimeEntry: () => Promise<TimeEntry | null>;
  getAppUsage: () => Promise<AppUsage[]>;
  addAppUsage: (usage: AppUsage) => Promise<number>;
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<boolean>;
  getActivityTrackingStatus: () => Promise<boolean>;
  startActivityTracking: () => Promise<boolean>;
  stopActivityTracking: () => Promise<boolean>;
  getRecentActivitySessions: (limit?: number) => Promise<any[]>;
  getTopApplications: (limit?: number) => Promise<any[]>;
  getTopWebsites: (limit?: number) => Promise<any[]>;
  // Auto-start API
  getAutoStartStatus: () => Promise<boolean>;
  setAutoStart: (enabled: boolean) => Promise<boolean>;
  // Pomodoro API
  getPomodoroSettings: () => Promise<PomodoroSettings>;
  savePomodoroSettings: (settings: PomodoroSettings) => Promise<boolean>;
  addPomodoroSession: (session: PomodoroSession) => Promise<number>;
  updatePomodoroSession: (id: number, updates: Partial<PomodoroSession>) => Promise<boolean>;
  getPomodoroSessions: (limit?: number) => Promise<PomodoroSession[]>;
  getPomodoroStats: (startDate?: string, endDate?: string) => Promise<PomodoroStats>;
  // Pomodoro Timer Control
  startPomodoroSession: (task: string, sessionType: 'focus' | 'shortBreak' | 'longBreak') => Promise<void>;
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
  getTimelineActivities: (startDate: string, endDate: string) => Promise<TimelineActivity[]>;
  getTimelineSummary: (startDate: string, endDate: string) => Promise<TimelineSummary>;

  // Analytics API
  getDailyProductivityStats: (startDate: string, endDate: string) => Promise<DailyStats[]>;
  getHourlyPatterns: (days: number) => Promise<HourlyPattern[]>;
  getHeatmapData: (year: number) => Promise<HeatmapDay[]>;
  getWeeklySummary: (weekOffset: number) => Promise<WeeklySummary>;
  getProductivityTrends: (startDate: string, endDate: string, groupBy: 'day' | 'week' | 'month') => Promise<ProductivityTrend[]>;
  getBehavioralInsights: () => Promise<BehavioralInsight[]>;
  getAnalyticsSummary: () => Promise<AnalyticsSummary>;
  getDistractionAnalysis: (days: number) => Promise<DistractionMetric[]>;
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

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}