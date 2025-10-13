import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, GitMerge, AlertTriangle, Check } from 'lucide-react';
import type { UnifiedActivity } from '../../../types';
import SourceTypeIcon from './SourceTypeIcon';
import { formatDuration } from '../../../utils/format';

interface SelectedActivity {
  id: number;
  sourceType: 'manual' | 'automatic' | 'pomodoro';
}

interface MergeActivitiesModalProps {
  activities: SelectedActivity[];
  allActivities: UnifiedActivity[];
  onClose: () => void;
  onMerge: (mergedActivity: Partial<UnifiedActivity>) => Promise<void>;
}

/**
 * MergeActivitiesModal
 * Modal for merging multiple activities into one
 */
const MergeActivitiesModal: React.FC<MergeActivitiesModalProps> = ({
  activities,
  allActivities,
  onClose,
  onMerge,
}) => {
  const { t } = useTranslation();

  // Get full activity objects
  const selectedActivities = useMemo(() => {
    return activities
      .map(({ id, sourceType }) =>
        allActivities.find((a) => a.id === id && a.sourceType === sourceType)
      )
      .filter((a): a is UnifiedActivity => a !== undefined)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [activities, allActivities]);

  // State
  const [primaryActivityId, setPrimaryActivityId] = useState<number | null>(
    selectedActivities[0]?.id || null
  );
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get primary activity
  const primaryActivity = selectedActivities.find((a) => a.id === primaryActivityId);

  // Calculate merged time range
  const mergedTimeRange = useMemo(() => {
    if (selectedActivities.length === 0) return null;

    const startTimes = selectedActivities.map((a) => new Date(a.startTime).getTime());
    const endTimes = selectedActivities.map((a) => new Date(a.endTime).getTime());

    const earliestStart = Math.min(...startTimes);
    const latestEnd = Math.max(...endTimes);

    return {
      startTime: new Date(earliestStart).toISOString(),
      endTime: new Date(latestEnd).toISOString(),
      duration: Math.floor((latestEnd - earliestStart) / 1000),
    };
  }, [selectedActivities]);

  // Merge tags from all activities
  const mergedTags = useMemo(() => {
    const tagMap = new Map();
    selectedActivities.forEach((activity) => {
      activity.tags?.forEach((tag) => {
        if (!tagMap.has(tag.id)) {
          tagMap.set(tag.id, tag);
        }
      });
    });
    return Array.from(tagMap.values());
  }, [selectedActivities]);

  // Format date/time
  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Handle merge
  const handleMerge = async () => {
    if (!primaryActivity || !mergedTimeRange) {
      setError(t('activityLog.errors.selectPrimary', 'Please select a primary activity'));
      return;
    }

    setIsMerging(true);
    setError(null);

    try {
      const mergedActivity: Partial<UnifiedActivity> = {
        title: primaryActivity.title,
        startTime: mergedTimeRange.startTime,
        endTime: mergedTimeRange.endTime,
        duration: mergedTimeRange.duration,
        categoryId: primaryActivity.categoryId,
        categoryName: primaryActivity.categoryName,
        categoryColor: primaryActivity.categoryColor,
        tags: mergedTags,
        metadata: primaryActivity.metadata,
      };

      await onMerge(mergedActivity);
      onClose();
    } catch (err) {
      console.error('Failed to merge activities:', err);
      setError(t('activityLog.errors.mergeFailed', 'Failed to merge activities'));
    } finally {
      setIsMerging(false);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Validation
  const hasConflicts = selectedActivities.some((activity) => !activity.isEditable);

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <GitMerge className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('activityLog.mergeActivities', 'Merge Activities')}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('activityLog.mergeSubtitle', { count: selectedActivities.length })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={t('common.close', 'Close')}
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Warning for non-editable activities */}
          {hasConflicts && (
            <div className="mb-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                  {t('activityLog.mergeWarning', 'Warning')}
                </p>
                <p className="text-xs text-yellow-800 dark:text-yellow-300 mt-1">
                  {t(
                    'activityLog.mergeNonEditableWarning',
                    'Some activities cannot be edited. The merge will only include editable activities.'
                  )}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Step 1: Select Primary Activity */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                {t('activityLog.selectPrimary', '1. Select Primary Activity')}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                {t(
                  'activityLog.selectPrimaryDescription',
                  'The primary activity will provide the title, category, and other metadata for the merged activity.'
                )}
              </p>
              <div className="space-y-2">
                {selectedActivities.map((activity) => {
                  const isPrimary = activity.id === primaryActivityId;
                  return (
                    <button
                      key={`${activity.id}-${activity.sourceType}`}
                      onClick={() => setPrimaryActivityId(activity.id)}
                      disabled={!activity.isEditable}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isPrimary
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      } ${!activity.isEditable ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <SourceTypeIcon
                            sourceType={activity.sourceType}
                            size="sm"
                            showBadge={false}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {activity.title}
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {formatDateTime(activity.startTime)} -{' '}
                              {formatDateTime(activity.endTime)}
                              <span className="ml-2 font-medium text-primary-600 dark:text-primary-400">
                                ({formatDuration(activity.duration, t)})
                              </span>
                            </p>
                            {activity.categoryName && (
                              <div className="flex items-center gap-2 mt-1">
                                {activity.categoryColor && (
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: activity.categoryColor }}
                                  />
                                )}
                                <span className="text-xs text-gray-700 dark:text-gray-300">
                                  {activity.categoryName}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        {isPrimary && (
                          <div className="flex-shrink-0 p-1 bg-primary-600 rounded-full">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Preview Merged Activity */}
            {primaryActivity && mergedTimeRange && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  {t('activityLog.mergePreview', '2. Merged Activity Preview')}
                </h3>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {t('activityLog.title', 'Title')}:
                      </span>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                        {primaryActivity.title}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {t('activityLog.timeRange', 'Time Range')}:
                      </span>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                        {formatDateTime(mergedTimeRange.startTime)} -{' '}
                        {formatDateTime(mergedTimeRange.endTime)}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {t('activityLog.totalDuration', 'Total Duration')}:
                      </span>
                      <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mt-0.5">
                        {formatDuration(mergedTimeRange.duration, t)}
                      </p>
                    </div>
                    {primaryActivity.categoryName && (
                      <div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {t('activityLog.category', 'Category')}:
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          {primaryActivity.categoryColor && (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: primaryActivity.categoryColor }}
                            />
                          )}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {primaryActivity.categoryName}
                          </span>
                        </div>
                      </div>
                    )}
                    {mergedTags.length > 0 && (
                      <div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {t('activityLog.tags', 'Tags')}:
                        </span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {mergedTags.map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: tag.color }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isMerging}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleMerge}
            disabled={isMerging || !primaryActivityId}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isMerging ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t('activityLog.merging', 'Merging')}...</span>
              </>
            ) : (
              <>
                <GitMerge className="w-4 h-4" />
                <span>{t('activityLog.merge', 'Merge')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MergeActivitiesModal;
