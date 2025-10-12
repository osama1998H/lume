import React from 'react';
import { X, Trash2, Edit2, GitMerge, FolderOpen, Tags } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

interface BulkActionToolbarProps {
  selectionCount: number;
  onClearSelection: () => void;
  onDelete?: () => void;
  onMerge?: () => void;
  onBulkEdit?: () => void;
  onAssignCategory?: () => void;
  onAssignTags?: () => void;
  className?: string;
}

/**
 * BulkActionToolbar
 * Floating toolbar shown when multiple activities are selected
 */
const BulkActionToolbar: React.FC<BulkActionToolbarProps> = ({
  selectionCount,
  onClearSelection,
  onDelete,
  onMerge,
  onBulkEdit,
  onAssignCategory,
  onAssignTags,
  className = '',
}) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {selectionCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`
            fixed bottom-6 left-1/2 -translate-x-1/2 z-50
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
            rounded-xl shadow-2xl
            px-6 py-4
            ${className}
          `}
        >
          <div className="flex items-center gap-4">
            {/* Selection Count */}
            <div className="flex items-center gap-2 pr-4 border-r border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full">
                <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                  {selectionCount}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {selectionCount === 1
                  ? t('activityLog.selectedSingle', '1 activity selected')
                  : t('activityLog.selectedMultiple', { count: selectionCount })}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {onMerge && selectionCount > 1 && (
                <button
                  onClick={onMerge}
                  className="
                    flex items-center gap-2 px-3 py-2 rounded-lg
                    bg-green-50 dark:bg-green-900/30
                    hover:bg-green-100 dark:hover:bg-green-900/50
                    text-green-700 dark:text-green-400
                    transition-colors
                  "
                  title={t('activityLog.merge', 'Merge activities')}
                >
                  <GitMerge className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('activityLog.merge', 'Merge')}</span>
                </button>
              )}

              {onBulkEdit && (
                <button
                  onClick={onBulkEdit}
                  className="
                    flex items-center gap-2 px-3 py-2 rounded-lg
                    bg-blue-50 dark:bg-blue-900/30
                    hover:bg-blue-100 dark:hover:bg-blue-900/50
                    text-blue-700 dark:text-blue-400
                    transition-colors
                  "
                  title={t('activityLog.bulkEdit', 'Bulk edit')}
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('activityLog.edit', 'Edit')}</span>
                </button>
              )}

              {onAssignCategory && (
                <button
                  onClick={onAssignCategory}
                  className="
                    flex items-center gap-2 px-3 py-2 rounded-lg
                    bg-purple-50 dark:bg-purple-900/30
                    hover:bg-purple-100 dark:hover:bg-purple-900/50
                    text-purple-700 dark:text-purple-400
                    transition-colors
                  "
                  title={t('activityLog.assignCategory', 'Assign category')}
                >
                  <FolderOpen className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('activityLog.category', 'Category')}</span>
                </button>
              )}

              {onAssignTags && (
                <button
                  onClick={onAssignTags}
                  className="
                    flex items-center gap-2 px-3 py-2 rounded-lg
                    bg-indigo-50 dark:bg-indigo-900/30
                    hover:bg-indigo-100 dark:hover:bg-indigo-900/50
                    text-indigo-700 dark:text-indigo-400
                    transition-colors
                  "
                  title={t('activityLog.assignTags', 'Assign tags')}
                >
                  <Tags className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('activityLog.tags', 'Tags')}</span>
                </button>
              )}

              {onDelete && (
                <button
                  onClick={onDelete}
                  className="
                    flex items-center gap-2 px-3 py-2 rounded-lg
                    bg-red-50 dark:bg-red-900/30
                    hover:bg-red-100 dark:hover:bg-red-900/50
                    text-red-700 dark:text-red-400
                    transition-colors
                  "
                  title={t('activityLog.delete', 'Delete selected')}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('common.delete', 'Delete')}</span>
                </button>
              )}
            </div>

            {/* Clear Selection */}
            <button
              onClick={onClearSelection}
              className="
                ml-2 p-2 rounded-lg
                hover:bg-gray-100 dark:hover:bg-gray-700
                text-gray-500 dark:text-gray-400
                transition-colors
              "
              title={t('activityLog.clearSelection', 'Clear selection')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BulkActionToolbar;
