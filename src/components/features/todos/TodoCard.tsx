import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Edit2, Trash2, Calendar, CheckCircle2, Circle, PlayCircle, XCircle, Timer } from 'lucide-react';
import { Todo, TodoStatus, Category } from '@/types';
import Badge from '../../ui/Badge';
import TagDisplay from '../../ui/TagDisplay';
import { ConfirmModal } from '../../ui/Modal';

interface TodoCardProps {
  todo: Todo;
  index: number;
  categories: Category[];
  onEdit: (todo: Todo) => void;
  onDelete: (todoId: number) => void;
  onToggleStatus: (todo: Todo) => void;
  onQuickStatusChange: (todo: Todo, status: TodoStatus) => void;
}

const TodoCard: React.FC<TodoCardProps> = ({
  todo,
  index,
  categories,
  onEdit,
  onDelete,
  onToggleStatus,
  onQuickStatusChange,
}) => {
  const { t } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const getStatusVariant = (status: TodoStatus): 'success' | 'primary' | 'warning' | 'danger' | 'gray' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'primary';
      case 'cancelled':
        return 'danger';
      default:
        return 'gray';
    }
  };

  const getPriorityVariant = (priority: string): 'success' | 'warning' | 'danger' | 'gray' => {
    switch (priority) {
      case 'urgent':
        return 'danger';
      case 'high':
        return 'warning';
      case 'medium':
        return 'success';
      default:
        return 'gray';
    }
  };

  const getCategoryColor = (categoryId?: number): string => {
    if (!categoryId) return 'gray';
    const category = categories.find((c) => c.id === categoryId);
    return category?.color || 'gray';
  };

  const getCategoryName = (categoryId?: number): string | undefined => {
    if (!categoryId) return undefined;
    const category = categories.find((c) => c.id === categoryId);
    return category?.name;
  };

  const isOverdue = (dueDate?: string): boolean => {
    if (!dueDate) return false;
    const today = new Date().toISOString().split('T')[0];
    if (!today) return false;
    return dueDate < today && todo.status !== 'completed' && todo.status !== 'cancelled';
  };

  const formatDate = (date?: string): string => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDuration = (minutes?: number): string => {
    if (!minutes || minutes === 0) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };


  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    if (todo.id) {
      onDelete(todo.id);
    }
    setShowDeleteConfirm(false);
  };

  const statusActions = [
    { status: 'todo' as TodoStatus, icon: Circle, label: t('todos.statusTodo') },
    { status: 'in_progress' as TodoStatus, icon: PlayCircle, label: t('todos.statusInProgress') },
    { status: 'completed' as TodoStatus, icon: CheckCircle2, label: t('todos.statusCompleted') },
    { status: 'cancelled' as TodoStatus, icon: XCircle, label: t('todos.statusCancelled') },
  ];

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ delay: index * 0.05 }}
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all p-3 border border-gray-200 dark:border-gray-700 group ${
          todo.status === 'completed' ? 'opacity-75' : ''
        } ${isOverdue(todo.dueDate) ? 'border-l-4 border-l-red-500' : ''}`}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Left side - Checkbox and Main Content */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Checkbox */}
            <button
              onClick={() => onToggleStatus(todo)}
              className="flex-shrink-0"
              aria-label="Toggle todo status"
            >
              {todo.status === 'completed' ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-gray-400 hover:text-primary-500 transition-colors" />
              )}
            </button>

            {/* Title and Main Info - All in One Line */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Title */}
              <h3
                className={`text-base font-medium text-gray-900 dark:text-white truncate ${
                  todo.status === 'completed' ? 'line-through' : ''
                }`}
                title={todo.title}
              >
                {todo.title}
              </h3>

              {/* Status Badge */}
              {(() => {
                const statusKeyMap: Record<TodoStatus, string> = {
                  todo: 'Todo',
                  in_progress: 'InProgress',
                  completed: 'Completed',
                  cancelled: 'Cancelled',
                };
                return (
                  <Badge variant={getStatusVariant(todo.status)} size="sm" className="!text-xs !px-2 !py-0.5">
                    {t(`todos.status${statusKeyMap[todo.status]}`)}
                  </Badge>
                );
              })()}

              {/* Priority Badge */}
              <Badge variant={getPriorityVariant(todo.priority)} size="sm" className="!text-xs !px-2 !py-0.5">
                {t(`todos.priority${todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}`)}
              </Badge>

              {/* Category */}
              {getCategoryName(todo.categoryId) && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
                  style={{
                    backgroundColor: `${getCategoryColor(todo.categoryId)}20`,
                    color: getCategoryColor(todo.categoryId),
                  }}
                >
                  {getCategoryName(todo.categoryId)}
                </span>
              )}

              {/* Compact Time Display */}
              {(todo.pomodoroCount || todo.estimatedMinutes) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  <Timer className="h-3 w-3" />
                  {todo.pomodoroCount ? `${todo.pomodoroCount}` : ''}
                  {todo.pomodoroCount && todo.estimatedMinutes ? ' ' : ''}
                  {todo.estimatedMinutes ? `(${formatDuration(todo.estimatedMinutes)})` : ''}
                </span>
              )}

              {/* Overdue Badge */}
              {isOverdue(todo.dueDate) && (
                <Badge variant="danger" size="sm" className="!text-xs !px-2 !py-0.5">
                  {t('todos.overdue')}
                </Badge>
              )}
            </div>
          </div>

          {/* Right side - Actions (smaller and more subtle) */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Quick Status Menu */}
            <div className="relative group/status">
              <button className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <Circle className="h-3.5 w-3.5" />
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10 opacity-0 invisible group-hover/status:opacity-100 group-hover/status:visible transition-all min-w-[140px]">
                {statusActions.map((action) => (
                  <button
                    key={action.status}
                    onClick={() => onQuickStatusChange(todo, action.status)}
                    className="w-full px-3 py-1.5 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <action.icon className="h-3 w-3" />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Edit */}
            <button
              onClick={() => onEdit(todo)}
              className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Edit todo"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>

            {/* Delete */}
            <button
              onClick={handleDeleteClick}
              className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Delete todo"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Optional Second Line - Description and Tags (only if they exist) */}
        {(todo.description || (todo.tags && todo.tags.length > 0) || todo.dueDate) && (
          <div className="flex items-center gap-2 mt-2 ml-8 text-xs text-gray-500 dark:text-gray-400">
            {/* Description - truncated to one line */}
            {todo.description && (
              <span className="truncate flex-1" title={todo.description}>
                {todo.description}
              </span>
            )}

            {/* Due Date */}
            {todo.dueDate && (
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <Calendar className="h-3 w-3" />
                {formatDate(todo.dueDate)}
              </span>
            )}

            {/* Tags - compact display */}
            {todo.tags && todo.tags.length > 0 && (
              <div className="inline-flex items-center gap-1">
                <TagDisplay tags={todo.tags.slice(0, 3)} size="sm" maxDisplay={3} />
                {todo.tags.length > 3 && (
                  <span className="text-gray-400">+{todo.tags.length - 3}</span>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title={t('todos.deleteTodo') || 'Delete Todo'}
        message={t('todos.confirmDelete') || 'Are you sure you want to delete this todo? This action cannot be undone.'}
        confirmText={t('common.delete') || 'Delete'}
        cancelText={t('common.cancel') || 'Cancel'}
        variant="danger"
      />
    </>
  );
};

export default TodoCard;
