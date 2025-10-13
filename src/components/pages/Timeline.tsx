import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Filter,
  Clock,
  TrendingUp,
  Activity,
  Calendar,
  Edit3,
  AlertTriangle,
  Coffee,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Modal from '../ui/Modal';
import DateRangeFilter from '../ui/DateRangeFilter';
import { formatDuration as formatDurationUtil } from '../../utils/format';
import { useActivityLog } from '../../contexts/ActivityLogContext';
import type { UnifiedActivity, UnifiedActivityFilters } from '../../types';

interface TimelineProps {
  dateRange?: { start: Date; end: Date };
  onActivityClick?: (activity: UnifiedActivity) => void;
}

interface TimelineSummary {
  totalActivities: number;
  totalDuration: number;
  averageDuration: number;
}

interface DragState {
  activityId: number;
  sourceType: 'manual' | 'automatic' | 'pomodoro';
  edge: 'left' | 'right';
  initialX: number;
  initialTime: number;
}

const Timeline: React.FC<TimelineProps> = ({ dateRange: externalDateRange, onActivityClick }) => {
  const { t } = useTranslation();

  // Use context for conflict detection (if available)
  let contextConflicts: Set<string> | undefined;
  let contextDetectConflicts: ((activities?: UnifiedActivity[]) => void) | undefined;

  try {
    const context = useActivityLog();
    contextConflicts = context.conflicts;
    contextDetectConflicts = context.detectConflicts;
  } catch {
    // Timeline is being used standalone, not within ActivityLogProvider
    // We'll use local state instead
  }

  const [activities, setActivities] = useState<UnifiedActivity[]>([]);
  const [summary, setSummary] = useState<TimelineSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<UnifiedActivity | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [hoveredActivity, setHoveredActivity] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [editMode, setEditMode] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [localConflicts, setLocalConflicts] = useState<Set<string>>(new Set());

  // Use context conflicts if available, otherwise use local conflicts
  const conflicts = contextConflicts || localConflicts;

  const timelineRef = useRef<HTMLDivElement>(null);

  // Date range state
  const [dateRange, setDateRange] = useState(
    externalDateRange || {
      start: new Date(new Date().setHours(0, 0, 0, 0)),
      end: new Date(new Date().setHours(23, 59, 59, 999)),
    }
  );

  // Sync with external date range
  useEffect(() => {
    if (externalDateRange) {
      setDateRange(externalDateRange);
    }
  }, [externalDateRange]);

  // Filters state
  const [filters, setFilters] = useState<UnifiedActivityFilters>({
    dateRange: {
      start: dateRange.start.toISOString(),
      end: dateRange.end.toISOString(),
    },
    sourceTypes: ['manual', 'automatic', 'pomodoro'],
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

      // Fetch unified activities
      const activitiesData = await window.electronAPI.getUnifiedActivities(
        startDate,
        endDate,
        {
          dateRange: { start: startDate, end: endDate },
          sourceTypes: filters.sourceTypes,
          categories: filters.categories,
          tags: filters.tags,
          searchQuery: filters.searchQuery,
        }
      );

      setActivities(activitiesData);

      // Calculate summary
      const total = activitiesData.length;
      const totalDur = activitiesData.reduce((sum, a) => sum + a.duration, 0);
      const avgDur = total > 0 ? totalDur / total : 0;

      setSummary({
        totalActivities: total,
        totalDuration: totalDur,
        averageDuration: avgDur,
      });

      // Detect conflicts
      if (contextDetectConflicts) {
        contextDetectConflicts(activitiesData);
      } else {
        detectLocalConflicts(activitiesData);
      }
    } catch (error) {
      console.error('Failed to fetch timeline data:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, filters, contextDetectConflicts]);

  useEffect(() => {
    fetchTimelineData();
  }, [fetchTimelineData]);

  // Detect overlapping activities (local fallback)
  const detectLocalConflicts = (acts: UnifiedActivity[]) => {
    const conflictSet = new Set<string>();

    for (let i = 0; i < acts.length; i++) {
      for (let j = i + 1; j < acts.length; j++) {
        const a1 = acts[i];
        const a2 = acts[j];

        // Skip activities without endTime
        if (!a1.endTime || !a2.endTime) continue;

        const start1 = new Date(a1.startTime).getTime();
        const end1 = new Date(a1.endTime).getTime();
        const start2 = new Date(a2.startTime).getTime();
        const end2 = new Date(a2.endTime).getTime();

        // Check for overlap
        if (start1 < end2 && end1 > start2) {
          conflictSet.add(`${a1.id}:${a1.sourceType}`);
          conflictSet.add(`${a2.id}:${a2.sourceType}`);
        }
      }
    }

    setLocalConflicts(conflictSet);
  };

  // Filter activities
  const filteredActivities = activities.filter((activity) => {
    if (!filters.sourceTypes?.includes(activity.sourceType)) return false;
    if (filters.categories && filters.categories.length > 0 && !filters.categories.includes(activity.categoryId || 0)) {
      return false;
    }
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      return activity.title.toLowerCase().includes(query);
    }
    return true;
  });

  // Group activities by source type
  const groupedActivities = {
    manual: filteredActivities.filter((a) => a.sourceType === 'manual'),
    automatic: filteredActivities.filter((a) => a.sourceType === 'automatic'),
    pomodoro: filteredActivities.filter((a) => a.sourceType === 'pomodoro'),
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
        start = new Date(
          new Date(new Date().setDate(new Date().getDate() - 7)).setHours(0, 0, 0, 0)
        );
        end = new Date(new Date().setHours(23, 59, 59, 999));
        break;
      case 'month':
        start = new Date(
          new Date(new Date().setDate(new Date().getDate() - 30)).setHours(0, 0, 0, 0)
        );
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
      hour12: false,
    });
  };

  // Calculate position and width for activity blocks
  const getActivityStyle = (activity: UnifiedActivity) => {
    const startTime = new Date(activity.startTime).getTime();
    const endTime = activity.endTime ? new Date(activity.endTime).getTime() : Date.now();
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
  const handleActivityClick = (activity: UnifiedActivity) => {
    if (editMode) return; // Don't open modal in edit mode

    if (onActivityClick) {
      onActivityClick(activity);
    } else {
      setSelectedActivity(activity);
      setShowDetailsModal(true);
    }
  };

  // Handle activity double-click (edit)
  const handleActivityDoubleClick = (activity: UnifiedActivity, e: React.MouseEvent) => {
    e.stopPropagation();
    // Only manual activities are editable
    if (activity.sourceType !== 'manual') return;
    onActivityClick?.(activity);
  };

  // Drag handlers
  const handleMouseDown = (
    activity: UnifiedActivity,
    edge: 'left' | 'right',
    e: React.MouseEvent
  ) => {
    // Only manual activities are editable
    if (!editMode || activity.sourceType !== 'manual') return;

    e.stopPropagation();
    const initialTime =
      edge === 'left'
        ? new Date(activity.startTime).getTime()
        : new Date(activity.endTime).getTime();

    setDragState({
      activityId: activity.id,
      sourceType: activity.sourceType,
      edge,
      initialX: e.clientX,
      initialTime,
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState || !timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragState.initialX;
      const totalWidth = rect.width - 160; // Minus label width
      const dayStart = dateRange.start.getTime();
      const dayEnd = dateRange.end.getTime();
      const totalDuration = dayEnd - dayStart;

      const deltaTime = (deltaX / totalWidth) * totalDuration;
      const newTime = dragState.initialTime + deltaTime;

      // Snap to 5-minute intervals
      const snapInterval = 5 * 60 * 1000; // 5 minutes in ms
      const snappedTime = Math.round(newTime / snapInterval) * snapInterval;

      // Update activity state (visual feedback)
      setActivities((prev) =>
        prev.map((a) => {
          if (a.id === dragState.activityId && a.sourceType === dragState.sourceType) {
            if (dragState.edge === 'left') {
              const endTime = new Date(a.endTime).getTime();
              // Minimum 1 minute duration
              if (endTime - snappedTime < 60000) return a;
              return { ...a, startTime: new Date(snappedTime).toISOString() };
            } else {
              const startTime = new Date(a.startTime).getTime();
              // Minimum 1 minute duration
              if (snappedTime - startTime < 60000) return a;
              return { ...a, endTime: new Date(snappedTime).toISOString() };
            }
          }
          return a;
        })
      );
    },
    [dragState, dateRange]
  );

  const handleMouseUp = useCallback(async () => {
    if (!dragState) return;

    // Find the updated activity
    const updatedActivity = activities.find(
      (a) => a.id === dragState.activityId && a.sourceType === dragState.sourceType
    );

    if (updatedActivity && updatedActivity.endTime) {
      try {
        // Validate no overlaps
        const start = new Date(updatedActivity.startTime).getTime();
        const end = new Date(updatedActivity.endTime).getTime();
        const duration = Math.floor((end - start) / 1000);

        // Update via IPC
        await window.electronAPI.updateUnifiedActivity({
          id: updatedActivity.id,
          sourceType: updatedActivity.sourceType,
          updates: {
            startTime: updatedActivity.startTime,
            endTime: updatedActivity.endTime,
            duration,
          },
        });

        // Refresh data
        await fetchTimelineData();
      } catch (error) {
        console.error('Failed to update activity:', error);
        // Revert on error
        await fetchTimelineData();
      }
    }

    setDragState(null);
  }, [dragState, activities, fetchTimelineData]);

  // Add/remove mouse event listeners
  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

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

  // Check if activity has conflict
  const hasConflict = (activity: UnifiedActivity): boolean => {
    return conflicts.has(`${activity.id}:${activity.sourceType}`);
  };

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
    <div ref={timelineRef} className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
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
            className="flex items-center gap-2"
          >
            {/* Edit Mode Toggle */}
            <button
              onClick={() => setEditMode(!editMode)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                editMode
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={t('activityLog.editMode', 'Edit Mode')}
            >
              <Edit3 className="w-4 h-4" />
              <span>{t('activityLog.editMode', 'Edit')}</span>
            </button>

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

        {/* Edit Mode Helper Text */}
        {editMode && (
          <div className="mt-3 p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
            <p className="text-xs text-primary-700 dark:text-primary-400">
              <strong>{t('activityLog.editModeActive', 'Edit Mode Active')}:</strong>{' '}
              {t(
                'activityLog.dragToResize',
                'Drag the edges of activity blocks to resize. Changes are saved automatically.'
              )}
            </p>
          </div>
        )}
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
              {dateRange.start.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
              {dateRange.end.getTime() - dateRange.start.getTime() > 86400000 &&
                ` - ${dateRange.end.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}`}
            </span>
          </div>

          {/* Activity Type Filters */}
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            {(['manual', 'automatic', 'pomodoro'] as const).map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={filters.sourceTypes?.includes(type) || false}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFilters({
                        ...filters,
                        sourceTypes: [...(filters.sourceTypes || []), type],
                      });
                    } else {
                      setFilters({
                        ...filters,
                        sourceTypes: (filters.sourceTypes || []).filter((t) => t !== type),
                      });
                    }
                  }}
                  className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 focus:ring-offset-0 transition-colors"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                  {type === 'manual'
                    ? t('timeline.manual', 'Manual')
                    : type === 'automatic'
                    ? t('timeline.automatic', 'Automatic')
                    : t('timeline.pomodoro', 'Pomodoro')}
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
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {t('timeline.activityType')}
                  </span>
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
              <div
                key={type}
                className="border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex min-h-[70px]">
                  <div className="w-40 flex-shrink-0 px-4 py-4 border-r border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2">
                      {type === 'pomodoro' && <Coffee className="w-4 h-4 text-red-600 dark:text-red-400" />}
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 block">
                        {type === 'manual'
                          ? t('timeline.manualTasks', 'Manual Tasks')
                          : type === 'automatic'
                          ? t('timeline.applications', 'Applications')
                          : t('timeline.pomodoroSessions', 'Pomodoro')}
                      </span>
                    </div>
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
                      const activityId = `${activity.sourceType}-${activity.id}-${idx}`;
                      const isHovered = hoveredActivity === activityId;
                      const hasConflictIndicator = hasConflict(activity);

                      // Special styling for pomodoro
                      const backgroundColor =
                        activity.sourceType === 'pomodoro'
                          ? '#ef4444' // red-500
                          : activity.categoryColor || '#3b82f6';

                      return (
                        <div
                          key={activityId}
                          className={`absolute h-12 rounded-lg cursor-pointer transition-all duration-200 group ${
                            editMode && activity.sourceType === 'manual' ? 'cursor-ew-resize' : ''
                          }`}
                          style={{
                            ...style,
                            backgroundColor,
                            top: '8px',
                            boxShadow: isHovered
                              ? '0 4px 12px rgba(0, 0, 0, 0.15)'
                              : '0 1px 3px rgba(0, 0, 0, 0.1)',
                            transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                            zIndex: isHovered ? 10 : 1,
                            border: hasConflictIndicator ? '2px solid #dc2626' : 'none',
                          }}
                          onClick={() => handleActivityClick(activity)}
                          onDoubleClick={(e) => handleActivityDoubleClick(activity, e)}
                          onMouseEnter={() => setHoveredActivity(activityId)}
                          onMouseLeave={() => setHoveredActivity(null)}
                          title={`${activity.title} - ${formatDurationUtil(activity.duration, t)}`}
                        >
                          {/* Conflict indicator */}
                          {hasConflictIndicator && (
                            <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center">
                              <AlertTriangle className="w-3 h-3 text-white" />
                            </div>
                          )}

                          {/* Resize handles (edit mode only) */}
                          {editMode && activity.sourceType === 'manual' && (
                            <>
                              <div
                                className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize hover:bg-black/20 transition-colors"
                                onMouseDown={(e) => handleMouseDown(activity, 'left', e)}
                              />
                              <div
                                className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-black/20 transition-colors"
                                onMouseDown={(e) => handleMouseDown(activity, 'right', e)}
                              />
                            </>
                          )}

                          <div className="h-full flex items-center justify-between px-3 text-white text-sm font-medium overflow-hidden">
                            <span className="truncate flex-1 pr-2">{activity.title}</span>
                            <span className="flex-shrink-0 text-xs opacity-90">
                              {formatDurationUtil(activity.duration, t)}
                            </span>
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
                  {selectedActivity.sourceType}
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

export default Timeline;
