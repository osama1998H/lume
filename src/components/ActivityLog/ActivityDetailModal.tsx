import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Edit2, Copy, Trash2, Calendar, Clock, Tag, Folder } from 'lucide-react';
import type { UnifiedActivity } from '../../types';
import SourceTypeIcon from './SourceTypeIcon';
import ConflictBadge from './ConflictBadge';
import TagDisplay from '../ui/TagDisplay';
import { formatDuration } from '../../utils/format';

interface ActivityDetailModalProps {
  activity: UnifiedActivity;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  conflict?: {
    type: 'overlap' | 'duplicate' | 'gap';
    severity: 'low' | 'medium' | 'high';
  } | null;
}

/**
 * ActivityDetailModal
 * Modal for displaying full activity details
 */
const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  activity,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
  conflict = null,
}) => {
  const { t } = useTranslation();

  // Format date and time
  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle delete with confirmation
  const handleDelete = () => {
    if (window.confirm(t('activityLog.confirmDeleteSingle', 'Are you sure you want to delete this activity?'))) {
      onDelete?.();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <SourceTypeIcon sourceType={activity.sourceType} size="md" showBadge={false} />
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {activity.title}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <SourceTypeIcon sourceType={activity.sourceType} size="sm" showBadge={true} />
                {conflict && (
                  <ConflictBadge
                    conflictType={conflict.type}
                    severity={conflict.severity}
                    size="sm"
                  />
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
            aria-label={t('common.close', 'Close')}
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {/* Time Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Calendar className="w-4 h-4" />
                    {t('activityLog.date', 'Date')}
                  </div>
                  <p className="text-gray-900 dark:text-white">{formatDate(activity.startTime)}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Clock className="w-4 h-4" />
                    {t('activityLog.timeRange', 'Time Range')}
                  </div>
                  <p className="text-gray-900 dark:text-white">
                    {formatTime(activity.startTime)} - {formatTime(activity.endTime)}
                  </p>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('activityLog.duration', 'Duration')}
                </div>
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                  {formatDuration(activity.duration, t)}
                </p>
              </div>
            </div>

            {/* Category */}
            {activity.categoryName && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Folder className="w-4 h-4" />
                  {t('activityLog.category', 'Category')}
                </div>
                <div className="flex items-center gap-2">
                  {activity.categoryColor && (
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: activity.categoryColor }}
                    />
                  )}
                  <span className="text-gray-900 dark:text-white font-medium">
                    {activity.categoryName}
                  </span>
                </div>
              </div>
            )}

            {/* Tags */}
            {activity.tags && activity.tags.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Tag className="w-4 h-4" />
                  {t('activityLog.tags', 'Tags')}
                </div>
                <TagDisplay tags={activity.tags} maxVisible={10} size="md" />
              </div>
            )}

            {/* Description (for manual activities) */}
            {activity.type === 'manual' && activity.metadata?.description && (
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('activityLog.description', 'Description')}
                </div>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                  {activity.metadata.description}
                </p>
              </div>
            )}

            {/* Metadata (for automatic activities) */}
            {activity.sourceType === 'automatic' && activity.metadata && (
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('activityLog.details', 'Details')}
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2 text-sm">
                  {activity.metadata.appName && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('activityLog.application', 'Application')}:
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {activity.metadata.appName}
                      </span>
                    </div>
                  )}
                  {activity.metadata.windowTitle && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('activityLog.window', 'Window')}:
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white truncate max-w-xs">
                        {activity.metadata.windowTitle}
                      </span>
                    </div>
                  )}
                  {activity.metadata.domain && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('activityLog.domain', 'Domain')}:
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {activity.metadata.domain}
                      </span>
                    </div>
                  )}
                  {activity.metadata.url && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">URL:</span>
                      <a
                        href={activity.metadata.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary-600 dark:text-primary-400 hover:underline truncate max-w-xs"
                      >
                        {activity.metadata.url}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pomodoro Metadata */}
            {activity.sourceType === 'pomodoro' && activity.metadata && (
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('activityLog.pomodoroDetails', 'Pomodoro Details')}
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2 text-sm">
                  {activity.metadata.sessionType && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('activityLog.sessionType', 'Session Type')}:
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white capitalize">
                        {activity.metadata.sessionType}
                      </span>
                    </div>
                  )}
                  {activity.metadata.completed !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('activityLog.completed', 'Completed')}:
                      </span>
                      <span className={`font-medium ${
                        activity.metadata.completed
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {activity.metadata.completed ? t('common.yes', 'Yes') : t('common.no', 'No')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Additional Info */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('activityLog.type', 'Type')}:
                  </span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {activity.type}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('activityLog.editable', 'Editable')}:
                  </span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {activity.isEditable ? t('common.yes', 'Yes') : t('common.no', 'No')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {onEdit && activity.isEditable && (
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                <span className="text-sm font-medium">{t('common.edit', 'Edit')}</span>
              </button>
            )}
            {onDuplicate && (
              <button
                onClick={onDuplicate}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span className="text-sm font-medium">{t('common.duplicate', 'Duplicate')}</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onDelete && activity.isEditable && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-medium">{t('common.delete', 'Delete')}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors"
            >
              {t('common.close', 'Close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityDetailModal;
