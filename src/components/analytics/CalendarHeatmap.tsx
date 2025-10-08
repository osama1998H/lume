import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HeatmapDay } from '../../types';
import { ChartCard } from './ChartCard';

interface CalendarHeatmapProps {
  data: HeatmapDay[];
  title: string;
  description?: string;
  isLoading?: boolean;
  year: number;
}

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({
  data,
  title,
  description,
  isLoading = false,
  year,
}) => {
  const { t } = useTranslation();
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);

  // Group days by week
  const weeks = groupByWeeks(data, year);

  // Get color for intensity level
  const getColor = (intensity: 0 | 1 | 2 | 3 | 4): string => {
    switch (intensity) {
      case 0: return '#1e293b'; // Dark background
      case 1: return '#334155'; // Very low
      case 2: return '#475569'; // Low
      case 3: return '#64748b'; // Medium
      case 4: return '#0ea5e9'; // High (primary color)
      default: return '#1e293b';
    }
  };

  // Format date for tooltip
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format duration
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <ChartCard
      title={title}
      description={description}
      isLoading={isLoading}
      isEmpty={data.length === 0}
    >
      <div className="relative">
        {/* Month labels */}
        <div className="flex mb-2 text-xs text-text-tertiary">
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => (
            <div key={month} style={{ flex: 4.33 }} className="text-center">
              {t(`common.months.${month}`)}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="overflow-x-auto">
          <div className="inline-flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-1.5 mr-2">
              <div className="h-3 text-xs text-text-tertiary" style={{ lineHeight: '12px' }}>{t('common.daysOfWeekShort.Mon')}</div>
              <div className="h-3 text-xs text-text-tertiary" style={{ lineHeight: '12px' }}>{t('common.daysOfWeekShort.Tue')}</div>
              <div className="h-3 text-xs text-text-tertiary" style={{ lineHeight: '12px' }}>{t('common.daysOfWeekShort.Wed')}</div>
              <div className="h-3 text-xs text-text-tertiary" style={{ lineHeight: '12px' }}>{t('common.daysOfWeekShort.Thu')}</div>
              <div className="h-3 text-xs text-text-tertiary" style={{ lineHeight: '12px' }}>{t('common.daysOfWeekShort.Fri')}</div>
              <div className="h-3 text-xs text-text-tertiary" style={{ lineHeight: '12px' }}>{t('common.daysOfWeekShort.Sat')}</div>
              <div className="h-3 text-xs text-text-tertiary" style={{ lineHeight: '12px' }}>{t('common.daysOfWeekShort.Sun')}</div>
            </div>

            {/* Week columns */}
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1.5">
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className="w-3 h-3 rounded-sm cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-primary"
                    style={{ backgroundColor: day ? getColor(day.intensity) : 'transparent' }}
                    onMouseEnter={() => day && setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Tooltip */}
        {hoveredDay && (
          <div className="absolute top-0 right-0 bg-surface-secondary border border-border rounded-lg shadow-lg p-3 z-10 min-w-[200px]">
            <div className="text-sm font-medium text-text-primary mb-2">
              {formatDate(hoveredDay.date)}
            </div>
            <div className="space-y-1 text-xs text-text-secondary">
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-medium text-text-primary">{formatDuration(hoveredDay.totalMinutes)}</span>
              </div>
              <div className="flex justify-between">
                <span>Focus:</span>
                <span>{formatDuration(hoveredDay.breakdown.focus)}</span>
              </div>
              <div className="flex justify-between">
                <span>Apps:</span>
                <span>{formatDuration(hoveredDay.breakdown.apps)}</span>
              </div>
              <div className="flex justify-between">
                <span>Browser:</span>
                <span>{formatDuration(hoveredDay.breakdown.browser)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-4 text-xs text-text-tertiary">
          <span>{t('common.less')}</span>
          {[0, 1, 2, 3, 4].map(intensity => (
            <div
              key={intensity}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: getColor(intensity as 0 | 1 | 2 | 3 | 4) }}
            />
          ))}
          <span>{t('common.more')}</span>
        </div>
      </div>
    </ChartCard>
  );
};

// Helper function to convert Date to local YYYY-MM-DD string (avoiding timezone issues)
function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to group days by weeks
function groupByWeeks(data: HeatmapDay[], year: number): (HeatmapDay | null)[][] {
  const weeks: (HeatmapDay | null)[][] = [];
  const dataMap = new Map(data.map(d => [d.date, d]));

  // Start from first Sunday of the year
  const startDate = new Date(year, 0, 1);
  const firstSunday = new Date(startDate);
  firstSunday.setDate(startDate.getDate() - startDate.getDay());

  let currentDate = new Date(firstSunday);
  const endDate = new Date(year, 11, 31);

  while (currentDate <= endDate) {
    const week: (HeatmapDay | null)[] = [];

    for (let i = 0; i < 7; i++) {
      const dateStr = toLocalDateString(currentDate);
      const dayData = dataMap.get(dateStr) || null;

      // Only add if it's in the current year
      if (currentDate.getFullYear() === year) {
        week.push(dayData);
      } else {
        week.push(null);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    weeks.push(week);
  }

  return weeks;
}
