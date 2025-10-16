import React from 'react';
import { Clock, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { UnifiedActivity } from '@/types';
import SourceTypeIcon from './SourceTypeIcon';
import ConflictBadge from './ConflictBadge';
import { formatDuration } from '@/utils/format';

interface ActivityCardProps {
  activity: UnifiedActivity;
  onClick?: () => void;
  compact?: boolean;
  showDate?: boolean;
  conflict?: {
    type: 'overlap' | 'duplicate' | 'gap';
    severity: 'low' | 'medium' | 'high';
  } | null;
  className?: string;
}

/**
 * ActivityCard
 * Compact card layout for activities (used in calendar views)
 */
const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  onClick,
  compact = false,
  showDate = true,
  conflict = null,
  className = '',
}) => {
  const { t } = useTranslation();

  // Format time
  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (compact) {
    // Compact mode for calendar grid cells
    return (
      <div
        onClick={onClick}
        className={`
          px-2 py-1 rounded
          ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
          transition-opacity
          ${className}
        `}
        style={{
          backgroundColor: activity.categoryColor || '#3b82f6',
          opacity: 0.9,
        }}
        title={`${activity.title} - ${formatDuration(activity.duration, t)}`}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-medium text-white truncate flex-1">
            {activity.title}
          </span>
          <span className="text-xs text-white/90 flex-shrink-0">
            {formatTime(activity.startTime)}
          </span>
        </div>
      </div>
    );
  }

  // Full card mode
  return (
    <div
      onClick={onClick}
      className={`
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        rounded-lg p-3
        ${onClick ? 'cursor-pointer hover:shadow-md hover:border-primary-500 dark:hover:border-primary-400' : ''}
        transition-all
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <SourceTypeIcon sourceType={activity.sourceType} size="sm" showBadge={false} />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {activity.title}
          </h4>
        </div>
        {conflict && (
          <ConflictBadge
            conflictType={conflict.type}
            severity={conflict.severity}
            size="sm"
            showLabel={false}
          />
        )}
      </div>

      {/* Time Info */}
      <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
        {showDate && (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span>{formatDate(activity.startTime)}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span>
            {formatTime(activity.startTime)} - {formatTime(activity.endTime)}
          </span>
          <span className="ml-auto font-medium text-primary-600 dark:text-primary-400">
            {formatDuration(activity.duration, t)}
          </span>
        </div>
      </div>

      {/* Category Badge */}
      {activity.categoryName && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {activity.categoryColor && (
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: activity.categoryColor }}
              />
            )}
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
              {activity.categoryName}
            </span>
          </div>
        </div>
      )}

      {/* Tags */}
      {activity.tags && activity.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {activity.tags.slice(0, 3).map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              style={{
                backgroundColor: tag.color ? `${tag.color}20` : undefined,
                color: tag.color || undefined,
              }}
            >
              {tag.name}
            </span>
          ))}
          {activity.tags.length > 3 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              +{activity.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Metadata preview for automatic activities */}
      {activity.metadata && (activity.metadata.appName || activity.metadata.domain) && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 truncate">
          {activity.metadata.appName && <span>App: {activity.metadata.appName}</span>}
          {activity.metadata.domain && <span>Domain: {activity.metadata.domain}</span>}
        </div>
      )}
    </div>
  );
};

export default ActivityCard;
