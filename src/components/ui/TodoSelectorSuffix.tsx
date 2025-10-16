import React from 'react';
import { Link2, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DropdownSelector } from './DropdownSelector';
import type { Todo, TodoPriority, TodoStatus } from '@/types';
import Badge from './Badge';

export interface TodoSelectorSuffixProps {
  selectedTodo: Todo | null;
  onChange: (todo: Todo | null) => void;
  availableTodos?: Todo[];
  onTitleAutoFill?: (title: string) => void;
  className?: string;
  disabled?: boolean;
}

// Priority configuration
const priorityConfig: Record<
  TodoPriority,
  { icon: React.ElementType; color: string; label: string }
> = {
  urgent: {
    icon: AlertCircle,
    color: 'text-red-500 dark:text-red-400',
    label: 'Urgent',
  },
  high: {
    icon: AlertCircle,
    color: 'text-orange-500 dark:text-orange-400',
    label: 'High',
  },
  medium: {
    icon: Circle,
    color: 'text-yellow-500 dark:text-yellow-400',
    label: 'Medium',
  },
  low: {
    icon: Circle,
    color: 'text-green-500 dark:text-green-400',
    label: 'Low',
  },
};

// Status configuration
const statusConfig: Record<
  TodoStatus,
  { variant: 'primary' | 'success' | 'warning' | 'gray'; label: string }
> = {
  todo: { variant: 'gray', label: 'To Do' },
  in_progress: { variant: 'primary', label: 'In Progress' },
  completed: { variant: 'success', label: 'Completed' },
  cancelled: { variant: 'warning', label: 'Cancelled' },
};

export function TodoSelectorSuffix({
  selectedTodo,
  onChange,
  availableTodos = [],
  onTitleAutoFill,
  className = '',
  disabled = false,
}: TodoSelectorSuffixProps) {
  const { t } = useTranslation();

  // Handle todo selection and auto-fill
  const handleTodoChange = (todo: Todo | null) => {
    onChange(todo);
    if (todo && onTitleAutoFill) {
      onTitleAutoFill(todo.title);
    }
  };

  // Render individual todo item in dropdown
  const renderTodoItem = (todo: Todo) => {
    const priorityInfo = priorityConfig[todo.priority];
    const PriorityIcon = priorityInfo.icon;
    const statusInfo = statusConfig[todo.status];

    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <PriorityIcon className={`h-4 w-4 flex-shrink-0 ${priorityInfo.color}`} />
          <span className="truncate text-sm text-gray-900 dark:text-gray-100">
            {todo.title}
          </span>
        </div>
        <Badge variant={statusInfo.variant} size="sm">
          {statusInfo.label}
        </Badge>
      </div>
    );
  };

  // Custom trigger button for the dropdown
  const renderTrigger = (selected: Todo | null) => {
    if (selected) {
      return (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary-600 dark:text-primary-400" />
          <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
            {t('common.todoLinked')}
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5">
        <Link2 className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t('common.selectTodo')}
        </span>
      </div>
    );
  };

  // Search filter function
  const searchFilter = (todo: Todo, query: string) => {
    const searchLower = query.toLowerCase();
    return (
      todo.title.toLowerCase().includes(searchLower) ||
      todo.description?.toLowerCase().includes(searchLower) ||
      todo.priority.toLowerCase().includes(searchLower) ||
      todo.status.toLowerCase().includes(searchLower)
    );
  };

  return (
    <DropdownSelector<Todo>
      items={availableTodos}
      selectedItem={selectedTodo}
      onChange={handleTodoChange}
      renderItem={renderTodoItem}
      getItemKey={(todo) => todo.id || 0}
      searchFilter={searchFilter}
      placeholder={t('common.selectTodo')}
      emptyMessage={t('common.noTodosAvailable')}
      searchPlaceholder={t('common.searchTodos')}
      className={className}
      buttonClassName={`
        min-h-[46px] px-3 py-2.5
        bg-gray-50 dark:bg-gray-900/50
        border border-s-0 border-gray-200 dark:border-gray-700
        rounded-e-lg
        hover:bg-gray-100 dark:hover:bg-gray-800
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0
        transition-colors duration-200
        ${selectedTodo ? 'bg-primary-50 dark:bg-primary-900/20' : ''}
      `}
      renderTrigger={renderTrigger}
      showSearch={true}
      disabled={disabled}
      clearable={true}
    />
  );
}
