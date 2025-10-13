import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, GitMerge, Clock, Trash2, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { UnifiedActivity } from '../../../types';
import SourceTypeIcon from './SourceTypeIcon';
import { formatDuration } from '../../../utils/format';

interface ConflictData {
  type: 'overlap' | 'duplicate' | 'gap';
  severity: 'low' | 'medium' | 'high';
  activities: UnifiedActivity[];
  description?: string;
}

interface ConflictResolutionModalProps {
  conflicts: ConflictData[];
  onClose: () => void;
  onResolve: (
    conflictIndex: number,
    resolution: ResolutionAction,
    data?: any
  ) => Promise<void>;
}

type ResolutionAction = 'merge' | 'split' | 'adjust' | 'delete' | 'keep_both' | 'fill_gap' | 'ignore';

/**
 * ConflictResolutionModal
 * Wizard for visually resolving activity conflicts (overlaps, duplicates, gaps)
 */
const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  conflicts,
  onClose,
  onResolve,
}) => {
  const { t } = useTranslation();

  // Current conflict index
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedResolution, setSelectedResolution] = useState<ResolutionAction | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected activity for "delete one" option
  const [activityToDelete, setActivityToDelete] = useState<number | null>(null);

  const currentConflict = conflicts[currentIndex];
  const hasNext = currentIndex < conflicts.length - 1;
  const hasPrev = currentIndex > 0;

  // Format time for display
  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Get resolution options based on conflict type
  const getResolutionOptions = (conflictType: 'overlap' | 'duplicate' | 'gap') => {
    switch (conflictType) {
      case 'overlap':
        return [
          {
            id: 'merge' as ResolutionAction,
            label: t('activityLog.mergeActivities', 'Merge Activities'),
            description: t('activityLog.mergeDescription', 'Combine into one activity'),
            icon: GitMerge,
            color: 'green',
          },
          {
            id: 'adjust' as ResolutionAction,
            label: t('activityLog.adjustTimes', 'Adjust Times'),
            description: t('activityLog.adjustDescription', 'Automatically adjust overlapping times'),
            icon: Clock,
            color: 'blue',
          },
          {
            id: 'delete' as ResolutionAction,
            label: t('activityLog.deleteOne', 'Delete One'),
            description: t('activityLog.deleteOneDescription', 'Remove one of the activities'),
            icon: Trash2,
            color: 'red',
          },
          {
            id: 'ignore' as ResolutionAction,
            label: t('activityLog.ignore', 'Ignore'),
            description: t('activityLog.ignoreDescription', 'Keep both as-is'),
            icon: X,
            color: 'gray',
          },
        ];
      case 'duplicate':
        return [
          {
            id: 'merge' as ResolutionAction,
            label: t('activityLog.merge', 'Merge'),
            description: t('activityLog.mergeDuplicates', 'Combine duplicate activities'),
            icon: GitMerge,
            color: 'green',
          },
          {
            id: 'keep_both' as ResolutionAction,
            label: t('activityLog.keepBoth', 'Keep Both'),
            description: t('activityLog.keepBothDescription', 'They are actually different'),
            icon: CheckCircle,
            color: 'blue',
          },
          {
            id: 'delete' as ResolutionAction,
            label: t('activityLog.deleteOne', 'Delete One'),
            description: t('activityLog.deleteDuplicate', 'Remove duplicate'),
            icon: Trash2,
            color: 'red',
          },
        ];
      case 'gap':
        return [
          {
            id: 'fill_gap' as ResolutionAction,
            label: t('activityLog.fillGap', 'Fill Gap'),
            description: t('activityLog.fillGapDescription', 'Create activity to fill the time gap'),
            icon: Clock,
            color: 'green',
          },
          {
            id: 'ignore' as ResolutionAction,
            label: t('activityLog.ignore', 'Ignore'),
            description: t('activityLog.ignoreGap', 'Leave gap as-is'),
            icon: X,
            color: 'gray',
          },
        ];
    }
  };

  const resolutionOptions = getResolutionOptions(currentConflict.type);

  // Calculate visual timeline positions
  const getActivityPosition = (activity: UnifiedActivity) => {
    const allActivities = currentConflict.activities;
    const startTimes = allActivities.map((a) => new Date(a.startTime).getTime());
    const endTimes = allActivities.map((a) => new Date(a.endTime).getTime());
    const minTime = Math.min(...startTimes);
    const maxTime = Math.max(...endTimes);
    const totalDuration = maxTime - minTime;

    // Guard against division by zero when all activities have same start/end time
    if (totalDuration === 0) {
      return { left: '0%', width: '100%' };
    }

    const activityStart = new Date(activity.startTime).getTime();
    const activityEnd = new Date(activity.endTime).getTime();

    const left = ((activityStart - minTime) / totalDuration) * 100;
    const width = ((activityEnd - activityStart) / totalDuration) * 100;

    return { left: `${left}%`, width: `${width}%` };
  };

  // Get severity color
  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low':
        return 'yellow';
      case 'medium':
        return 'orange';
      case 'high':
        return 'red';
    }
  };

  const severityColor = getSeverityColor(currentConflict.severity);

  // Handle resolution
  const handleResolve = async () => {
    if (!selectedResolution) return;

    // Validate delete option
    if (selectedResolution === 'delete' && activityToDelete === null) {
      setError(t('activityLog.errors.selectActivityToDelete', 'Please select which activity to delete'));
      return;
    }

    setIsResolving(true);
    setError(null);

    try {
      const data = selectedResolution === 'delete' ? { deleteId: activityToDelete } : undefined;
      await onResolve(currentIndex, selectedResolution, data);

      // Move to next conflict or close if done
      if (hasNext) {
        setCurrentIndex(currentIndex + 1);
        setSelectedResolution(null);
        setActivityToDelete(null);
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Failed to resolve conflict:', err);
      setError(t('activityLog.errors.resolutionFailed', 'Failed to resolve conflict'));
    } finally {
      setIsResolving(false);
    }
  };

  // Navigate conflicts
  const handleNext = () => {
    if (hasNext) {
      setCurrentIndex(currentIndex + 1);
      setSelectedResolution(null);
      setActivityToDelete(null);
      setError(null);
    }
  };

  const handlePrev = () => {
    if (hasPrev) {
      setCurrentIndex(currentIndex - 1);
      setSelectedResolution(null);
      setActivityToDelete(null);
      setError(null);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-${severityColor}-100 dark:bg-${severityColor}-900/30 rounded-lg`}>
              <AlertTriangle className={`w-5 h-5 text-${severityColor}-600 dark:text-${severityColor}-400`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('activityLog.conflictResolution', 'Resolve Conflict')}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t(
                  'activityLog.conflictProgress',
                  `Conflict ${currentIndex + 1} of ${conflicts.length}`
                )}
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
          <div className="space-y-6">
            {/* Conflict Info */}
            <div className={`p-4 rounded-lg bg-${severityColor}-50 dark:bg-${severityColor}-900/20 border border-${severityColor}-200 dark:border-${severityColor}-800`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-5 h-5 text-${severityColor}-600 dark:text-${severityColor}-400 flex-shrink-0 mt-0.5`} />
                <div>
                  <h3 className={`text-sm font-semibold text-${severityColor}-900 dark:text-${severityColor}-200`}>
                    {currentConflict.type === 'overlap' && t('activityLog.overlapDetected', 'Time Overlap Detected')}
                    {currentConflict.type === 'duplicate' && t('activityLog.duplicateDetected', 'Duplicate Activities')}
                    {currentConflict.type === 'gap' && t('activityLog.gapDetected', 'Time Gap Detected')}
                  </h3>
                  <p className={`text-xs text-${severityColor}-800 dark:text-${severityColor}-300 mt-1`}>
                    {currentConflict.description ||
                      t('activityLog.conflictDefaultDescription', 'These activities have conflicting time ranges')}
                  </p>
                </div>
              </div>
            </div>

            {/* Visual Timeline */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                {t('activityLog.conflictingActivities', 'Conflicting Activities')}
              </h3>
              <div className="space-y-4">
                {currentConflict.activities.map((activity, _idx) => {
                  const position = getActivityPosition(activity);
                  const isSelectedForDeletion = activityToDelete === activity.id;

                  return (
                    <div key={`${activity.id}-${activity.sourceType}`} className="relative">
                      {/* Activity Info */}
                      <div className="flex items-center gap-3 mb-2">
                        <SourceTypeIcon sourceType={activity.sourceType} size="sm" showBadge={false} />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {activity.title}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {formatDate(activity.startTime)} {formatTime(activity.startTime)} -{' '}
                            {formatTime(activity.endTime)} ({formatDuration(activity.duration, t)})
                          </p>
                        </div>
                        {selectedResolution === 'delete' && activity.isEditable && (
                          <button
                            onClick={() => setActivityToDelete(activity.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              isSelectedForDeletion
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {isSelectedForDeletion
                              ? t('activityLog.selected', 'Selected')
                              : t('activityLog.selectToDelete', 'Select')}
                          </button>
                        )}
                      </div>

                      {/* Visual Timeline Bar */}
                      <div className="relative h-10 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                        <div
                          className={`absolute top-0 bottom-0 rounded-lg transition-all ${
                            isSelectedForDeletion
                              ? 'bg-red-500 opacity-50'
                              : `bg-gradient-to-r from-${activity.categoryColor || 'primary-500'} to-${
                                  activity.categoryColor || 'primary-600'
                                }`
                          }`}
                          style={position}
                        >
                          <div className="h-full flex items-center justify-center text-white text-xs font-medium px-2">
                            <span className="truncate">{activity.title}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resolution Options */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                {t('activityLog.resolutionOptions', 'How would you like to resolve this?')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {resolutionOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedResolution === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setSelectedResolution(option.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? `border-${option.color}-500 bg-${option.color}-50 dark:bg-${option.color}-900/30`
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg bg-${option.color}-100 dark:bg-${option.color}-900/50`}>
                          <Icon className={`w-5 h-5 text-${option.color}-600 dark:text-${option.color}-400`} />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {option.label}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={!hasPrev || isResolving}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm font-medium">{t('common.previous', 'Previous')}</span>
            </button>
            <button
              onClick={handleNext}
              disabled={!hasNext || isResolving}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-sm font-medium">{t('common.next', 'Next')}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isResolving}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              onClick={handleResolve}
              disabled={isResolving || !selectedResolution}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isResolving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t('activityLog.resolving', 'Resolving')}...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    {hasNext
                      ? t('activityLog.resolveAndNext', 'Resolve & Next')
                      : t('activityLog.resolve', 'Resolve')}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConflictResolutionModal;
