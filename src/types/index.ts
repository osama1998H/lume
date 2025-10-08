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
  // Statistics API
  getCategoryStats: (startDate?: string, endDate?: string) => Promise<CategoryStats[]>;
  getTagStats: (startDate?: string, endDate?: string) => Promise<TagStats[]>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}