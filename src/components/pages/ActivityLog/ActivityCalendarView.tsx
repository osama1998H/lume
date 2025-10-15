import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';
import { useActivityLog } from '../../../contexts/ActivityLogContext';
import ActivityCard from './ActivityCard';
import type { UnifiedActivity } from '../../../types';
import { formatDuration } from '../../../utils/format';

type ViewMode = 'month' | 'week';

interface DayData {
  date: string; // YYYY-MM-DD
  activities: UnifiedActivity[];
  totalDuration: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

interface ActivityCalendarViewProps {
  onActivityClick?: (activity: UnifiedActivity) => void;
  className?: string;
}

/**
 * ActivityCalendarView
 * Calendar view with heatmap visualization and day detail panel
 */
const ActivityCalendarView: React.FC<ActivityCalendarViewProps> = ({
  onActivityClick,
  className = '',
}) => {
  const { t } = useTranslation();
  const { activities } = useActivityLog();

  // Local state
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  // Helper: Convert Date to local YYYY-MM-DD
  const toLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper: Parse YYYY-MM-DD to Date
  const parseLocalDateString = (dateStr: string): Date => {
    const parts = dateStr.split('-').map(Number);
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    if (year === undefined || month === undefined || day === undefined) {
      throw new Error('Invalid date format');
    }
    return new Date(year, month - 1, day);
  };

  // Group activities by day
  const activitiesByDay = useMemo(() => {
    const grouped = new Map<string, DayData>();

    activities.forEach((activity) => {
      const dateStr = toLocalDateString(new Date(activity.startTime));

      if (!grouped.has(dateStr)) {
        grouped.set(dateStr, {
          date: dateStr,
          activities: [],
          totalDuration: 0,
          intensity: 0,
        });
      }

      const dayData = grouped.get(dateStr)!;
      dayData.activities.push(activity);
      dayData.totalDuration += activity.duration;
    });

    // Calculate intensity (0-4) based on total duration
    grouped.forEach((dayData) => {
      const hours = dayData.totalDuration / 3600;
      if (hours === 0) dayData.intensity = 0;
      else if (hours < 2) dayData.intensity = 1;
      else if (hours < 4) dayData.intensity = 2;
      else if (hours < 6) dayData.intensity = 3;
      else dayData.intensity = 4;
    });

    return grouped;
  }, [activities]);

  // Get color for intensity
  const getIntensityColor = (intensity: 0 | 1 | 2 | 3 | 4): string => {
    switch (intensity) {
      case 0:
        return 'bg-gray-100 dark:bg-gray-800';
      case 1:
        return 'bg-primary-200 dark:bg-primary-900/30';
      case 2:
        return 'bg-primary-300 dark:bg-primary-700/50';
      case 3:
        return 'bg-primary-400 dark:bg-primary-600';
      case 4:
        return 'bg-primary-500 dark:bg-primary-500';
      default:
        return 'bg-gray-100 dark:bg-gray-800';
    }
  };

  // Generate calendar days for current view (month or week)
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days: (DayData | null)[] = [];

    if (viewMode === 'week') {
      // Week view: Show the week containing currentDate
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      startOfWeek.setDate(currentDate.getDate() - day); // Go to Sunday

      // Generate 7 days for the week
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dateStr = toLocalDateString(date);
        const dayData = activitiesByDay.get(dateStr);

        days.push(
          dayData || {
            date: dateStr,
            activities: [],
            totalDuration: 0,
            intensity: 0,
          }
        );
      }
    } else {
      // Month view: Show the entire month
      // First day of the month
      const firstDay = new Date(year, month, 1);
      const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday

      // Last day of the month
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();

      // Add empty cells for days before the first day
      for (let i = 0; i < firstDayOfWeek; i++) {
        days.push(null);
      }

      // Add all days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = toLocalDateString(date);
        const dayData = activitiesByDay.get(dateStr);

        days.push(
          dayData || {
            date: dateStr,
            activities: [],
            totalDuration: 0,
            intensity: 0,
          }
        );
      }
    }

    return days;
  }, [currentDate, activitiesByDay, viewMode]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Handle day click
  const handleDayClick = (dayData: DayData) => {
    setSelectedDay(dayData);
  };

  // Format header text based on view mode
  const headerText = useMemo(() => {
    if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      startOfWeek.setDate(currentDate.getDate() - day);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      // If same month, show: "Month DD - DD, YYYY"
      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${startOfWeek.toLocaleDateString('en-US', { month: 'long' })} ${startOfWeek.getDate()} - ${endOfWeek.getDate()}, ${endOfWeek.getFullYear()}`;
      } else {
        // Different months: "Month DD - Month DD, YYYY"
        return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
    } else {
      return currentDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      });
    }
  }, [currentDate, viewMode]);

  // Weekday labels
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={`h-full flex gap-4 bg-white dark:bg-gray-800 p-6 ${className}`}>
      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {headerText}
            </h2>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
            >
              {t('common.today', 'Today')}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'month'
                    ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {t('activityLog.month', 'Month')}
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'week'
                    ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {t('activityLog.week', 'Week')}
              </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-lg">
              <button
                onClick={handlePrev}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-l-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={handleNext}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            {weekdays.map((day) => (
              <div
                key={day}
                className="py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
              >
                {t(`common.daysOfWeekShort.${day}`, day)}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 flex-1">
            {calendarDays.map((dayData, index) => {
              if (!dayData) {
                return (
                  <div
                    key={index}
                    className="border-b border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30"
                  />
                );
              }

              const date = parseLocalDateString(dayData.date);
              const isToday = toLocalDateString(new Date()) === dayData.date;
              const isSelected = selectedDay?.date === dayData.date;

              return (
                <div
                  key={index}
                  onClick={() => handleDayClick(dayData)}
                  className={`
                    min-h-[120px] border-b border-r border-gray-200 dark:border-gray-700 p-2
                    cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700/30
                    ${isSelected ? 'ring-2 ring-primary-500 ring-inset' : ''}
                    ${getIntensityColor(dayData.intensity)}
                  `}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span
                      className={`
                        text-sm font-medium
                        ${isToday ? 'flex items-center justify-center w-6 h-6 bg-primary-600 text-white rounded-full' : 'text-gray-900 dark:text-white'}
                      `}
                    >
                      {date.getDate()}
                    </span>
                    {dayData.totalDuration > 0 && (
                      <div className="flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                        <Clock className="w-3 h-3" />
                        {formatDuration(dayData.totalDuration, t)}
                      </div>
                    )}
                  </div>

                  {/* Activity Preview */}
                  <div className="space-y-1">
                    {dayData.activities.slice(0, 3).map((activity) => (
                      <ActivityCard
                        key={`${activity.id}-${activity.sourceType}`}
                        activity={activity}
                        compact={true}
                        showDate={false}
                        onClick={() => {
                          onActivityClick?.(activity);
                        }}
                      />
                    ))}
                    {dayData.activities.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        +{dayData.activities.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-600 dark:text-gray-400">
          <span>{t('common.less', 'Less')}</span>
          {[0, 1, 2, 3, 4].map((intensity) => (
            <div
              key={intensity}
              className={`w-4 h-4 rounded-sm ${getIntensityColor(intensity as 0 | 1 | 2 | 3 | 4)}`}
            />
          ))}
          <span>{t('common.more', 'More')}</span>
        </div>
      </div>

      {/* Day Detail Panel */}
      {selectedDay && (
        <div className="w-96 border-l border-gray-200 dark:border-gray-700 pl-4 flex flex-col">
          {/* Panel Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {parseLocalDateString(selectedDay.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>
                  {selectedDay.activities.length} {t('activityLog.activities', 'activities')} •{' '}
                  {formatDuration(selectedDay.totalDuration, t)}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Activities List */}
          <div className="flex-1 overflow-auto space-y-3">
            {selectedDay.activities.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                {t('activityLog.noActivities', 'No activities')}
              </p>
            ) : (
              selectedDay.activities.map((activity) => (
                <ActivityCard
                  key={`${activity.id}-${activity.sourceType}`}
                  activity={activity}
                  compact={false}
                  showDate={false}
                  onClick={() => onActivityClick?.(activity)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityCalendarView;
