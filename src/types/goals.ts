import type { Tag } from './categories';

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
