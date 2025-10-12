import React, { useState } from 'react';
import { Edit2, Trash2, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { UnifiedActivity } from '../../types';
import SourceTypeIcon from './SourceTypeIcon';
import ConflictBadge from './ConflictBadge';
import TagDisplay from '../ui/TagDisplay';
import { formatDuration } from '../../utils/format';

interface ActivityRowProps {
  activity: UnifiedActivity;
  selected: boolean;
  onToggleSelection: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onClick?: () => void;
  showCheckbox?: boolean;
  showActions?: boolean;
  expandable?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  conflict?: {
    type: 'overlap' | 'duplicate' | 'gap';
    severity: 'low' | 'medium' | 'high';
  } | null;
  className?: string;
}

/**
 * ActivityRow
 * Reusable row component for displaying activity in list views
 */
const ActivityRow: React.FC<ActivityRowProps> = ({
  activity,
  selected,
  onToggleSelection,
  onEdit,
  onDelete,
  onDuplicate,
  onClick,
  showCheckbox = true,
  showActions = true,
  expandable = false,
  isExpanded = false,
  onToggleExpand,
  conflict = null,
  className = '',
}) => {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  // Format time for display
  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get category display
  const getCategoryDisplay = () => {
    if (!activity.categoryName) return null;

    return (
      <div className="flex items-center gap-2">
        {activity.categoryColor && (
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: activity.categoryColor }}
          />
        )}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
          {activity.categoryName}
        </span>
      </div>
    );
  };

  // Handle row click
  const handleRowClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on checkbox, buttons, or other interactive elements
    const target = e.target as HTMLElement;
    if (
      (target as HTMLInputElement).type === 'checkbox' ||
      target.tagName === 'BUTTON' ||
      target.closest('button')
    ) {
      return;
    }
    onClick?.();
  };

  return (
    <div className={className}>
      {/* Main Row */}
      <div
        className={`
          flex items-center gap-3 px-4 py-3
          ${selected ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-white dark:bg-gray-800'}
          ${onClick ? 'cursor-pointer' : ''}
          hover:bg-gray-50 dark:hover:bg-gray-700/50
          transition-colors border-b border-gray-200 dark:border-gray-700
        `}
        onClick={handleRowClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Checkbox */}
        {showCheckbox && (
          <div className="flex-shrink-0">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelection}
              className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
            />
          </div>
        )}

        {/* Source Type Icon */}
        <div className="flex-shrink-0">
          <SourceTypeIcon sourceType={activity.sourceType} size="sm" showBadge={false} />
        </div>

        {/* Title & Metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {activity.title}
            </h4>
            {conflict && (
              <ConflictBadge
                conflictType={conflict.type}
                severity={conflict.severity}
                size="sm"
                showLabel={false}
              />
            )}
          </div>
          {activity.metadata && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {activity.metadata.appName && <span>App: {activity.metadata.appName}</span>}
              {activity.metadata.domain && <span>Domain: {activity.metadata.domain}</span>}
            </p>
          )}
        </div>

        {/* Start Time */}
        <div className="flex-shrink-0 text-center">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {formatTime(activity.startTime)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(activity.startTime)}
          </div>
        </div>

        {/* Duration */}
        <div className="flex-shrink-0 text-center min-w-[80px]">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatDuration(activity.duration, t)}
          </div>
        </div>

        {/* Category */}
        <div className="flex-shrink-0 min-w-[120px]">
          {getCategoryDisplay()}
        </div>

        {/* Tags */}
        <div className="flex-shrink-0 min-w-[150px]">
          {activity.tags && activity.tags.length > 0 ? (
            <TagDisplay tags={activity.tags} maxDisplay={2} size="sm" />
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">{t('common.noTags', 'No tags')}</span>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex-shrink-0 flex items-center gap-1">
            {(isHovered || selected) && (
              <>
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                    title={t('common.edit')}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                {onDuplicate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate();
                    }}
                    className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                    title={t('common.duplicate')}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Expand/Collapse Button */}
        {expandable && (
          <div className="flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand?.();
              }}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {expandable && isExpanded && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Source Type:</span>
              <span className="ml-2 text-gray-600 dark:text-gray-400 capitalize">
                {activity.sourceType}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Type:</span>
              <span className="ml-2 text-gray-600 dark:text-gray-400">{activity.type}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">End Time:</span>
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                {formatTime(activity.endTime)}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Editable:</span>
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                {activity.isEditable ? 'Yes' : 'No'}
              </span>
            </div>
            {activity.metadata && Object.keys(activity.metadata).length > 0 && (
              <div className="col-span-2">
                <span className="font-medium text-gray-700 dark:text-gray-300">Metadata:</span>
                <div className="mt-1 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                  <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                    {JSON.stringify(activity.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityRow;
