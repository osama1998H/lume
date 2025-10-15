import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Clock, Sun, Flame } from 'lucide-react';
import type {
  AnalyticsSummary,
  HourlyPattern,
  HeatmapDay,
  WeeklySummary,
  ProductivityTrend,
  BehavioralInsight
} from '../../types';
import StatCard from '../ui/StatCard';
import DateRangeFilter from '../ui/DateRangeFilter';
import { ProductivityLineChart } from '../features/analytics/ProductivityLineChart';
import { HourlyHeatmap } from '../features/analytics/HourlyHeatmap';
import { CalendarHeatmap } from '../features/analytics/CalendarHeatmap';
import { InsightCard } from '../features/analytics/InsightCard';
import Skeleton from '../ui/Skeleton';
import { formatDuration } from '../../utils/format';

export const Analytics: React.FC = () => {
  const { t } = useTranslation();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trends, setTrends] = useState<ProductivityTrend[]>([]);
  const [hourlyPatterns, setHourlyPatterns] = useState<HourlyPattern[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [insights, setInsights] = useState<BehavioralInsight[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  // Helper function to translate weekly insights
  const translateInsight = (insight: string): string => {
    // Pattern 1: "Great progress! You're X% more productive than last week."
    const greatProgressMatch = insight.match(/Great progress! You're (\d+)% more productive than last week\./);
    if (greatProgressMatch) {
      return t('analytics.weeklyInsights.greatProgress', { percentage: greatProgressMatch[1] });
    }

    // Pattern 2: "Activity decreased X% from last week. Let's get back on track!"
    const decreasedMatch = insight.match(/Activity decreased (\d+)% from last week\. Let's get back on track!/);
    if (decreasedMatch) {
      return t('analytics.weeklyInsights.activityDecreased', { percentage: decreasedMatch[1] });
    }

    // Pattern 3: "DayName was your most productive day with X minutes tracked."
    const productiveDayMatch = insight.match(/(.+) was your most productive day with (\d+) minutes tracked\./);
    if (productiveDayMatch) {
      const dayName = productiveDayMatch[1];
      const minutes = productiveDayMatch[2];

      // Guard against undefined
      if (!dayName || !minutes) {
        return insight;
      }

      // Translate the day name
      const translatedDay = t(`common.daysOfWeek.${dayName}`, dayName);
      return t('analytics.weeklyInsights.mostProductiveDay', { dayName: translatedDay, minutes });
    }

    // Pattern 4: "You focused most on CategoryName this week."
    const focusedMostMatch = insight.match(/You focused most on (.+) this week\./);
    if (focusedMostMatch) {
      return t('analytics.weeklyInsights.focusedMostOn', { category: focusedMostMatch[1] });
    }

    // Pattern 5: "Excellent! You averaged X minutes per day."
    const excellentMatch = insight.match(/Excellent! You averaged (\d+) minutes per day\./);
    if (excellentMatch) {
      return t('analytics.weeklyInsights.excellentAverage', { minutes: excellentMatch[1] });
    }

    // Pattern 6: "Try to increase your daily tracking time - currently averaging X minutes."
    const increaseMatch = insight.match(/Try to increase your daily tracking time - currently averaging (\d+) minutes\./);
    if (increaseMatch) {
      return t('analytics.weeklyInsights.increaseTracking', { minutes: increaseMatch[1] });
    }

    // Return original if no pattern matches (fallback)
    return insight;
  };

  const loadAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);

      // Get date range based on selected period
      const endDateValue = new Date().toISOString().split('T')[0];
      if (!endDateValue) {
        throw new Error('Failed to generate end date');
      }
      const endDate = endDateValue;

      let startDate: string;
      let groupBy: 'day' | 'week' | 'month';

      if (selectedPeriod === 'week') {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        const startDateValue = date.toISOString().split('T')[0];
        if (!startDateValue) {
          throw new Error('Failed to generate start date');
        }
        startDate = startDateValue;
        groupBy = 'day';
      } else if (selectedPeriod === 'month') {
        const date = new Date();
        date.setMonth(date.getMonth() - 1);
        const startDateValue = date.toISOString().split('T')[0];
        if (!startDateValue) {
          throw new Error('Failed to generate start date');
        }
        startDate = startDateValue;
        groupBy = 'day';
      } else {
        // Year
        const date = new Date();
        date.setFullYear(date.getFullYear() - 1);
        const startDateValue = date.toISOString().split('T')[0];
        if (!startDateValue) {
          throw new Error('Failed to generate start date');
        }
        startDate = startDateValue;
        groupBy = 'week';
      }

      // Fetch all analytics data in parallel
      const [
        summaryData,
        trendsData,
        hourlyData,
        heatmapData,
        weeklyData,
        insightsData
      ] = await Promise.all([
        window.electronAPI.analytics.getSummary(),
        window.electronAPI.analytics.getTrends(startDate, endDate, groupBy),
        window.electronAPI.analytics.getHourlyPatterns(30),
        window.electronAPI.analytics.getHeatmap(new Date().getFullYear()),
        window.electronAPI.analytics.getWeeklySummary(0),
        window.electronAPI.analytics.getInsights()
      ]);

      setSummary(summaryData);
      setTrends(trendsData);
      setHourlyPatterns(hourlyData);
      setHeatmapData(heatmapData);
      setWeeklySummary(weeklyData);
      setInsights(insightsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod]);

  // Load analytics data
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="flex-shrink-0 px-8 pt-8 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              {t('navigation.analytics', 'Analytics')}
            </h1>
            <p className="text-text-secondary">
              {t('analytics.subtitle', 'Understand your productivity patterns and improve over time')}
            </p>
          </div>

          {/* Period Selector */}
          <DateRangeFilter
            options={[
              { value: 'week', label: t('analytics.lastWeek', 'Last 7 Days') },
              { value: 'month', label: t('analytics.lastMonth', 'Last 30 Days') },
              { value: 'year', label: t('analytics.lastYear', 'Last Year') },
            ]}
            selectedValue={selectedPeriod}
            onChange={(value) => setSelectedPeriod(value as 'week' | 'month' | 'year')}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        <div className="space-y-6">
          {/* Overview Stats */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : summary ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={Trophy}
                title={t('analytics.productivityScore', 'Productivity Score')}
                value={`${summary.productivityScore}/100`}
                colorScheme="primary"
              />
              <StatCard
                icon={Clock}
                title={t('analytics.totalProductiveTime', 'Total Productive Time')}
                value={formatDuration(summary.totalProductiveMinutes * 60, t)}
                colorScheme="blue"
              />
              <StatCard
                icon={Sun}
                title={t('analytics.peakHour', 'Peak Hour')}
                value={`${summary.peakHour}:00`}
                colorScheme="orange"
              />
              <StatCard
                icon={Flame}
                title={t('analytics.weeklyStreak', 'Weekly Streak')}
                value={`${summary.weeklyStreak} ${t('common.days', 'days')}`}
                colorScheme="red"
              />
            </div>
          ) : null}

          {/* Productivity Trends */}
          <ProductivityLineChart
            data={trends}
            title={t('analytics.productivityTrends', 'Productivity Trends')}
            description={t('analytics.trendsDescription', 'Track your productivity over time')}
            isLoading={isLoading}
          />

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hourly Patterns */}
            <HourlyHeatmap
              data={hourlyPatterns}
              title={t('analytics.hourlyPatterns', 'Hourly Activity Patterns')}
              description={t('analytics.patternsDescription', 'Discover your peak productivity hours')}
              isLoading={isLoading}
            />

            {/* Weekly Summary */}
            {weeklySummary && !isLoading && (
              <div className="bg-surface-primary rounded-xl border border-border p-6 shadow-card">
                <h3 className="text-lg font-semibold text-text-primary mb-4">
                  {t('analytics.weeklySummary', 'Weekly Summary')}
                </h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">{t('analytics.totalTime', 'Total Time')}</span>
                    <span className="text-text-primary font-bold">{formatDuration(weeklySummary.totalMinutes * 60, t)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">{t('analytics.avgDaily', 'Avg Daily')}</span>
                    <span className="text-text-primary font-bold">{formatDuration(weeklySummary.avgDailyMinutes * 60, t)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">{t('analytics.goalsAchieved', 'Goals Achieved')}</span>
                    <span className="text-text-primary font-bold">
                      {weeklySummary.goalsAchieved} / {weeklySummary.totalGoals}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">{t('analytics.vsLastWeek', 'vs Last Week')}</span>
                    <span className={`font-bold ${weeklySummary.comparisonToPrevious >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {weeklySummary.comparisonToPrevious >= 0 ? '+' : ''}{weeklySummary.comparisonToPrevious.toFixed(0)}%
                    </span>
                  </div>

                  {weeklySummary.insights.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <h4 className="text-sm font-semibold text-text-primary mb-2">
                        {t('analytics.insights', 'Insights')}
                      </h4>
                      <ul className="space-y-2">
                        {weeklySummary.insights.slice(0, 3).map((insight, i) => (
                          <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{translateInsight(insight)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Calendar Heatmap */}
          <CalendarHeatmap
            data={heatmapData}
            title={t('analytics.yearlyActivity', 'Yearly Activity')}
            description={t('analytics.heatmapDescription', 'GitHub-style contribution calendar')}
            isLoading={isLoading}
            year={new Date().getFullYear()}
          />

          {/* Behavioral Insights */}
          {insights.length > 0 && !isLoading && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-text-primary">
                {t('analytics.behavioralInsights', 'Behavioral Insights')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {insights.map((insight, index) => (
                  <InsightCard key={index} insight={insight} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
