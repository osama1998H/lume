import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Calendar, Clock, Plus, AlertTriangle } from 'lucide-react';
import type { Category, Tag } from '../../types';

interface ActivityCreateModalProps {
  categories: Category[];
  tags: Tag[];
  onClose: () => void;
  onCreate: (activity: NewActivityData) => Promise<void>;
  defaultDate?: Date;
  defaultCategory?: number | null;
}

export interface NewActivityData {
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  categoryId?: number;
  tagIds?: number[];
  description?: string;
}

/**
 * ActivityCreateModal
 * Modal for creating new manual time entries
 */
const ActivityCreateModal: React.FC<ActivityCreateModalProps> = ({
  categories,
  tags,
  onClose,
  onCreate,
  defaultDate,
  defaultCategory,
}) => {
  const { t } = useTranslation();

  // Initialize with current date/time
  const now = defaultDate || new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Form state
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(toLocalDateString(oneHourAgo));
  const [startTime, setStartTime] = useState(toLocalTimeString(oneHourAgo));
  const [endDate, setEndDate] = useState(toLocalDateString(now));
  const [endTime, setEndTime] = useState(toLocalTimeString(now));
  const [categoryId, setCategoryId] = useState<number | null>(defaultCategory || null);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);

  // Helper: Convert Date to YYYY-MM-DD
  function toLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Helper: Convert Date to HH:MM
  function toLocalTimeString(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // Helper: Combine date and time strings to Date
  // Explicitly constructs Date in local timezone to avoid ambiguity
  function combineDateTime(dateStr: string, timeStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  }

  // Helper: Format duration for display
  function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  // Calculate duration
  const [calculatedDuration, setCalculatedDuration] = useState<number>(0);
  useEffect(() => {
    try {
      const start = combineDateTime(startDate, startTime);
      const end = combineDateTime(endDate, endTime);
      const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
      setCalculatedDuration(duration > 0 ? duration : 0);
    } catch {
      setCalculatedDuration(0);
    }
  }, [startDate, startTime, endDate, endTime]);

  // Check for overlaps when time changes (disabled for now - backend will validate)
  useEffect(() => {
    // Overlap checking removed - backend validation will catch conflicts
    // Future: Implement using getActivityConflicts if needed
    setOverlapWarning(null);
  }, [startDate, startTime, endDate, endTime]);

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = t('activityLog.errors.titleRequired', 'Title is required');
    }

    if (title.trim().length > 200) {
      newErrors.title = t('activityLog.errors.titleTooLong', 'Title is too long (max 200 characters)');
    }

    if (!startDate || !startTime) {
      newErrors.startTime = t('activityLog.errors.startTimeRequired', 'Start time is required');
    }

    if (!endDate || !endTime) {
      newErrors.endTime = t('activityLog.errors.endTimeRequired', 'End time is required');
    }

    const start = combineDateTime(startDate, startTime);
    const end = combineDateTime(endDate, endTime);

    if (start >= end) {
      newErrors.endTime = t('activityLog.errors.endTimeAfterStart', 'End time must be after start time');
    }

    // Check if duration is too short (less than 1 minute)
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    if (duration < 60) {
      newErrors.endTime = t(
        'activityLog.errors.durationTooShort',
        'Duration must be at least 1 minute'
      );
    }

    // Check if activity is in the future
    if (end > new Date()) {
      newErrors.endTime = t(
        'activityLog.errors.futureTime',
        'Cannot create activities in the future'
      );
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle create
  const handleCreate = async () => {
    if (!validate()) return;

    setIsCreating(true);
    try {
      const start = combineDateTime(startDate, startTime);
      const end = combineDateTime(endDate, endTime);
      const duration = Math.floor((end.getTime() - start.getTime()) / 1000);

      const newActivity: NewActivityData = {
        title: title.trim(),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        duration,
        categoryId: categoryId || undefined,
        tagIds: selectedTags.length > 0 ? selectedTags : undefined,
        description: description.trim() || undefined,
      };

      await onCreate(newActivity);
      onClose();
    } catch (error) {
      console.error('Failed to create activity:', error);
      setErrors({
        save: t('activityLog.errors.createFailed', 'Failed to create activity'),
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle tag toggle
  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  // Quick time presets
  const applyQuickTime = (preset: 'now' | 'last-hour' | 'last-30min') => {
    const now = new Date();
    let start: Date;

    switch (preset) {
      case 'now':
        start = new Date(now.getTime() - 15 * 60 * 1000); // 15 min ago
        break;
      case 'last-hour':
        start = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
        break;
      case 'last-30min':
        start = new Date(now.getTime() - 30 * 60 * 1000); // 30 min ago
        break;
    }

    setStartDate(toLocalDateString(start));
    setStartTime(toLocalTimeString(start));
    setEndDate(toLocalDateString(now));
    setEndTime(toLocalTimeString(now));
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Plus className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('activityLog.createActivity', 'Create Activity')}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('activityLog.createActivitySubtitle', 'Add a new manual time entry')}
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
          <div className="space-y-4">
            {/* Quick Time Presets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('activityLog.quickPresets', 'Quick Presets')}
              </label>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => applyQuickTime('last-30min')}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors"
                >
                  {t('activityLog.last30min', 'Last 30 min')}
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickTime('last-hour')}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors"
                >
                  {t('activityLog.lastHour', 'Last hour')}
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickTime('now')}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors"
                >
                  {t('activityLog.last15min', 'Last 15 min')}
                </button>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('activityLog.title', 'Title')} *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.title
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent`}
                placeholder={t('activityLog.enterTitle', 'Enter activity title')}
                autoFocus
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
              )}
            </div>

            {/* Start Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  {t('activityLog.startDate', 'Start Date')} *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    errors.startTime
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Clock className="w-4 h-4 inline mr-1" />
                  {t('activityLog.startTime', 'Start Time')} *
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    errors.startTime
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent`}
                />
              </div>
            </div>
            {errors.startTime && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.startTime}</p>
            )}

            {/* End Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  {t('activityLog.endDate', 'End Date')} *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    errors.endTime
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Clock className="w-4 h-4 inline mr-1" />
                  {t('activityLog.endTime', 'End Time')} *
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    errors.endTime
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent`}
                />
              </div>
            </div>
            {errors.endTime && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.endTime}</p>
            )}

            {/* Duration Display */}
            {calculatedDuration > 0 && (
              <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                <p className="text-sm text-primary-700 dark:text-primary-400">
                  <strong>{t('activityLog.duration', 'Duration')}:</strong>{' '}
                  {formatDuration(calculatedDuration)}
                </p>
              </div>
            )}

            {/* Overlap Warning */}
            {overlapWarning && (
              <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800 dark:text-yellow-300">{overlapWarning}</p>
              </div>
            )}

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('activityLog.category', 'Category')}
              </label>
              <select
                value={categoryId || ''}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">{t('common.none', 'None')}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('activityLog.tags', 'Tags')}
              </label>
              <div className="flex flex-wrap gap-2">
                {tags.filter(tag => tag.id != null).map((tag) => {
                  const isSelected = selectedTags.includes(tag.id!);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id!)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        isSelected
                          ? 'ring-2 ring-offset-2 ring-primary-500 dark:ring-offset-gray-800'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: tag.color, color: '#fff' }}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('activityLog.description', 'Description')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                placeholder={t('activityLog.enterDescription', 'Enter activity description')}
              />
            </div>

            {/* Save Error */}
            {errors.save && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700">
                <p className="text-sm text-red-600 dark:text-red-400">{errors.save}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isCreating}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !title.trim() || calculatedDuration === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t('common.creating', 'Creating')}...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{t('common.create', 'Create')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityCreateModal;
