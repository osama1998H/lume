import Database from 'better-sqlite3';
import {
  DailyStats,
  HourlyPattern,
  HeatmapDay,
  WeeklySummary,
  ProductivityTrend,
  BehavioralInsight,
  AnalyticsSummary,
  CategoryTime,
} from '../../types';
import {
  DailyStatsQueryRow,
  CategoryTimeQueryRow,
  HourlyPatternQueryRow,
  HeatmapQueryRow,
  WeeklySummaryTotalQueryRow,
  WeeklySummaryDailyQueryRow,
  WeeklySummaryCategoryQueryRow,
  WeeklySummaryGoalsQueryRow,
  ProductivityTrendQueryRow,
  PeakHourQueryRow,
  ProductiveDayQueryRow,
  CategoryTrendQueryRow,
  DistractionQueryRow,
  FocusQualityQueryRow,
  StreakQueryRow,
  AnalyticsSummaryProductiveQueryRow,
  AnalyticsSummaryAvgFocusQueryRow,
} from '../../types/dtos';

/**
 * Service for analytics and statistics calculations
 * Handles complex queries for productivity insights, trends, and behavioral analysis
 */
export class AnalyticsService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Query total active time between two timestamps (returns minutes)
   */
  queryTotalActiveTime(startTime: string, endTime: string): number {
    const result = this.db
      .prepare(
        `
      SELECT COALESCE(SUM(duration), 0) as total_seconds
      FROM app_usage
      WHERE start_time >= ? AND start_time <= ?
      AND is_idle = 0
    `
      )
      .get(startTime, endTime) as { total_seconds: number };

    return Math.round(result.total_seconds / 60);
  }

  /**
   * Query time spent in a specific category between two timestamps (returns minutes)
   */
  queryCategoryTime(category: string, startTime: string, endTime: string): number {
    const result = this.db
      .prepare(
        `
      SELECT COALESCE(SUM(duration), 0) as total_seconds
      FROM app_usage
      WHERE start_time >= ? AND start_time <= ?
      AND category = ?
      AND is_idle = 0
    `
      )
      .get(startTime, endTime, category) as { total_seconds: number };

    return Math.round(result.total_seconds / 60);
  }

  /**
   * Query time spent on a specific app between two timestamps (returns minutes)
   */
  queryAppTime(appName: string, startTime: string, endTime: string): number {
    const result = this.db
      .prepare(
        `
      SELECT COALESCE(SUM(duration), 0) as total_seconds
      FROM app_usage
      WHERE start_time >= ? AND start_time <= ?
      AND app_name = ?
      AND is_idle = 0
    `
      )
      .get(startTime, endTime, appName) as { total_seconds: number };

    return Math.round(result.total_seconds / 60);
  }

  /**
   * Get daily productivity statistics for a date range
   */
  getDailyProductivityStats(startDate: string, endDate: string): DailyStats[] {
    const stmt = this.db.prepare(`
      WITH daily_data AS (
        SELECT
          DATE(start_time) as date,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as total_minutes,
          COUNT(CASE WHEN end_time IS NOT NULL THEN 1 END) as completed_tasks
        FROM time_entries
        WHERE DATE(start_time) BETWEEN ? AND ?
        GROUP BY DATE(start_time)

        UNION ALL

        SELECT
          DATE(start_time) as date,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as total_minutes,
          0 as completed_tasks
        FROM app_usage
        WHERE DATE(start_time) BETWEEN ? AND ?
        GROUP BY DATE(start_time)
      ),
      pomodoro_data AS (
        SELECT
          DATE(start_time) as date,
          SUM(CASE WHEN session_type = 'focus' AND completed = 1 THEN duration ELSE 0 END) / 60.0 as focus_minutes,
          SUM(CASE WHEN session_type IN ('shortBreak', 'longBreak') THEN duration ELSE 0 END) / 60.0 as break_minutes
        FROM pomodoro_sessions
        WHERE DATE(start_time) BETWEEN ? AND ?
        GROUP BY DATE(start_time)
      ),
      idle_data AS (
        SELECT
          DATE(start_time) as date,
          SUM(CASE WHEN is_idle = 1 THEN duration ELSE 0 END) / 60.0 as idle_minutes
        FROM app_usage
        WHERE DATE(start_time) BETWEEN ? AND ?
        GROUP BY DATE(start_time)
      )
      SELECT
        d.date,
        COALESCE(SUM(d.total_minutes), 0) as totalMinutes,
        COALESCE(p.focus_minutes, 0) as focusMinutes,
        COALESCE(p.break_minutes, 0) as breakMinutes,
        COALESCE(i.idle_minutes, 0) as idleMinutes,
        COALESCE(MAX(d.completed_tasks), 0) as completedTasks
      FROM daily_data d
      LEFT JOIN pomodoro_data p ON d.date = p.date
      LEFT JOIN idle_data i ON d.date = i.date
      GROUP BY d.date
      ORDER BY d.date ASC
    `);

    const rows = stmt.all(startDate, endDate, startDate, endDate, startDate, endDate, startDate, endDate) as DailyStatsQueryRow[];

    return rows.map(row => ({
      date: row.date,
      totalMinutes: Math.round(row.totalMinutes),
      focusMinutes: Math.round(row.focusMinutes),
      breakMinutes: Math.round(row.breakMinutes),
      idleMinutes: Math.round(row.idleMinutes),
      completedTasks: row.completedTasks,
      categories: this.getCategoriesForDate(row.date),
    }));
  }

  /**
   * Get category breakdown for a specific date
   */
  private getCategoriesForDate(date: string): CategoryTime[] {
    const stmt = this.db.prepare(`
      SELECT
        c.id as categoryId,
        c.name as categoryName,
        c.color as categoryColor,
        SUM(CASE WHEN te.duration IS NOT NULL THEN te.duration ELSE
          CAST((JULIANDAY(COALESCE(te.end_time, te.start_time)) - JULIANDAY(te.start_time)) * 86400 AS INTEGER)
        END) / 60.0 as minutes
      FROM time_entries te
      LEFT JOIN categories c ON te.category = c.name
      WHERE DATE(te.start_time) = ?
        AND c.id IS NOT NULL
      GROUP BY c.id, c.name, c.color
      ORDER BY minutes DESC
      LIMIT 10
    `);

    const rows = stmt.all(date) as CategoryTimeQueryRow[];
    const total = rows.reduce((sum, r) => sum + r.minutes, 0);

    return rows.map(row => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      categoryColor: row.categoryColor,
      minutes: Math.round(row.minutes),
      percentage: total > 0 ? Math.round((row.minutes / total) * 100) : 0,
    }));
  }

  /**
   * Get hourly activity patterns over the last N days
   */
  getHourlyPatterns(days: number): HourlyPattern[] {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stmt = this.db.prepare(`
      WITH hourly_data AS (
        SELECT
          CAST(strftime('%H', start_time) AS INTEGER) as hour,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as minutes,
          DATE(start_time) as date
        FROM time_entries
        WHERE datetime(start_time) >= datetime(?)
        GROUP BY hour, DATE(start_time)

        UNION ALL

        SELECT
          CAST(strftime('%H', start_time) AS INTEGER) as hour,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as minutes,
          DATE(start_time) as date
        FROM app_usage
        WHERE datetime(start_time) >= datetime(?)
          AND is_idle = 0
        GROUP BY hour, DATE(start_time)
      )
      SELECT
        hour,
        AVG(minutes) as avgMinutes,
        COUNT(DISTINCT date) as dayCount
      FROM hourly_data
      GROUP BY hour
      ORDER BY hour
    `);

    const rows = stmt.all(startDate.toISOString(), startDate.toISOString()) as HourlyPatternQueryRow[];

    return rows.map(row => ({
      hour: row.hour,
      avgMinutes: Math.round(row.avgMinutes),
      dayCount: row.dayCount,
    }));
  }

  /**
   * Get heatmap data for a specific year
   */
  getHeatmapData(year: number): HeatmapDay[] {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const stmt = this.db.prepare(`
      WITH daily_totals AS (
        SELECT
          DATE(start_time) as date,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as total_minutes
        FROM time_entries
        WHERE DATE(start_time) BETWEEN ? AND ?
        GROUP BY DATE(start_time)

        UNION ALL

        SELECT
          DATE(start_time) as date,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as total_minutes
        FROM app_usage
        WHERE DATE(start_time) BETWEEN ? AND ?
          AND is_idle = 0
        GROUP BY DATE(start_time)
      ),
      focus_breakdown AS (
        SELECT
          DATE(start_time) as date,
          SUM(CASE WHEN session_type = 'focus' AND completed = 1 THEN duration ELSE 0 END) / 60.0 as focus
        FROM pomodoro_sessions
        WHERE DATE(start_time) BETWEEN ? AND ?
        GROUP BY DATE(start_time)
      ),
      app_breakdown AS (
        SELECT
          DATE(start_time) as date,
          SUM(CASE WHEN is_browser = 0 AND is_idle = 0 THEN duration ELSE 0 END) / 60.0 as apps,
          SUM(CASE WHEN is_browser = 1 AND is_idle = 0 THEN duration ELSE 0 END) / 60.0 as browser
        FROM app_usage
        WHERE DATE(start_time) BETWEEN ? AND ?
        GROUP BY DATE(start_time)
      ),
      aggregated AS (
        SELECT
          dt.date,
          SUM(dt.total_minutes) as totalMinutes,
          COALESCE(MAX(fb.focus), 0) as focus,
          COALESCE(MAX(ab.apps), 0) as apps,
          COALESCE(MAX(ab.browser), 0) as browser
        FROM daily_totals dt
        LEFT JOIN focus_breakdown fb ON dt.date = fb.date
        LEFT JOIN app_breakdown ab ON dt.date = ab.date
        GROUP BY dt.date
      ),
      max_val AS (
        SELECT MAX(totalMinutes) as max_minutes FROM aggregated
      )
      SELECT
        a.date,
        a.totalMinutes,
        CASE
          WHEN a.totalMinutes = 0 THEN 0
          WHEN a.totalMinutes / m.max_minutes <= 0.2 THEN 1
          WHEN a.totalMinutes / m.max_minutes <= 0.4 THEN 2
          WHEN a.totalMinutes / m.max_minutes <= 0.7 THEN 3
          ELSE 4
        END as intensity,
        a.focus,
        a.apps,
        a.browser
      FROM aggregated a, max_val m
      ORDER BY a.date
    `);

    const rows = stmt.all(startDate, endDate, startDate, endDate, startDate, endDate, startDate, endDate) as HeatmapQueryRow[];

    return rows.map(row => ({
      date: row.date,
      intensity: row.intensity as 0 | 1 | 2 | 3 | 4,
      totalMinutes: Math.round(row.totalMinutes),
      breakdown: {
        focus: Math.round(row.focus),
        apps: Math.round(row.apps),
        browser: Math.round(row.browser),
      },
    }));
  }

  /**
   * Get weekly summary with comparison to previous week
   */
  getWeeklySummary(weekOffset: number = 0): WeeklySummary {
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay() + weekOffset * 7);
    currentWeekStart.setHours(0, 0, 0, 0);

    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
    currentWeekEnd.setHours(23, 59, 59, 999);

    const weekStartValue = currentWeekStart.toISOString().split('T')[0];
    const weekEndValue = currentWeekEnd.toISOString().split('T')[0];
    if (!weekStartValue || !weekEndValue) {
      throw new Error('Failed to generate week dates');
    }
    const weekStart = weekStartValue;
    const weekEnd = weekEndValue;

    // Get total minutes for the week
    const totalStmt = this.db.prepare(`
      WITH combined_data AS (
        SELECT
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as total_minutes
        FROM time_entries
        WHERE DATE(start_time) BETWEEN ? AND ?

        UNION ALL

        SELECT
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as total_minutes
        FROM app_usage
        WHERE DATE(start_time) BETWEEN ? AND ?
      )
      SELECT SUM(total_minutes) as total_minutes FROM combined_data
    `);
    const totalRow = totalStmt.get(weekStart, weekEnd, weekStart, weekEnd) as WeeklySummaryTotalQueryRow | undefined;
    const totalMinutes = Math.round(totalRow?.total_minutes || 0);

    // Get daily breakdown to find top day
    const dailyStmt = this.db.prepare(`
      WITH daily_combined AS (
        SELECT
          DATE(start_time) as date,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as minutes
        FROM time_entries
        WHERE DATE(start_time) BETWEEN ? AND ?
        GROUP BY DATE(start_time)

        UNION ALL

        SELECT
          DATE(start_time) as date,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as minutes
        FROM app_usage
        WHERE DATE(start_time) BETWEEN ? AND ?
        GROUP BY DATE(start_time)
      )
      SELECT
        date,
        SUM(minutes) as minutes
      FROM daily_combined
      GROUP BY date
      ORDER BY minutes DESC
      LIMIT 1
    `);
    const dailyRow = dailyStmt.get(weekStart, weekEnd, weekStart, weekEnd) as WeeklySummaryDailyQueryRow | undefined;
    const topDay = dailyRow ? { date: dailyRow.date, minutes: Math.round(dailyRow.minutes) } : null;

    // Get top categories
    const catStmt = this.db.prepare(`
      WITH category_combined AS (
        SELECT
          c.id as categoryId,
          c.name as categoryName,
          c.color as categoryColor,
          SUM(CASE WHEN te.duration IS NOT NULL THEN te.duration ELSE
            CAST((JULIANDAY(COALESCE(te.end_time, te.start_time)) - JULIANDAY(te.start_time)) * 86400 AS INTEGER)
          END) / 60.0 as minutes
        FROM time_entries te
        LEFT JOIN categories c ON te.category = c.name
        WHERE DATE(te.start_time) BETWEEN ? AND ?
          AND c.id IS NOT NULL
        GROUP BY c.id

        UNION ALL

        SELECT
          c.id as categoryId,
          c.name as categoryName,
          c.color as categoryColor,
          SUM(CASE WHEN au.duration IS NOT NULL THEN au.duration ELSE
            CAST((JULIANDAY(COALESCE(au.end_time, au.start_time)) - JULIANDAY(au.start_time)) * 86400 AS INTEGER)
          END) / 60.0 as minutes
        FROM app_usage au
        LEFT JOIN categories c ON au.category = c.name
        WHERE DATE(au.start_time) BETWEEN ? AND ?
          AND c.id IS NOT NULL
        GROUP BY c.id
      )
      SELECT
        categoryId,
        categoryName,
        categoryColor,
        SUM(minutes) as minutes
      FROM category_combined
      GROUP BY categoryId
      ORDER BY minutes DESC
      LIMIT 5
    `);
    const catRows = catStmt.all(weekStart, weekEnd, weekStart, weekEnd) as WeeklySummaryCategoryQueryRow[];
    const catTotal = catRows.reduce((sum, r) => sum + r.minutes, 0);
    const topCategories = catRows.map(row => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      categoryColor: row.categoryColor,
      minutes: Math.round(row.minutes),
      percentage: catTotal > 0 ? Math.round((row.minutes / catTotal) * 100) : 0,
    }));

    // Get goals achievement
    const goalsStmt = this.db.prepare(`
      SELECT
        COUNT(DISTINCT pg.id) as total,
        COUNT(DISTINCT CASE WHEN gp.achieved = 1 THEN gp.goal_id END) as achieved
      FROM productivity_goals pg
      LEFT JOIN goal_progress gp ON pg.id = gp.goal_id
        AND DATE(gp.date) BETWEEN ? AND ?
      WHERE pg.active = 1
    `);
    const goalsRow = goalsStmt.get(weekStart, weekEnd) as WeeklySummaryGoalsQueryRow | undefined;
    const goalsAchieved = goalsRow?.achieved || 0;
    const totalGoals = goalsRow?.total || 0;

    // Get previous week for comparison
    const prevWeekStart = new Date(currentWeekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(currentWeekEnd);
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);

    const prevStmt = this.db.prepare(`
      WITH prev_combined_data AS (
        SELECT
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as total_minutes
        FROM time_entries
        WHERE DATE(start_time) BETWEEN ? AND ?

        UNION ALL

        SELECT
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as total_minutes
        FROM app_usage
        WHERE DATE(start_time) BETWEEN ? AND ?
      )
      SELECT SUM(total_minutes) as total_minutes FROM prev_combined_data
    `);
    const prevWeekStartStr = prevWeekStart.toISOString().split('T')[0];
    const prevWeekEndStr = prevWeekEnd.toISOString().split('T')[0];
    const prevRow = prevStmt.get(prevWeekStartStr, prevWeekEndStr, prevWeekStartStr, prevWeekEndStr) as WeeklySummaryTotalQueryRow | undefined;
    const prevMinutes = prevRow?.total_minutes || 0;
    const comparisonToPrevious =
      prevMinutes > 0 ? Math.round(((totalMinutes - prevMinutes) / prevMinutes) * 100) : 0;

    // Generate insights
    const insights = this.generateWeeklyInsights(totalMinutes, topDay, topCategories, comparisonToPrevious);

    return {
      weekStart,
      weekEnd,
      totalMinutes,
      avgDailyMinutes: Math.round(totalMinutes / 7),
      topDay,
      topCategories,
      goalsAchieved,
      totalGoals,
      comparisonToPrevious,
      insights,
    };
  }

  /**
   * Generate behavioral insights from data
   */
  private generateWeeklyInsights(
    totalMinutes: number,
    topDay: { date: string; minutes: number } | null,
    topCategories: CategoryTime[],
    comparison: number
  ): string[] {
    const insights: string[] = [];

    if (comparison > 10) {
      insights.push(`Great progress! You're ${comparison}% more productive than last week.`);
    } else if (comparison < -10) {
      insights.push(`Activity decreased ${Math.abs(comparison)}% from last week. Let's get back on track!`);
    }

    if (topDay) {
      const dayName = new Date(topDay.date).toLocaleDateString('en-US', { weekday: 'long' });
      insights.push(`${dayName} was your most productive day with ${topDay.minutes} minutes tracked.`);
    }

    if (topCategories.length > 0) {
      const topCategory = topCategories[0];
      if (topCategory) {
        insights.push(`You focused most on ${topCategory.categoryName} this week.`);
      }
    }

    const avgDaily = totalMinutes / 7;
    if (avgDaily >= 120) {
      insights.push(`Excellent! You averaged ${Math.round(avgDaily)} minutes per day.`);
    } else if (avgDaily < 60) {
      insights.push(`Try to increase your daily tracking time - currently averaging ${Math.round(avgDaily)} minutes.`);
    }

    return insights;
  }

  /**
   * Get productivity trends over time for charts
   * Groups data by day, week, or month
   */
  getProductivityTrends(startDate: string, endDate: string, groupBy: 'day' | 'week' | 'month'): ProductivityTrend[] {
    let dateFormat: string;
    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-W%W';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
    }

    const stmt = this.db.prepare(`
      WITH combined_data AS (
        SELECT
          strftime('${dateFormat}', start_time) as period,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as total_minutes
        FROM time_entries
        WHERE DATE(start_time) BETWEEN ? AND ?
        GROUP BY period

        UNION ALL

        SELECT
          strftime('${dateFormat}', start_time) as period,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as total_minutes
        FROM app_usage
        WHERE DATE(start_time) BETWEEN ? AND ? AND (is_idle = 0 OR is_idle IS NULL)
        GROUP BY period
      )
      SELECT
        period as date,
        SUM(total_minutes) as value
      FROM combined_data
      GROUP BY period
      ORDER BY period ASC
    `);

    const rows = stmt.all(startDate, endDate, startDate, endDate) as ProductivityTrendQueryRow[];

    return rows.map(row => ({
      date: row.date,
      value: Math.round(row.value),
    }));
  }

  /**
   * Generate behavioral insights based on activity patterns
   */
  getBehavioralInsights(): BehavioralInsight[] {
    const insights: BehavioralInsight[] = [];
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const last30DaysStr = last30Days.toISOString().split('T')[0];

    // 1. Peak Hour Insight
    const peakHourStmt = this.db.prepare(`
      WITH hourly_data AS (
        SELECT
          CAST(strftime('%H', start_time) as INTEGER) as hour,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as minutes
        FROM time_entries
        WHERE DATE(start_time) >= ?
        GROUP BY hour

        UNION ALL

        SELECT
          CAST(strftime('%H', start_time) as INTEGER) as hour,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as minutes
        FROM app_usage
        WHERE DATE(start_time) >= ? AND (is_idle = 0 OR is_idle IS NULL)
        GROUP BY hour
      )
      SELECT hour, SUM(minutes) as total_minutes
      FROM hourly_data
      GROUP BY hour
      ORDER BY total_minutes DESC
      LIMIT 1
    `);
    const peakHourRow = peakHourStmt.get(last30DaysStr, last30DaysStr) as PeakHourQueryRow | undefined;
    if (peakHourRow) {
      const hour = peakHourRow.hour;
      const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      insights.push({
        type: 'peak_hour',
        title: 'Peak Productivity Hour',
        description: `You're most productive around ${hour}:00 in the ${period}`,
        value: `${hour}:00`,
      });
    }

    // 2. Most Productive Day of Week
    const productiveDayStmt = this.db.prepare(`
      WITH daily_data AS (
        SELECT
          CASE CAST(strftime('%w', start_time) as INTEGER)
            WHEN 0 THEN 'Sunday'
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
          END as day_name,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as minutes
        FROM time_entries
        WHERE DATE(start_time) >= ?
        GROUP BY day_name

        UNION ALL

        SELECT
          CASE CAST(strftime('%w', start_time) as INTEGER)
            WHEN 0 THEN 'Sunday'
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
          END as day_name,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) / 60.0 as minutes
        FROM app_usage
        WHERE DATE(start_time) >= ? AND (is_idle = 0 OR is_idle IS NULL)
        GROUP BY day_name
      )
      SELECT day_name, SUM(minutes) as total_minutes
      FROM daily_data
      GROUP BY day_name
      ORDER BY total_minutes DESC
      LIMIT 1
    `);
    const productiveDayRow = productiveDayStmt.get(last30DaysStr, last30DaysStr) as ProductiveDayQueryRow | undefined;
    if (productiveDayRow) {
      insights.push({
        type: 'productive_day',
        title: 'Most Productive Day',
        description: `${productiveDayRow.day_name} is your most productive day`,
        value: productiveDayRow.day_name,
      });
    }

    // 3. Top Category Trend
    const categoryTrendStmt = this.db.prepare(`
      SELECT
        c.name as category_name,
        SUM(CASE WHEN te.duration IS NOT NULL THEN te.duration ELSE
          CAST((JULIANDAY(COALESCE(te.end_time, te.start_time)) - JULIANDAY(te.start_time)) * 86400 AS INTEGER)
        END) / 60.0 as minutes
      FROM time_entries te
      LEFT JOIN categories c ON te.category_id = c.id
      WHERE DATE(te.start_time) >= ? AND c.name IS NOT NULL
      GROUP BY c.name
      ORDER BY minutes DESC
      LIMIT 1
    `);
    const categoryTrendRow = categoryTrendStmt.get(last30DaysStr) as CategoryTrendQueryRow | undefined;
    if (categoryTrendRow) {
      insights.push({
        type: 'category_trend',
        title: 'Top Focus Area',
        description: `You've spent the most time on ${categoryTrendRow.category_name}`,
        value: `${Math.round(categoryTrendRow.minutes)} min`,
      });
    }

    // 4. Distraction Analysis
    const distractionStmt = this.db.prepare(`
      SELECT
        app_name,
        COUNT(*) as session_count,
        AVG(CASE WHEN duration IS NOT NULL THEN duration ELSE
          CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
        END) / 60.0 as avg_session_minutes
      FROM app_usage
      WHERE DATE(start_time) >= ? AND (is_idle = 0 OR is_idle IS NULL)
      GROUP BY app_name
      HAVING COUNT(*) >= 5 AND (AVG(CASE WHEN duration IS NOT NULL THEN duration ELSE
        CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
      END) / 60.0) < 10
      ORDER BY COUNT(*) DESC
      LIMIT 1
    `);
    const distractionRow = distractionStmt.get(last30DaysStr) as DistractionQueryRow | undefined;
    if (distractionRow) {
      insights.push({
        type: 'distraction',
        title: 'Potential Distraction',
        description: `${distractionRow.app_name} has ${distractionRow.session_count} short sessions`,
        value: `${Math.round(distractionRow.avg_session_minutes)} min avg`,
      });
    }

    // 5. Focus Quality (Pomodoro completion rate)
    const focusQualityStmt = this.db.prepare(`
      SELECT
        COUNT(*) as total_sessions,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_sessions
      FROM pomodoro_sessions
      WHERE session_type = 'focus' AND DATE(start_time) >= ?
    `);
    const focusQualityRow = focusQualityStmt.get(last30DaysStr) as FocusQualityQueryRow | undefined;
    if (focusQualityRow && focusQualityRow.total_sessions > 0) {
      const completionRate = (focusQualityRow.completed_sessions / focusQualityRow.total_sessions) * 100;
      const isGood = completionRate >= 75;
      insights.push({
        type: 'focus_quality',
        title: 'Focus Quality',
        description: isGood
          ? `Great focus! You complete ${Math.round(completionRate)}% of your focus sessions`
          : `Try to improve focus - ${Math.round(completionRate)}% completion rate`,
        value: `${Math.round(completionRate)}%`,
        trend: {
          value: completionRate,
          isPositive: isGood,
        },
      });
    }

    // 6. Weekly Streak
    const streakStmt = this.db.prepare(`
      WITH daily_activity AS (
        SELECT DISTINCT DATE(start_time) as activity_date
        FROM time_entries
        WHERE DATE(start_time) >= DATE('now', '-60 days')

        UNION

        SELECT DISTINCT DATE(start_time) as activity_date
        FROM app_usage
        WHERE DATE(start_time) >= DATE('now', '-60 days') AND (is_idle = 0 OR is_idle IS NULL)
      ),
      date_sequence AS (
        SELECT activity_date, LAG(activity_date) OVER (ORDER BY activity_date) as prev_date
        FROM daily_activity
        ORDER BY activity_date DESC
      ),
      streak_calc AS (
        SELECT
          activity_date,
          CASE WHEN julianday(activity_date) - julianday(prev_date) = 1 THEN 0 ELSE 1 END as is_break
        FROM date_sequence
      )
      SELECT COUNT(*) as streak_days
      FROM streak_calc
      WHERE is_break = 0
      ORDER BY activity_date DESC
    `);
    const streakRow = streakStmt.get() as StreakQueryRow | undefined;
    if (streakRow && streakRow.streak_days > 0) {
      const days = streakRow.streak_days + 1;
      insights.push({
        type: 'streak',
        title: 'Activity Streak',
        description: days >= 7 ? `Impressive! ${days} days of consistent tracking` : `Keep it up! ${days} day${days > 1 ? 's' : ''} streak`,
        value: `${days} days`,
        trend: {
          value: days,
          isPositive: days >= 7,
        },
      });
    }

    return insights;
  }

  /**
   * Get overall analytics summary
   */
  getAnalyticsSummary(): AnalyticsSummary {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const last30DaysStr = last30Days.toISOString().split('T')[0];

    // Total productive minutes (last 30 days)
    const productiveStmt = this.db.prepare(`
      SELECT
        SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
          CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
        END) / 60.0 as total_minutes
      FROM app_usage
      WHERE DATE(start_time) >= ? AND (is_idle = 0 OR is_idle IS NULL)
    `);
    const productiveRow = productiveStmt.get(last30DaysStr) as AnalyticsSummaryProductiveQueryRow | undefined;
    const totalProductiveMinutes = Math.round(productiveRow?.total_minutes || 0);

    // Average daily focus hours
    const avgFocusStmt = this.db.prepare(`
      SELECT AVG(daily_minutes) / 60.0 as avg_hours
      FROM (
        SELECT DATE(start_time) as date, SUM(duration) / 60.0 as daily_minutes
        FROM pomodoro_sessions
        WHERE session_type = 'focus' AND completed = 1 AND DATE(start_time) >= ?
        GROUP BY DATE(start_time)
      )
    `);
    const avgFocusRow = avgFocusStmt.get(last30DaysStr) as AnalyticsSummaryAvgFocusQueryRow | undefined;
    const avgDailyFocusHours = parseFloat((avgFocusRow?.avg_hours || 0).toFixed(1));

    // Peak hour
    const peakHourStmt = this.db.prepare(`
      WITH hourly_data AS (
        SELECT
          CAST(strftime('%H', start_time) as INTEGER) as hour,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) as minutes
        FROM time_entries
        WHERE DATE(start_time) >= ?
        GROUP BY hour

        UNION ALL

        SELECT
          CAST(strftime('%H', start_time) as INTEGER) as hour,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) as minutes
        FROM app_usage
        WHERE DATE(start_time) >= ? AND (is_idle = 0 OR is_idle IS NULL)
        GROUP BY hour
      )
      SELECT hour, SUM(minutes) as total_minutes
      FROM hourly_data
      GROUP BY hour
      ORDER BY total_minutes DESC
      LIMIT 1
    `);
    const peakHourRow = peakHourStmt.get(last30DaysStr, last30DaysStr) as PeakHourQueryRow | undefined;
    const peakHour = peakHourRow?.hour || 9;

    // Most productive day
    const productiveDayStmt = this.db.prepare(`
      WITH daily_data AS (
        SELECT
          CASE CAST(strftime('%w', start_time) as INTEGER)
            WHEN 0 THEN 'Sunday'
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
          END as day_name,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) as minutes
        FROM time_entries
        WHERE DATE(start_time) >= ?
        GROUP BY day_name

        UNION ALL

        SELECT
          CASE CAST(strftime('%w', start_time) as INTEGER)
            WHEN 0 THEN 'Sunday'
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
          END as day_name,
          SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE
            CAST((JULIANDAY(COALESCE(end_time, start_time)) - JULIANDAY(start_time)) * 86400 AS INTEGER)
          END) as minutes
        FROM app_usage
        WHERE DATE(start_time) >= ? AND (is_idle = 0 OR is_idle IS NULL)
        GROUP BY day_name
      )
      SELECT day_name, SUM(minutes) as total_minutes
      FROM daily_data
      GROUP BY day_name
      ORDER BY total_minutes DESC
      LIMIT 1
    `);
    const productiveDayRow = productiveDayStmt.get(last30DaysStr, last30DaysStr) as ProductiveDayQueryRow | undefined;
    const mostProductiveDay = productiveDayRow?.day_name || 'Monday';

    // Weekly streak
    const streakStmt = this.db.prepare(`
      WITH daily_activity AS (
        SELECT DISTINCT DATE(start_time) as activity_date
        FROM time_entries
        WHERE DATE(start_time) >= DATE('now', '-60 days')

        UNION

        SELECT DISTINCT DATE(start_time) as activity_date
        FROM app_usage
        WHERE DATE(start_time) >= DATE('now', '-60 days') AND (is_idle = 0 OR is_idle IS NULL)
      ),
      ordered_dates AS (
        SELECT
          activity_date,
          ROW_NUMBER() OVER (ORDER BY activity_date DESC) as row_num
        FROM daily_activity
      ),
      streak_calc AS (
        SELECT
          od.activity_date,
          od.row_num,
          CASE
            WHEN od.row_num = 1 THEN 0
            WHEN julianday(od.activity_date) = julianday((
              SELECT activity_date
              FROM ordered_dates
              WHERE row_num = od.row_num - 1
            )) - 1 THEN 0
            ELSE 1
          END as is_break
        FROM ordered_dates od
      )
      SELECT COUNT(*) as streak_days
      FROM streak_calc
      WHERE row_num <= (
        SELECT COALESCE(MIN(row_num), 0)
        FROM streak_calc
        WHERE is_break = 1
      )
      OR NOT EXISTS (SELECT 1 FROM streak_calc WHERE is_break = 1)
    `);
    const streakRow = streakStmt.get() as StreakQueryRow | undefined;
    const weeklyStreak = streakRow?.streak_days || 0;

    // Calculate productivity score (0-100)
    const dailyAvgMinutes = totalProductiveMinutes / 30;
    const focusQualityStmt = this.db.prepare(`
      SELECT
        COUNT(*) as total_sessions,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_sessions
      FROM pomodoro_sessions
      WHERE session_type = 'focus' AND DATE(start_time) >= ?
    `);
    const focusQualityRow = focusQualityStmt.get(last30DaysStr) as FocusQualityQueryRow | undefined;
    const focusCompletionRate =
      focusQualityRow?.total_sessions && focusQualityRow.total_sessions > 0 ? (focusQualityRow.completed_sessions / focusQualityRow.total_sessions) * 100 : 50;

    // Productivity score calculation
    const timeScore = Math.min((dailyAvgMinutes / 240) * 40, 40); // Max 40 points for 4+ hours daily
    const focusScore = (focusCompletionRate / 100) * 30; // Max 30 points for 100% focus completion
    const consistencyScore = Math.min((weeklyStreak / 30) * 30, 30); // Max 30 points for 30+ day streak
    const productivityScore = Math.round(timeScore + focusScore + consistencyScore);

    return {
      productivityScore,
      totalProductiveMinutes,
      avgDailyFocusHours,
      peakHour,
      mostProductiveDay,
      weeklyStreak,
    };
  }
}
