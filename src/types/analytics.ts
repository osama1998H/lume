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
