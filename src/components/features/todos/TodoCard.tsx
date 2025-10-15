import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Edit2, Trash2, Calendar, Clock, CheckCircle2, Circle, PlayCircle, XCircle } from 'lucide-react';
import { Todo, TodoStatus, Category } from '../../../types';
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
        className={`bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition-all p-4 sm:p-6 border border-gray-200 dark:border-gray-700 group ${
          todo.status === 'completed' ? 'opacity-75' : ''
        } ${isOverdue(todo.dueDate) ? 'border-l-4 border-l-red-500' : ''}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Left side - Content */}
          <div className="flex-1 min-w-0 flex gap-3">
            {/* Checkbox */}
            <button
              onClick={() => onToggleStatus(todo)}
              className="flex-shrink-0 mt-1"
              aria-label="Toggle todo status"
            >
              {todo.status === 'completed' ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : (
                <Circle className="h-6 w-6 text-gray-400 hover:text-primary-500 transition-colors" />
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 mb-2 flex-wrap">
                <h3
                  className={`text-lg sm:text-xl font-semibold text-gray-900 dark:text-white ${
                    todo.status === 'completed' ? 'line-through' : ''
                  }`}
                >
                  {todo.title}
                </h3>
                <div className="flex gap-2 flex-wrap">
                  {(() => {
                    const statusKeyMap: Record<TodoStatus, string> = {
                      todo: 'Todo',
                      in_progress: 'InProgress',
                      completed: 'Completed',
                      cancelled: 'Cancelled',
                    };
                    return (
                      <Badge variant={getStatusVariant(todo.status)} size="sm">
                        {t(`todos.status${statusKeyMap[todo.status]}`)}
                      </Badge>
                    );
                  })()}
                  <Badge variant={getPriorityVariant(todo.priority)} size="sm">
                    {t(`todos.priority${todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}`)}
                  </Badge>
                  {isOverdue(todo.dueDate) && (
                    <Badge variant="danger" size="sm">
                      {t('todos.overdue')}
                    </Badge>
                  )}
                </div>
              </div>

              {todo.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {todo.description}
                </p>
              )}

              {/* Tags */}
              {todo.tags && todo.tags.length > 0 && (
                <div className="mb-3">
                  <TagDisplay tags={todo.tags} size="sm" maxDisplay={5} />
                </div>
              )}

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {getCategoryName(todo.categoryId) && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md"
                    style={{
                      backgroundColor: `${getCategoryColor(todo.categoryId)}20`,
                      color: getCategoryColor(todo.categoryId),
                    }}
                  >
                    {getCategoryName(todo.categoryId)}
                  </span>
                )}
                {todo.dueDate && (
                  <>
                    {getCategoryName(todo.categoryId) && <span>•</span>}
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(todo.dueDate)}
                      {todo.dueTime && ` at ${todo.dueTime}`}
                    </span>
                  </>
                )}
                {todo.estimatedMinutes && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {Math.floor(todo.estimatedMinutes / 60)}h {todo.estimatedMinutes % 60}m
                    </span>
                  </>
                )}
                {todo.pomodoroCount && todo.pomodoroCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      🍅 {todo.pomodoroCount}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex sm:flex-col gap-2">
            {/* Quick Status Menu */}
            <div className="relative group/status">
              <button className="p-2 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <Circle className="h-4 w-4" />
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10 opacity-0 invisible group-hover/status:opacity-100 group-hover/status:visible transition-all min-w-[160px]">
                {statusActions.map((action) => (
                  <button
                    key={action.status}
                    onClick={() => onQuickStatusChange(todo, action.status)}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <action.icon className="h-4 w-4" />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Edit */}
            <button
              onClick={() => onEdit(todo)}
              className="p-2 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Edit todo"
            >
              <Edit2 className="h-4 w-4" />
            </button>

            {/* Delete */}
            <button
              onClick={handleDeleteClick}
              className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Delete todo"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
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
