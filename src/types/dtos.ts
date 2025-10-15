/**
 * Data Transfer Objects (DTOs)
 *
 * Typed interfaces for database query results and complex data structures.
 * These DTOs provide type safety for data moving between database and application layers.
 */

import { DatabaseRow } from './database';

/**
 * Analytics Query Result DTOs
 * Used by AnalyticsService for strongly-typed query results
 */

export interface DailyStatsQueryRow extends DatabaseRow {
  date: string;
  totalMinutes: number;
  focusMinutes: number;
  breakMinutes: number;
  idleMinutes: number;
  completedTasks: number;
}

export interface CategoryTimeQueryRow extends DatabaseRow {
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  minutes: number;
}

export interface HourlyPatternQueryRow extends DatabaseRow {
  hour: number;
  avgMinutes: number;
  dayCount: number;
}

export interface HeatmapQueryRow extends DatabaseRow {
  date: string;
  totalMinutes: number;
  intensity: number;
  focus: number;
  apps: number;
  browser: number;
}

export interface WeeklySummaryTotalQueryRow extends DatabaseRow {
  total_minutes: number;
}

export interface WeeklySummaryDailyQueryRow extends DatabaseRow {
  date: string;
  minutes: number;
}

export interface WeeklySummaryCategoryQueryRow extends DatabaseRow {
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  minutes: number;
}

export interface WeeklySummaryGoalsQueryRow extends DatabaseRow {
  total: number;
  achieved: number;
}

export interface ProductivityTrendQueryRow extends DatabaseRow {
  date: string;
  value: number;
}

export interface PeakHourQueryRow extends DatabaseRow {
  hour: number;
  total_minutes: number;
}

export interface ProductiveDayQueryRow extends DatabaseRow {
  day_name: string;
  total_minutes: number;
}

export interface CategoryTrendQueryRow extends DatabaseRow {
  category_name: string;
  minutes: number;
}

export interface DistractionQueryRow extends DatabaseRow {
  app_name: string;
  session_count: number;
  avg_session_minutes: number;
}

export interface FocusQualityQueryRow extends DatabaseRow {
  total_sessions: number;
  completed_sessions: number;
}

export interface StreakQueryRow extends DatabaseRow {
  streak_days: number;
}

export interface AnalyticsSummaryProductiveQueryRow extends DatabaseRow {
  total_minutes: number;
}

export interface AnalyticsSummaryAvgFocusQueryRow extends DatabaseRow {
  avg_hours: number;
}

/**
 * Repository Query Result DTOs
 * Used by various repositories for typed query results
 */

export interface TimeEntryQueryRow extends DatabaseRow {
  id: number;
  task: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  category: string | null;
  category_id: number | null;
  todo_id: number | null;
  created_at: string;
}

export interface AppUsageQueryRow extends DatabaseRow {
  id: number;
  app_name: string;
  window_title: string | null;
  category: string | null;
  category_id: number | null;
  domain: string | null;
  url: string | null;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  is_browser: number;
  is_idle: number;
  created_at: string;
}

export interface PomodoroSessionQueryRow extends DatabaseRow {
  id: number;
  task: string;
  session_type: 'focus' | 'shortBreak' | 'longBreak';
  duration: number;
  start_time: string;
  end_time: string | null;
  completed: number;
  interrupted: number;
  todo_id: number | null;
  created_at: string;
}

export interface CategoryQueryRow extends DatabaseRow {
  id: number;
  name: string;
  color: string;
  icon: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface TagQueryRow extends DatabaseRow {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface GoalQueryRow extends DatabaseRow {
  id: number;
  name: string;
  description: string | null;
  goal_type: string;
  category: string | null;
  app_name: string | null;
  target_minutes: number;
  operator: string;
  period: string;
  active: number;
  notifications_enabled: number;
  notify_at_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface GoalProgressQueryRow extends DatabaseRow {
  id: number;
  goal_id: number;
  date: string;
  progress_minutes: number;
  achieved: number;
  notified: number;
  created_at: string;
  updated_at: string;
}

export interface TodoQueryRow extends DatabaseRow {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category_id: number | null;
  due_date: string | null;
  due_time: string | null;
  completed_at: string | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  time_entry_id: number | null;
  pomodoro_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface AppCategoryMappingQueryRow extends DatabaseRow {
  id: number;
  app_name: string;
  category_id: number;
  created_at: string;
}

export interface DomainCategoryMappingQueryRow extends DatabaseRow {
  id: number;
  domain: string;
  category_id: number;
  created_at: string;
}

export interface TagAssociationQueryRow extends DatabaseRow {
  id: number;
  tag_id: number;
  time_entry_id: number | null;
  app_usage_id: number | null;
  pomodoro_session_id: number | null;
  productivity_goal_id: number | null;
  todo_id: number | null;
  created_at: string;
}

/**
 * Statistics Query Result DTOs
 */

export interface CategoryStatsQueryRow extends DatabaseRow {
  category_id: number;
  category_name: string;
  category_color: string;
  total_time: number;
  activity_count: number;
}

export interface TagStatsQueryRow extends DatabaseRow {
  tag_id: number;
  tag_name: string;
  tag_color: string;
  total_time: number;
  activity_count: number;
}

/**
 * Count Query Result
 * Standard result for COUNT(*) queries
 */
export interface CountQueryRow extends DatabaseRow {
  count: number;
}

/**
 * Generic ID Result
 * For queries that return a single ID
 */
export interface IdQueryRow extends DatabaseRow {
  id: number;
}
