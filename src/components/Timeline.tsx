import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Filter,
  Clock,
  TrendingUp,
  Activity,
  Calendar,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Modal from './ui/Modal';
import DateRangeFilter from './ui/DateRangeFilter';
import { formatDuration as formatDurationUtil } from '../utils/format';
import type {
  TimelineActivity,
  TimelineFilters,
  TimelineSummary,
} from '../types';

const TimelineView: React.FC = () => {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [summary, setSummary] = useState<TimelineSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<TimelineActivity | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [hoveredActivity, setHoveredActivity] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

  // Date range state
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setHours(0, 0, 0, 0)),
    end: new Date(new Date().setHours(23, 59, 59, 999)),
  });

  // Filters state
  const [filters, setFilters] = useState<TimelineFilters>({
    dateRange: {
      start: new Date(new Date().setHours(0, 0, 0, 0)),
      end: new Date(new Date().setHours(23, 59, 59, 999)),
    },
    activityTypes: ['app', 'browser', 'time_entry'],
    categories: [],
    tags: [],
    searchQuery: '',
  });

  // Fetch timeline data
  const fetchTimelineData = useCallback(async () => {
    try {
      setLoading(true);
      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();

      const [activitiesData, summaryData] = await Promise.all([
        window.electronAPI.getTimelineActivities(startDate, endDate),
        window.electronAPI.getTimelineSummary(startDate, endDate),
      ]);

      setActivities(activitiesData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to fetch timeline data:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchTimelineData();
  }, [fetchTimelineData]);

  // Filter activities
  const filteredActivities = activities.filter((activity) => {
    if (!filters.activityTypes.includes(activity.type)) return false;
    if (filters.categories.length > 0 && !filters.categories.includes(activity.categoryId || 0)) {
      return false;
    }
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      return activity.title.toLowerCase().includes(query);
    }
    return true;
  });

  // Group activities by type
  const groupedActivities = {
    time_entry: filteredActivities.filter(a => a.type === 'time_entry'),
    app: filteredActivities.filter(a => a.type === 'app'),
    browser: filteredActivities.filter(a => a.type === 'browser'),
  };

  // Date navigation
  const navigateDate = (direction: 'prev' | 'next') => {
    const days = dateRange.end.getTime() - dateRange.start.getTime() > 86400000 ? 7 : 1;
    const offset = direction === 'prev' ? -days : days;

    setDateRange({
      start: new Date(dateRange.start.getTime() + offset * 86400000),
      end: new Date(dateRange.end.getTime() + offset * 86400000),
    });
  };

  // Date range presets
  const handleDateRangeChange = (preset: 'today' | 'week' | 'month') => {
    setSelectedPeriod(preset);
    let start, end;
    switch (preset) {
      case 'today':
        start = new Date(new Date().setHours(0, 0, 0, 0));
        end = new Date(new Date().setHours(23, 59, 59, 999));
        break;
      case 'week':
        start = new Date(new Date(new Date().setDate(new Date().getDate() - 7)).setHours(0, 0, 0, 0));
        end = new Date(new Date().setHours(23, 59, 59, 999));
        break;
      case 'month':
        start = new Date(new Date(new Date().setDate(new Date().getDate() - 30)).setHours(0, 0, 0, 0));
        end = new Date(new Date().setHours(23, 59, 59, 999));
        break;
    }
    setDateRange({ start, end });
  };

  // Format time for display
  const formatTime = (date: string): string => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Calculate position and width for activity blocks
  const getActivityStyle = (activity: TimelineActivity) => {
    const startTime = new Date(activity.startTime).getTime();
    const endTime = new Date(activity.endTime).getTime();
    const dayStart = dateRange.start.getTime();
    const dayEnd = dateRange.end.getTime();

    const totalDuration = dayEnd - dayStart;
    const activityStart = Math.max(startTime - dayStart, 0);
    const activityDuration = Math.min(endTime, dayEnd) - Math.max(startTime, dayStart);

    const left = (activityStart / totalDuration) * 100;
    const width = (activityDuration / totalDuration) * 100;

    return {
      left: `${left}%`,
      width: `${Math.max(width, 0.5)}%`,
    };
  };

  // Handle activity click
  const handleActivityClick = (activity: TimelineActivity) => {
    setSelectedActivity(activity);
    setShowDetailsModal(true);
  };

  // Generate hour markers
  const generateHourMarkers = () => {
    const isMultiDay = dateRange.end.getTime() - dateRange.start.getTime() > 86400000;

    if (isMultiDay) {
      // Show day markers
      const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / 86400000);
      return Array.from({ length: days + 1 }).map((_, i) => {
        const date = new Date(dateRange.start.getTime() + i * 86400000);
        return {
          position: (i / days) * 100,
          label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        };
      });
    } else {
      // Show hour markers
      return Array.from({ length: 25 }).map((_, i) => ({
        position: (i / 24) * 100,
        label: `${i}:00`,
      }));
    }
  };

  const hourMarkers = generateHourMarkers();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
              {t('timeline.title')}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('timeline.subtitle')}
            </p>
          </motion.div>

          {/* Date Range Selector */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <DateRangeFilter
              options={[
                { value: 'today', label: t('reports.today') },
                { value: 'week', label: t('reports.week') },
                { value: 'month', label: t('reports.month') },
              ]}
              selectedValue={selectedPeriod}
              onChange={(value) => handleDateRangeChange(value as 'today' | 'week' | 'month')}
              withNavigation={true}
              onNavigate={navigateDate}
            />
          </motion.div>
        </div>
      </div>

      {/* Summary Stats Bar */}
      {summary && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
          <div className="grid grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg shadow-primary-500/20">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('timeline.totalActivities')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.totalActivities}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg shadow-green-500/20">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('timeline.totalTime')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatDurationUtil(summary.totalDuration, t)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg shadow-purple-500/20">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('timeline.averageDuration')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatDurationUtil(summary.averageDuration, t)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {dateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {dateRange.end.getTime() - dateRange.start.getTime() > 86400000 &&
                ` - ${dateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              }
            </span>
          </div>

          {/* Activity Type Filters */}
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            {(['time_entry', 'app', 'browser'] as const).map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={filters.activityTypes.includes(type)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFilters({
                        ...filters,
                        activityTypes: [...filters.activityTypes, type],
                      });
                    } else {
                      setFilters({
                        ...filters,
                        activityTypes: filters.activityTypes.filter((t) => t !== type),
                      });
                    }
                  }}
                  className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 focus:ring-offset-0 transition-colors"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                  {type === 'time_entry' ? t('timeline.tasks') : type === 'app' ? t('timeline.apps') : t('timeline.websites')}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-6">
        {filteredActivities.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 py-20 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
              <Activity className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('timeline.noActivities')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('timeline.noActivitiesDesc')}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Time Header */}
            <div className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
              <div className="flex h-12">
                <div className="w-40 flex-shrink-0 px-4 py-3 border-r border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{t('timeline.activityType')}</span>
                </div>
                <div className="flex-1 relative">
                  {hourMarkers.map((marker, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 border-l border-gray-300 dark:border-gray-600"
                      style={{ left: `${marker.position}%` }}
                    >
                      <span className="absolute top-2 -left-6 text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {marker.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Timeline Rows */}
            {Object.entries(groupedActivities).map(([type, typeActivities]) => (
              <div key={type} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex min-h-[70px]">
                  <div className="w-40 flex-shrink-0 px-4 py-4 border-r border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 block">
                      {type === 'time_entry' ? t('timeline.manualTasks') : type === 'app' ? t('timeline.applications') : t('timeline.webBrowsing')}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
                      {typeActivities.length} {typeActivities.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <div className="flex-1 relative py-3 px-2">
                    {/* Grid lines */}
                    {hourMarkers.map((marker, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 border-l border-gray-100 dark:border-gray-700/50"
                        style={{ left: `${marker.position}%` }}
                      />
                    ))}

                    {/* Activity blocks */}
                    {typeActivities.map((activity, idx) => {
                      const style = getActivityStyle(activity);
                      const activityId = `${activity.type}-${activity.id}-${idx}`;
                      const isHovered = hoveredActivity === activityId;

                      return (
                        <div
                          key={activityId}
                          className="absolute h-12 rounded-lg cursor-pointer transition-all duration-200 group"
                          style={{
                            ...style,
                            backgroundColor: activity.categoryColor || '#3b82f6',
                            top: '8px',
                            boxShadow: isHovered
                              ? '0 4px 12px rgba(0, 0, 0, 0.15)'
                              : '0 1px 3px rgba(0, 0, 0, 0.1)',
                            transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                            zIndex: isHovered ? 10 : 1,
                          }}
                          onClick={() => handleActivityClick(activity)}
                          onMouseEnter={() => setHoveredActivity(activityId)}
                          onMouseLeave={() => setHoveredActivity(null)}
                          title={`${activity.title} - ${formatDurationUtil(activity.duration, t)}`}
                        >
                          <div className="h-full flex items-center justify-between px-3 text-white text-sm font-medium overflow-hidden">
                            <span className="truncate flex-1 pr-2">{activity.title}</span>
                            <span className="flex-shrink-0 text-xs opacity-90">{formatDurationUtil(activity.duration, t)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Details Modal */}
      <Modal
        isOpen={showDetailsModal && !!selectedActivity}
        onClose={() => setShowDetailsModal(false)}
        title={t('timeline.activityDetails')}
        size="lg"
      >
        {selectedActivity && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                {t('timeline.detailsTitle')}
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {selectedActivity.title}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  {t('timeline.detailsType')}
                </p>
                <p className="text-base font-semibold text-gray-900 dark:text-white capitalize">
                  {selectedActivity.type.replace('_', ' ')}
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  {t('timeline.detailsDuration')}
                </p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  {formatDurationUtil(selectedActivity.duration, t)}
                </p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                {t('timeline.detailsTimeRange')}
              </p>
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {formatTime(selectedActivity.startTime)} - {formatTime(selectedActivity.endTime)}
              </p>
            </div>

            {selectedActivity.categoryName && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  {t('timeline.detailsCategory')}
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full shadow-md"
                    style={{ backgroundColor: selectedActivity.categoryColor || '#3b82f6' }}
                  />
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    {selectedActivity.categoryName}
                  </p>
                </div>
              </div>
            )}

            {selectedActivity.metadata?.appName && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  {t('timeline.detailsApplication')}
                </p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  {selectedActivity.metadata.appName}
                </p>
              </div>
            )}

            {selectedActivity.metadata?.domain && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  {t('timeline.detailsWebsite')}
                </p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  {selectedActivity.metadata.domain}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TimelineView;
