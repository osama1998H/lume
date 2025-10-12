import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Calendar, Clock } from 'lucide-react';
import type { UnifiedActivity, Category, Tag } from '../../types';

interface ActivityEditModalProps {
  activity: UnifiedActivity;
  categories: Category[];
  tags: Tag[];
  onClose: () => void;
  onSave: (updated: Partial<UnifiedActivity>) => Promise<void>;
}

/**
 * ActivityEditModal
 * Modal for editing activity details
 */
const ActivityEditModal: React.FC<ActivityEditModalProps> = ({
  activity,
  categories,
  tags,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();

  // Form state
  const [title, setTitle] = useState(activity.title);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(activity.categoryId || null);
  const [selectedTags, setSelectedTags] = useState<number[]>(
    activity.tags?.map(t => t.id).filter((id): id is number => id !== undefined) || []
  );
  // Note: Description is not currently supported in UnifiedActivityMetadata interface
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize date/time fields
  useEffect(() => {
    const start = new Date(activity.startTime);
    const end = new Date(activity.endTime);

    setStartDate(toLocalDateString(start));
    setStartTime(toLocalTimeString(start));
    setEndDate(toLocalDateString(end));
    setEndTime(toLocalTimeString(end));
  }, [activity]);

  // Helper: Convert Date to YYYY-MM-DD
  const toLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper: Convert Date to HH:MM
  const toLocalTimeString = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Helper: Combine date and time strings to Date
  // Explicitly constructs Date in local timezone to avoid ambiguity
  const combineDateTime = (dateStr: string, timeStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  };

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = t('activityLog.errors.titleRequired', 'Title is required');
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const start = combineDateTime(startDate, startTime);
      const end = combineDateTime(endDate, endTime);
      const duration = Math.floor((end.getTime() - start.getTime()) / 1000);

      const updates: Partial<UnifiedActivity> = {
        title: title.trim(),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        duration,
        categoryId: categoryId || undefined,
        // Include tags if changed - construct Tag objects from selected IDs
        tags: selectedTags.length > 0
          ? tags.filter(tag => tag.id && selectedTags.includes(tag.id))
          : undefined,
        // Note: Description is not part of metadata in the current interface
      };

      await onSave(updates);
      onClose();
    } catch (error) {
      console.error('Failed to save activity:', error);
      setErrors({
        save: t('activityLog.errors.saveFailed', 'Failed to save activity'),
      });
    } finally {
      setIsSaving(false);
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
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('activityLog.editActivity', 'Edit Activity')}
          </h2>
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

            {/* Description (for manual activities) */}
            {activity.sourceType === 'manual' && (
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
            )}

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
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t('common.saving', 'Saving')}...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{t('common.save', 'Save')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityEditModal;
