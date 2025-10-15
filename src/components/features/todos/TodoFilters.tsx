import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { TodoStatus, TodoPriority, Category } from '../../../types';
import { SelectField } from '../../ui/FormField';

interface TodoFiltersProps {
  filters: {
    status: TodoStatus | 'all';
    priority: TodoPriority | 'all';
    categoryId: number | null;
    searchQuery: string;
  };
  onFiltersChange: (filters: {
    status: TodoStatus | 'all';
    priority: TodoPriority | 'all';
    categoryId: number | null;
    searchQuery: string;
  }) => void;
  categories: Category[];
}

const TodoFilters: React.FC<TodoFiltersProps> = ({ filters, onFiltersChange, categories }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            {t('todos.search')}
          </label>
          <div className="relative">
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
              placeholder={t('todos.searchPlaceholder')}
              className="w-full px-3 py-2 pl-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
          </div>
        </div>

        {/* Status Filter */}
        <SelectField
          label={t('todos.filterStatus')}
          value={filters.status}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              status: e.target.value as TodoStatus | 'all',
            })
          }
          options={[
            { value: 'all', label: t('todos.allStatuses') },
            { value: 'todo', label: t('todos.statusTodo') },
            { value: 'in_progress', label: t('todos.statusInProgress') },
            { value: 'completed', label: t('todos.statusCompleted') },
            { value: 'cancelled', label: t('todos.statusCancelled') },
          ]}
        />

        {/* Priority Filter */}
        <SelectField
          label={t('todos.filterPriority')}
          value={filters.priority}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              priority: e.target.value as TodoPriority | 'all',
            })
          }
          options={[
            { value: 'all', label: t('todos.allPriorities') },
            { value: 'low', label: t('todos.priorityLow') },
            { value: 'medium', label: t('todos.priorityMedium') },
            { value: 'high', label: t('todos.priorityHigh') },
            { value: 'urgent', label: t('todos.priorityUrgent') },
          ]}
        />

        {/* Category Filter */}
        <SelectField
          label={t('todos.filterCategory')}
          value={filters.categoryId?.toString() || ''}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              categoryId: e.target.value ? parseInt(e.target.value, 10) : null,
            })
          }
          options={[
            { value: '', label: t('todos.allCategories') },
            ...categories.map((cat) => ({ value: cat.id!.toString(), label: cat.name })),
          ]}
        />
      </div>
    </div>
  );
};

export default TodoFilters;
