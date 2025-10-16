import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useActivityLog } from '@/contexts/ActivityLogContext';
import ActivityRow from './ActivityRow';
import type { UnifiedActivity } from '@/types';

type SortField = 'startTime' | 'duration' | 'title' | 'categoryName';
type SortDirection = 'asc' | 'desc';
type GroupBy = 'none' | 'date' | 'type' | 'category';

interface ActivityListViewProps {
  onActivityClick?: (activity: UnifiedActivity) => void;
  onActivityEdit?: (activity: UnifiedActivity) => void;
  onActivityDelete?: (activity: UnifiedActivity) => void;
  onActivityDuplicate?: (activity: UnifiedActivity) => void;
  className?: string;
}

/**
 * ActivityListView
 * Virtualized list view for activities with sorting and grouping
 */
const ActivityListView: React.FC<ActivityListViewProps> = ({
  onActivityClick,
  onActivityEdit,
  onActivityDelete,
  onActivityDuplicate,
  className = '',
}) => {
  const { t } = useTranslation();
  const { activities, selectedActivities, toggleSelection, selectAll, clearSelection } =
    useActivityLog();

  // Local state
  const [sortField, setSortField] = useState<SortField>('startTime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());

  // Ref for virtualization
  const parentRef = useRef<HTMLDivElement>(null);

  // Toggle expand state for an activity
  const toggleExpand = (activityId: number, sourceType: string) => {
    const key = `${activityId}:${sourceType}`;
    setExpandedActivities((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort activities
  const sortedActivities = useMemo(() => {
    const sorted = [...activities].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'startTime':
          comparison = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
          break;
        case 'duration':
          comparison = a.duration - b.duration;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'categoryName':
          comparison = (a.categoryName || '').localeCompare(b.categoryName || '');
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [activities, sortField, sortDirection]);

  // Group activities
  const groupedActivities = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: '', activities: sortedActivities }];
    }

    const groups = new Map<string, UnifiedActivity[]>();

    sortedActivities.forEach((activity) => {
      let groupKey = '';

      switch (groupBy) {
        case 'date': {
          const date = new Date(activity.startTime);
          groupKey = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
          break;
        }
        case 'type':
          groupKey = activity.sourceType;
          break;
        case 'category':
          groupKey = activity.categoryName || 'uncategorized';
          break;
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(activity);
    });

    return Array.from(groups.entries()).map(([key, activities]) => ({
      key,
      label: key,
      activities,
    }));
  }, [sortedActivities, groupBy]);

  // Flatten for virtualization
  const flattenedItems = useMemo(() => {
    const items: Array<{ type: 'group' | 'activity'; data: any; index: number }> = [];
    let activityIndex = 0;

    groupedActivities.forEach((group) => {
      if (groupBy !== 'none') {
        items.push({ type: 'group', data: group, index: activityIndex });
      }

      group.activities.forEach((activity) => {
        items.push({ type: 'activity', data: activity, index: activityIndex });
        activityIndex++;
      });
    });

    return items;
  }, [groupedActivities, groupBy]);

  // Setup virtualizer with dynamic sizing based on expanded state
  const virtualizer = useVirtualizer({
    count: flattenedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = flattenedItems[index];

      // Guard against undefined
      if (!item) {
        return 72; // Default size
      }

      if (item.type === 'group') {
        return 48; // Group headers are 48px
      }
      // Check if this activity is expanded
      const activity = item.data as UnifiedActivity;
      const key = `${activity.id}:${activity.sourceType}`;
      const isExpanded = expandedActivities.has(key);
      // Calculate expanded height based on content
      // Base: 72px (main row) + 180px (details grid) + padding
      // If metadata exists, add significant extra height for JSON display
      const hasMetadata = activity.metadata && Object.keys(activity.metadata || {}).length > 0;
      const metadataKeys = hasMetadata ? Object.keys(activity.metadata || {}).length : 0;
      // Estimate ~30px per metadata line, plus base height
      const expandedHeight = hasMetadata ? 280 + (metadataKeys * 30) : 260;
      return isExpanded ? expandedHeight : 72;
    },
    overscan: 5,
  });

  // Remeasure when expanded state changes
  useEffect(() => {
    // Force a remeasurement after a short delay to ensure DOM has updated
    const timer = setTimeout(() => {
      virtualizer.measure();
    }, 0);
    return () => clearTimeout(timer);
  }, [expandedActivities, virtualizer]);

  // Check if all visible activities are selected
  const allSelected = activities.length > 0 && selectedActivities.size === activities.length;
  const someSelected = selectedActivities.size > 0 && !allSelected;

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-primary-600 dark:text-primary-400" />
    ) : (
      <ChevronDown className="w-4 h-4 text-primary-600 dark:text-primary-400" />
    );
  };

  // Column definitions
  const columns = [
    {
      id: 'title',
      label: t('activityLog.title', 'Title'),
      sortable: true,
      width: 'flex-1 min-w-0',
    },
    {
      id: 'startTime',
      label: t('activityLog.startTime', 'Start Time'),
      sortable: true,
      width: 'flex-shrink-0 w-32',
    },
    {
      id: 'duration',
      label: t('activityLog.duration', 'Duration'),
      sortable: true,
      width: 'flex-shrink-0 w-24',
    },
    {
      id: 'categoryName',
      label: t('activityLog.category', 'Category'),
      sortable: true,
      width: 'flex-shrink-0 w-32',
    },
    {
      id: 'tags',
      label: t('activityLog.tags', 'Tags'),
      sortable: false,
      width: 'flex-shrink-0 w-40',
    },
    {
      id: 'actions',
      label: '',
      sortable: false,
      width: 'flex-shrink-0 w-24',
    },
  ];

  return (
    <div className={`h-full flex flex-col bg-white dark:bg-gray-800 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
        {/* Group By */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('activityLog.groupBy', 'Group by:')}
          </label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="none">{t('common.none', 'None')}</option>
            <option value="date">{t('activityLog.date', 'Date')}</option>
            <option value="type">{t('activityLog.type', 'Type')}</option>
            <option value="category">{t('activityLog.category', 'Category')}</option>
          </select>
        </div>

        {/* Summary */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {t('activityLog.activityCount', { count: activities.length })}
          {selectedActivities.size > 0 && (
            <span className="ml-2 font-medium text-primary-600 dark:text-primary-400">
              ({selectedActivities.size} {t('activityLog.selected', 'selected')})
            </span>
          )}
        </div>
      </div>

      {/* Table Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        {/* Select All Checkbox */}
        <div className="flex-shrink-0">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(input) => {
              if (input) {
                input.indeterminate = someSelected;
              }
            }}
            onChange={() => {
              if (allSelected || someSelected) {
                clearSelection();
              } else {
                selectAll();
              }
            }}
            className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
          />
        </div>

        {/* Source Icon Column */}
        <div className="flex-shrink-0 w-10" />

        {/* Column Headers */}
        {columns.map((column) => (
          <div key={column.id} className={column.width}>
            {column.sortable ? (
              <button
                onClick={() => handleSort(column.id as SortField)}
                className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                {column.label}
                {renderSortIcon(column.id as SortField)}
              </button>
            ) : (
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                {column.label}
              </span>
            )}
          </div>
        ))}

        {/* Expand Column */}
        <div className="flex-shrink-0 w-10" />
      </div>

      {/* Virtualized List */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        {activities.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500 dark:text-gray-400">
              {t('activityLog.noActivities', 'No activities found')}
            </p>
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const item = flattenedItems[virtualItem.index];

              // Guard against undefined
              if (!item) {
                return null;
              }

              if (item.type === 'group') {
                return (
                  <div
                    key={virtualItem.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <div className="px-6 py-3 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {item.data.label}
                      </h3>
                    </div>
                  </div>
                );
              }

              const activity = item.data as UnifiedActivity;
              const activityKey = `${activity.id}:${activity.sourceType}`;
              const isSelected = selectedActivities.has(activityKey);
              const isExpanded = expandedActivities.has(activityKey);

              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <ActivityRow
                    activity={activity}
                    selected={isSelected}
                    onToggleSelection={() =>
                      toggleSelection({ id: activity.id, sourceType: activity.sourceType })
                    }
                    onClick={() => onActivityClick?.(activity)}
                    onEdit={() => onActivityEdit?.(activity)}
                    onDelete={() => onActivityDelete?.(activity)}
                    onDuplicate={() => onActivityDuplicate?.(activity)}
                    showCheckbox={true}
                    showActions={true}
                    expandable={true}
                    isExpanded={isExpanded}
                    onToggleExpand={() => toggleExpand(activity.id, activity.sourceType)}
                    conflict={null} // TODO: Add conflict detection
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityListView;
