import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, AlertCircle, TrendingUp, Calendar, Plus } from 'lucide-react';
import { TimeGap } from '../../types';
import { formatDuration, formatTime, formatDate } from '../../utils/format';

interface GapDetectionProps {
  startDate: string;
  endDate: string;
  onCreateActivity?: (gap: TimeGap) => void;
}

const GapDetection: React.FC<GapDetectionProps> = ({ startDate, endDate, onCreateActivity }) => {
  const { t } = useTranslation();
  const [gaps, setGaps] = useState<TimeGap[]>([]);
  const [statistics, setStatistics] = useState({
    totalGaps: 0,
    totalUntrackedSeconds: 0,
    averageGapSeconds: 0,
    longestGapSeconds: 0,
  });
  const [minGapMinutes, setMinGapMinutes] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGapData();
  }, [startDate, endDate, minGapMinutes]);

  const loadGapData = async () => {
    if (!window.electronAPI) return;

    try {
      setLoading(true);
      setError(null);

      const [gapsData, statsData] = await Promise.all([
        window.electronAPI.detectActivityGaps(startDate, endDate, minGapMinutes),
        window.electronAPI.getGapStatistics(startDate, endDate, minGapMinutes),
      ]);

      setGaps(gapsData);
      setStatistics(statsData);
    } catch (err) {
      console.error('Failed to load gap data:', err);
      setError(t('dataQuality.gaps.loadError', 'Failed to load gap data'));
    } finally {
      setLoading(false);
    }
  };

  const handleFillGap = (gap: TimeGap) => {
    if (onCreateActivity) {
      onCreateActivity(gap);
    }
  };

  const getGapSeverity = (durationSeconds: number): 'low' | 'medium' | 'high' => {
    const minutes = durationSeconds / 60;
    if (minutes < 15) return 'low';
    if (minutes < 60) return 'medium';
    return 'high';
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'medium':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
      case 'high':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('dataQuality.gaps.totalGaps', 'Total Gaps')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {statistics.totalGaps}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('dataQuality.gaps.untrackedTime', 'Untracked Time')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatDuration(statistics.totalUntrackedSeconds, t)}
              </p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('dataQuality.gaps.averageGap', 'Average Gap')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatDuration(statistics.averageGapSeconds, t)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('dataQuality.gaps.longestGap', 'Longest Gap')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatDuration(statistics.longestGapSeconds, t)}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('dataQuality.gaps.minGapDuration', 'Minimum Gap Duration (minutes)')}
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="1"
            max="60"
            step="1"
            value={minGapMinutes}
            onChange={(e) => setMinGapMinutes(parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm font-medium text-gray-900 dark:text-white w-16 text-right">
            {minGapMinutes} min
          </span>
        </div>
      </div>

      {/* Gaps List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('dataQuality.gaps.detectedGaps', 'Detected Gaps')}
          </h3>
        </div>

        {gaps.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
            {t('dataQuality.gaps.noGaps', 'No gaps detected in the selected time range')}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {gaps.map((gap, index) => {
              const severity = getGapSeverity(gap.durationSeconds);
              const severityColor = getSeverityColor(severity);

              return (
                <div
                  key={index}
                  className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${severityColor}`}>
                          {formatDuration(gap.durationSeconds, t)}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {formatTime(gap.startTime)} - {formatTime(gap.endTime)}
                        </span>
                      </div>
                      {gap.previousActivity && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {t('dataQuality.gaps.after', 'After')}: {gap.previousActivity.title}
                        </div>
                      )}
                      {gap.nextActivity && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {t('dataQuality.gaps.before', 'Before')}: {gap.nextActivity.title}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleFillGap(gap)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      {t('dataQuality.gaps.fillGap', 'Fill Gap')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default GapDetection;
