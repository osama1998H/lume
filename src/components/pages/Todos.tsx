import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckSquare, ListTodo, CheckCircle2, AlertCircle, Calendar, Plus, Filter } from 'lucide-react';
import { Todo, TodoStatus, TodoPriority, TodoStats, Category } from '@/types';
import StatCard from '../ui/StatCard';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import Skeleton from '../ui/Skeleton';
import { showToast } from '@/utils/toast';
import { motion, AnimatePresence } from 'framer-motion';

// Component imports (to be created)
import TodoCard from '../features/todos/TodoCard';
import TodoForm from '../features/todos/TodoForm';
import TodoFilters from '../features/todos/TodoFilters';
import { logger } from '@/services/logging/RendererLogger';

const Todos: React.FC = () => {
  const { t } = useTranslation();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filteredTodos, setFilteredTodos] = useState<Todo[]>([]);
  const [stats, setStats] = useState<TodoStats | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<{
    status: TodoStatus | 'all';
    priority: TodoPriority | 'all';
    categoryId: number | null;
    searchQuery: string;
  }>({
    status: 'all',
    priority: 'all',
    categoryId: null,
    searchQuery: '',
  });

  // Load todos with tags
  const loadTodos = useCallback(async () => {
    try {
      if (window.electronAPI) {
        const todosData = await window.electronAPI.todos.getAll();

        // Load tags for each todo
        const todosWithTags = await Promise.all(
          todosData.map(async (todo) => {
            if (todo.id) {
              const tags = await window.electronAPI.tagAssociations.todos.get(todo.id);
              return { ...todo, tags };
            }
            return todo;
          })
        );

        setTodos(todosWithTags);
        setFilteredTodos(todosWithTags);
      }
    } catch (error) {
      logger.error('Failed to load todos:', {}, error instanceof Error ? error : undefined);
      showToast.error(t('todos.loadingFailed') || 'Failed to load todos');
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Load statistics
  const loadStats = useCallback(async () => {
    try {
      if (window.electronAPI) {
        const statsData = await window.electronAPI.todos.getStats();
        setStats(statsData);
      }
    } catch (error) {
      logger.error('Failed to load stats:', {}, error instanceof Error ? error : undefined);
    }
  }, []);

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      if (window.electronAPI) {
        const categoriesData = await window.electronAPI.categories.getAll();
        setCategories(categoriesData);
      }
    } catch (error) {
      logger.error('Failed to load categories:', {}, error instanceof Error ? error : undefined);
    }
  }, []);

  useEffect(() => {
    loadTodos();
    loadStats();
    loadCategories();
  }, [loadTodos, loadStats, loadCategories]);

  // Apply filters
  useEffect(() => {
    let result = [...todos];

    // Filter by status
    if (filters.status !== 'all') {
      result = result.filter((todo) => todo.status === filters.status);
    }

    // Filter by priority
    if (filters.priority !== 'all') {
      result = result.filter((todo) => todo.priority === filters.priority);
    }

    // Filter by category
    if (filters.categoryId) {
      result = result.filter((todo) => todo.categoryId === filters.categoryId);
    }

    // Filter by search query
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(
        (todo) =>
          todo.title.toLowerCase().includes(query) ||
          todo.description?.toLowerCase().includes(query)
      );
    }

    setFilteredTodos(result);
  }, [todos, filters]);

  // Create new todo
  const handleCreateTodo = () => {
    setEditingTodo(null);
    setShowCreateModal(true);
  };

  // Edit existing todo
  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
    setShowCreateModal(true);
  };

  // Save todo (create or update)
  const handleSaveTodo = async (todoData: Partial<Todo>, tagIds: number[]) => {
    setIsSaving(true);
    try {
      if (window.electronAPI) {
        let todoId: number | null;

        if (editingTodo?.id) {
          // Update existing todo
          await window.electronAPI.todos.update(editingTodo.id, todoData);
          todoId = editingTodo.id;
          showToast.success(t('todos.updateSuccess') || 'Todo updated successfully');
        } else {
          // Create new todo
          todoId = await window.electronAPI.todos.add(todoData);
          if (!todoId) {
            throw new Error('Failed to create todo');
          }
          showToast.success(t('todos.createSuccess') || 'Todo created successfully');
        }

        // Save tags
        if (todoId) {
          await window.electronAPI.tagAssociations.todos.set(todoId, tagIds);
        }

        setShowCreateModal(false);
        setEditingTodo(null);
        await loadTodos();
        await loadStats();
      }
    } catch (error) {
      logger.error('Failed to save todo:', {}, error instanceof Error ? error : undefined);
      showToast.error(editingTodo ? t('todos.updateFailed') : t('todos.createFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  // Delete todo
  const handleDeleteTodo = async (todoId: number) => {
    try {
      if (window.electronAPI) {
        const success = await window.electronAPI.todos.delete(todoId);
        if (success) {
          await loadTodos();
          await loadStats();
          showToast.success(t('todos.deleteSuccess') || 'Todo deleted successfully');
        }
      }
    } catch (error) {
      logger.error('Failed to delete todo:', {}, error instanceof Error ? error : undefined);
      showToast.error(t('todos.deleteFailed') || 'Failed to delete todo');
    }
  };

  // Toggle todo status
  const handleToggleStatus = async (todo: Todo) => {
    if (!todo.id) return;

    const newStatus: TodoStatus = todo.status === 'completed' ? 'todo' : 'completed';
    const updates: Partial<Todo> = {
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
    };

    try {
      if (window.electronAPI) {
        await window.electronAPI.todos.update(todo.id, updates);
        await loadTodos();
        await loadStats();
        showToast.success(
          newStatus === 'completed'
            ? t('todos.markedComplete') || 'Todo marked as complete'
            : t('todos.markedIncomplete') || 'Todo marked as incomplete'
        );
      }
    } catch (error) {
      logger.error('Failed to toggle todo status:', {}, error instanceof Error ? error : undefined);
      showToast.error(t('todos.updateFailed') || 'Failed to update todo');
    }
  };

  // Quick status change
  const handleQuickStatusChange = async (todo: Todo, newStatus: TodoStatus) => {
    if (!todo.id) return;

    const updates: Partial<Todo> = {
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
    };

    try {
      if (window.electronAPI) {
        await window.electronAPI.todos.update(todo.id, updates);
        await loadTodos();
        await loadStats();
      }
    } catch (error) {
      logger.error('Failed to update todo status:', {}, error instanceof Error ? error : undefined);
      showToast.error(t('todos.updateFailed') || 'Failed to update todo');
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-8">
        <div className="space-y-2">
          <Skeleton width="200px" height="32px" />
          <Skeleton width="300px" height="20px" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Skeleton variant="rectangular" height="120px" />
          <Skeleton variant="rectangular" height="120px" />
          <Skeleton variant="rectangular" height="120px" />
          <Skeleton variant="rectangular" height="120px" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('todos.title')}
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          {t('todos.subtitle')}
        </p>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8"
        >
          <StatCard
            icon={ListTodo}
            title={t('todos.stats.total')}
            value={stats.totalTodos}
            colorScheme="primary"
          />
          <StatCard
            icon={CheckSquare}
            title={t('todos.stats.completed')}
            value={stats.completedTodos}
            colorScheme="green"
          />
          <StatCard
            icon={CheckCircle2}
            title={t('todos.stats.inProgress')}
            value={stats.inProgressTodos}
            colorScheme="blue"
          />
          <StatCard
            icon={AlertCircle}
            title={t('todos.stats.overdue')}
            value={stats.overdueTodos}
            colorScheme="red"
          />
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-6 flex gap-3"
      >
        <Button onClick={handleCreateTodo} variant="primary" icon={Plus}>
          {t('todos.createTodo')}
        </Button>
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="secondary"
          icon={Filter}
        >
          {t('todos.filters')}
        </Button>
      </motion.div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-6"
          >
            <TodoFilters
              filters={filters}
              onFiltersChange={setFilters}
              categories={categories}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Todos List */}
      {filteredTodos.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <EmptyState
            icon={todos.length === 0 ? CheckSquare : Calendar}
            title={
              todos.length === 0
                ? t('todos.noTodos')
                : t('todos.noFilteredTodos')
            }
            description={
              todos.length === 0
                ? t('todos.noTodosPrompt')
                : t('todos.noFilteredTodosPrompt')
            }
            action={
              todos.length === 0
                ? {
                    label: t('todos.createTodo'),
                    onClick: handleCreateTodo,
                  }
                : undefined
            }
          />
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredTodos.map((todo, index) => (
              <TodoCard
                key={todo.id}
                todo={todo}
                index={index}
                categories={categories}
                onEdit={handleEditTodo}
                onDelete={handleDeleteTodo}
                onToggleStatus={handleToggleStatus}
                onQuickStatusChange={handleQuickStatusChange}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Modal */}
      <TodoForm
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingTodo(null);
        }}
        onSave={handleSaveTodo}
        todo={editingTodo}
        categories={categories}
        isLoading={isSaving}
      />
    </div>
  );
};

export default Todos;
