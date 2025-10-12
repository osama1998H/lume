import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, FolderOpen, Tags, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import type { UnifiedActivity, Category, Tag } from '../../types';

interface BulkActionsModalProps {
  selectedActivities: UnifiedActivity[];
  categories: Category[];
  tags: Tag[];
  onClose: () => void;
  onBulkUpdate: (updates: BulkUpdateData) => Promise<void>;
}

export interface BulkUpdateData {
  activityIds: Array<{ id: number; sourceType: 'manual' | 'automatic' | 'pomodoro' }>;
  categoryId?: number | null;
  addTagIds?: number[];
  removeTagIds?: number[];
}

type TabType = 'category' | 'addTags' | 'removeTags';

/**
 * BulkActionsModal
 * Modal for batch editing categories and tags for multiple activities
 */
const BulkActionsModal: React.FC<BulkActionsModalProps> = ({
  selectedActivities,
  categories,
  tags,
  onClose,
  onBulkUpdate,
}) => {
  const { t } = useTranslation();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('category');

  // Form state
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [categoryMode, setCategoryMode] = useState<'all' | 'without'>('all');
  const [selectedTagsToAdd, setSelectedTagsToAdd] = useState<number[]>([]);
  const [selectedTagsToRemove, setSelectedTagsToRemove] = useState<number[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filter editable activities
  const editableActivities = useMemo(
    () => selectedActivities.filter((a) => a.isEditable),
    [selectedActivities]
  );

  const nonEditableCount = selectedActivities.length - editableActivities.length;

  // Get activities affected by category change
  const activitiesAffectedByCategory = useMemo(() => {
    if (categoryMode === 'without') {
      return editableActivities.filter((a) => !a.categoryId);
    }
    return editableActivities;
  }, [editableActivities, categoryMode]);

  // Get all unique tags used in selection
  const tagsInSelection = useMemo(() => {
    const tagMap = new Map<number, Tag>();
    editableActivities.forEach((activity) => {
      activity.tags?.forEach((tag) => {
        if (!tagMap.has(tag.id)) {
          tagMap.set(tag.id, tag);
        }
      });
    });
    return Array.from(tagMap.values());
  }, [editableActivities]);

  // Tabs configuration
  const tabs = [
    {
      id: 'category' as TabType,
      label: t('activityLog.assignCategory', 'Assign Category'),
      icon: FolderOpen,
      color: 'purple',
    },
    {
      id: 'addTags' as TabType,
      label: t('activityLog.addTags', 'Add Tags'),
      icon: Tags,
      color: 'indigo',
    },
    {
      id: 'removeTags' as TabType,
      label: t('activityLog.removeTags', 'Remove Tags'),
      icon: Trash2,
      color: 'red',
    },
  ];

  // Handle tag toggle
  const toggleTagToAdd = (tagId: number) => {
    setSelectedTagsToAdd((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const toggleTagToRemove = (tagId: number) => {
    setSelectedTagsToRemove((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (activeTab === 'category' && selectedCategoryId === null) {
      newErrors.category = t('activityLog.errors.selectCategory', 'Please select a category');
    }

    if (activeTab === 'addTags' && selectedTagsToAdd.length === 0) {
      newErrors.addTags = t('activityLog.errors.selectTags', 'Please select at least one tag');
    }

    if (activeTab === 'removeTags' && selectedTagsToRemove.length === 0) {
      newErrors.removeTags = t('activityLog.errors.selectTags', 'Please select at least one tag');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle apply
  const handleApply = async () => {
    if (!validate()) return;

    setIsApplying(true);
    try {
      let affectedActivities: UnifiedActivity[];

      switch (activeTab) {
        case 'category':
          affectedActivities = activitiesAffectedByCategory;
          break;
        case 'addTags':
        case 'removeTags':
          affectedActivities = editableActivities;
          break;
      }

      const updates: BulkUpdateData = {
        activityIds: affectedActivities.map((a) => ({ id: a.id, sourceType: a.sourceType })),
      };

      if (activeTab === 'category') {
        updates.categoryId = selectedCategoryId;
      } else if (activeTab === 'addTags') {
        updates.addTagIds = selectedTagsToAdd;
      } else if (activeTab === 'removeTags') {
        updates.removeTagIds = selectedTagsToRemove;
      }

      await onBulkUpdate(updates);
      onClose();
    } catch (error) {
      console.error('Failed to apply bulk changes:', error);
      setErrors({
        apply: t('activityLog.errors.bulkUpdateFailed', 'Failed to apply changes'),
      });
    } finally {
      setIsApplying(false);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Get affected count for current tab
  const getAffectedCount = (): number => {
    switch (activeTab) {
      case 'category':
        return activitiesAffectedByCategory.length;
      case 'addTags':
      case 'removeTags':
        return editableActivities.length;
      default:
        return 0;
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('activityLog.bulkActions', 'Bulk Actions')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t(
                'activityLog.bulkActionsSubtitle',
                `${editableActivities.length} ${
                  editableActivities.length === 1 ? 'activity' : 'activities'
                } selected`
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={t('common.close', 'Close')}
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Warning for non-editable activities */}
        {nonEditableCount > 0 && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                {t('activityLog.nonEditableWarning', 'Warning')}
              </p>
              <p className="text-xs text-yellow-800 dark:text-yellow-300 mt-1">
                {t(
                  'activityLog.nonEditableCount',
                  `${nonEditableCount} ${
                    nonEditableCount === 1 ? 'activity' : 'activities'
                  } cannot be edited and will be skipped.`
                )}
              </p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6">
          <div className="flex gap-1 -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 rounded-t-lg transition-all
                    ${
                      isActive
                        ? `bg-${tab.color}-50 dark:bg-${tab.color}-900/30 text-${tab.color}-700 dark:text-${tab.color}-400 border-b-2 border-${tab.color}-600`
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Category Tab */}
          {activeTab === 'category' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('activityLog.selectCategory', 'Select Category')} *
                </label>
                <select
                  value={selectedCategoryId || ''}
                  onChange={(e) =>
                    setSelectedCategoryId(e.target.value ? Number(e.target.value) : null)
                  }
                  className={`w-full px-3 py-2 rounded-lg border ${
                    errors.category
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent`}
                >
                  <option value="">{t('common.selectOne', 'Select one...')}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('activityLog.applyTo', 'Apply to')}
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="categoryMode"
                      checked={categoryMode === 'all'}
                      onChange={() => setCategoryMode('all')}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {t('activityLog.allActivities', 'All selected activities')} (
                      {editableActivities.length})
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="categoryMode"
                      checked={categoryMode === 'without'}
                      onChange={() => setCategoryMode('without')}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {t('activityLog.onlyWithoutCategory', 'Only activities without a category')}{' '}
                      ({editableActivities.filter((a) => !a.categoryId).length})
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Add Tags Tab */}
          {activeTab === 'addTags' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('activityLog.selectTagsToAdd', 'Select tags to add')} *
                </label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const isSelected = selectedTagsToAdd.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTagToAdd(tag.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          isSelected
                            ? 'ring-2 ring-offset-2 ring-primary-500 dark:ring-offset-gray-800 scale-105'
                            : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: tag.color, color: '#fff' }}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
                {errors.addTags && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.addTags}</p>
                )}
              </div>

              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  <strong>{t('common.note', 'Note')}:</strong>{' '}
                  {t(
                    'activityLog.addTagsNote',
                    'Selected tags will be added to all activities. Existing tags will be preserved.'
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Remove Tags Tab */}
          {activeTab === 'removeTags' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('activityLog.selectTagsToRemove', 'Select tags to remove')} *
                </label>
                {tagsInSelection.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {tagsInSelection.map((tag) => {
                      const isSelected = selectedTagsToRemove.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTagToRemove(tag.id)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                            isSelected
                              ? 'ring-2 ring-offset-2 ring-red-500 dark:ring-offset-gray-800 scale-105'
                              : 'opacity-60 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: tag.color, color: '#fff' }}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                    {t('activityLog.noTagsInSelection', 'No tags found in selected activities.')}
                  </p>
                )}
                {errors.removeTags && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {errors.removeTags}
                  </p>
                )}
              </div>

              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-400">
                  <strong>{t('common.warning', 'Warning')}:</strong>{' '}
                  {t(
                    'activityLog.removeTagsWarning',
                    'Selected tags will be removed from all activities that have them.'
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="mt-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('activityLog.preview', 'Preview')}
              </h3>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {t(
                'activityLog.activitiesWillBeAffected',
                `${getAffectedCount()} ${
                  getAffectedCount() === 1 ? 'activity' : 'activities'
                } will be affected by this change.`
              )}
            </p>
          </div>

          {/* Apply Error */}
          {errors.apply && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.apply}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isApplying}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleApply}
            disabled={isApplying || getAffectedCount() === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isApplying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t('common.applying', 'Applying')}...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{t('common.apply', 'Apply Changes')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkActionsModal;
