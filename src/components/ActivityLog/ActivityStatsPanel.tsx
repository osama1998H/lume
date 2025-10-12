import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, PieChart, TrendingUp, AlertCircle, Activity, Target } from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { UnifiedActivity, TimeGap } from '../../types';
import { formatDuration } from '../../utils/format';

interface ActivityStatsPanelProps {
  activities: UnifiedActivity[];
  dateRange: { start: Date; end: Date };
  onClose?: () => void;
}

/**
 * ActivityStatsPanel Component
 * Displays comprehensive statistics about the current activity set
 * Including time by type, category breakdown, hourly patterns, gaps, and data quality
 */
const ActivityStatsPanel: React.FC<ActivityStatsPanelProps> = ({ activities, dateRange, onClose }) => {
  const { t } = useTranslation();

  // Calculate statistics
  const stats = useMemo(() => {
    // Time by source type
    const manualTime = activities
      .filter(a => a.sourceType === 'manual')
      .reduce((sum, a) => sum + a.duration, 0);
    const automaticTime = activities
      .filter(a => a.sourceType === 'automatic')
      .reduce((sum, a) => sum + a.duration, 0);
    const pomodoroTime = activities
      .filter(a => a.sourceType === 'pomodoro')
      .reduce((sum, a) => sum + a.duration, 0);
    const totalTime = manualTime + automaticTime + pomodoroTime;

    // Category breakdown
    const categoryMap = new Map<string, { name: string; color: string; time: number }>();
    activities.forEach(activity => {
      if (activity.categoryId && activity.categoryName) {
        const existing = categoryMap.get(activity.categoryName) || {
          name: activity.categoryName,
          color: activity.categoryColor || '#8B5CF6',
          time: 0,
        };
        existing.time += activity.duration;
        categoryMap.set(activity.categoryName, existing);
      }
    });

    const categoryBreakdown = Array.from(categoryMap.values())
      .sort((a, b) => b.time - a.time)
      .slice(0, 5)
      .map(cat => ({
        name: cat.name,
        value: cat.time / 60, // Convert to minutes
        color: cat.color,
        percentage: totalTime > 0 ? ((cat.time / totalTime) * 100).toFixed(1) : '0',
      }));

    // Most active hours (24-hour format)
    const hourlyActivity = new Array(24).fill(0);
    activities.forEach(activity => {
      const startHour = new Date(activity.startTime).getHours();
      hourlyActivity[startHour] += activity.duration;
    });

    const topHours = hourlyActivity
      .map((time, hour) => ({ hour, time }))
      .sort((a, b) => b.time - a.time)
      .slice(0, 5);

    // Detect gaps (> 15 minutes)
    const gaps: TimeGap[] = [];
    const sortedActivities = [...activities].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    for (let i = 0; i < sortedActivities.length - 1; i++) {
      const current = sortedActivities[i];
      const next = sortedActivities[i + 1];
      const gapStart = new Date(current.endTime);
      const gapEnd = new Date(next.startTime);
      const gapDuration = (gapEnd.getTime() - gapStart.getTime()) / 1000; // seconds

      if (gapDuration > 15 * 60) {
        // Gap > 15 minutes
        gaps.push({
          startTime: gapStart.toISOString(),
          endTime: gapEnd.toISOString(),
          duration: gapDuration,
          beforeActivity: current,
          afterActivity: next,
        });
      }
    }

    // Data quality score (0-100)
    const totalDaySeconds = (dateRange.end.getTime() - dateRange.start.getTime()) / 1000;
    const coverageScore = totalDaySeconds > 0 ? Math.min((totalTime / totalDaySeconds) * 100, 100) : 0;

    const categorizedCount = activities.filter(a => a.categoryId).length;
    const categorizedScore = activities.length > 0 ? (categorizedCount / activities.length) * 100 : 0;

    const dataQualityScore = Math.round((coverageScore * 0.7 + categorizedScore * 0.3));

    // Average duration
    const avgDuration = activities.length > 0 ? totalTime / activities.length : 0;

    // Longest and shortest
    const durations = activities.map(a => a.duration).sort((a, b) => b - a);
    const longestDuration = durations[0] || 0;
    const shortestDuration = durations[durations.length - 1] || 0;

    return {
      manualTime,
      automaticTime,
      pomodoroTime,
      totalTime,
      categoryBreakdown,
      topHours,
      gaps: gaps.sort((a, b) => b.duration - a.duration).slice(0, 3), // Top 3 gaps
      dataQualityScore,
      avgDuration,
      longestDuration,
      shortestDuration,
      categorizedCount,
      totalActivities: activities.length,
    };
  }, [activities, dateRange]);

  // Note: Quality color is determined inline in the JSX below based on score thresholds

  return (
    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('activityLog.statistics.title', 'Statistics')}
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Activities</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalActivities}</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Time</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatDuration(stats.totalTime, t)}
          </p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Average Duration</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatDuration(stats.avgDuration, t)}
          </p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Categorized</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.categorizedCount}/{stats.totalActivities}
          </p>
        </div>
      </div>

      {/* Time by Type */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          {t('activityLog.statistics.totalByType', 'Time by Type')}
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {t('activityLog.manual', 'Manual')}
            </span>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {formatDuration(stats.manualTime, t)}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {stats.totalTime > 0 ? ((stats.manualTime / stats.totalTime) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {t('activityLog.automatic', 'Automatic')}
            </span>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {formatDuration(stats.automaticTime, t)}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {stats.totalTime > 0 ? ((stats.automaticTime / stats.totalTime) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {t('activityLog.pomodoro', 'Pomodoro')}
            </span>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {formatDuration(stats.pomodoroTime, t)}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {stats.totalTime > 0 ? ((stats.pomodoroTime / stats.totalTime) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      {stats.categoryBreakdown.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            {t('activityLog.statistics.categoryBreakdown', 'Category Breakdown')}
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={stats.categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `${Math.round(value)} min`}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                  }}
                />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Most Active Hours */}
      {stats.topHours.some(h => h.time > 0) && (
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {t('activityLog.statistics.mostActiveHours', 'Most Active Hours')}
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="hour"
                  tickFormatter={(hour) => `${hour}:00`}
                  stroke="#888"
                />
                <YAxis
                  tickFormatter={(value) => `${Math.round(value / 60)}m`}
                  stroke="#888"
                />
                <Tooltip
                  formatter={(value: number) => formatDuration(value, t)}
                  labelFormatter={(hour) => `${hour}:00`}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="time" fill="#3B82F6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Gaps in Tracking */}
      {stats.gaps.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            {t('activityLog.statistics.gaps', 'Gaps in Tracking')}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {t('activityLog.statistics.gapCount', `${stats.gaps.length} gaps detected`)}
          </p>
          <div className="space-y-2">
            {stats.gaps.map((gap, index) => (
              <div
                key={index}
                className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(gap.startTime).toLocaleTimeString()} - {new Date(gap.endTime).toLocaleTimeString()}
                  </span>
                  <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                    {formatDuration(gap.duration, t)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Quality Score */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Target className="w-5 h-5" />
          {t('activityLog.statistics.dataQuality', 'Data Quality Score')}
        </h4>
        <div
          className={`p-6 rounded-lg text-center ${
            stats.dataQualityScore >= 80
              ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500'
              : stats.dataQualityScore >= 50
              ? 'bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500'
              : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500'
          }`}
        >
          <p
            className={`text-6xl font-bold ${
              stats.dataQualityScore >= 80
                ? 'text-green-600 dark:text-green-400'
                : stats.dataQualityScore >= 50
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {stats.dataQualityScore}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Based on coverage and categorization
          </p>
        </div>
      </div>
    </div>
  );
};

export default ActivityStatsPanel;
