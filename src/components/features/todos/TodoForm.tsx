import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Todo, TodoStatus, TodoPriority, Category, Tag } from '../../../types';
import { FormModal } from '../../ui/Modal';
import FormField, { SelectField } from '../../ui/FormField';
import TagSelector from '../../ui/TagSelector';

interface TodoFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (todoData: Partial<Todo>, tagIds: number[]) => Promise<void>;
  todo: Todo | null;
  categories: Category[];
  isLoading: boolean;
}

const TodoForm: React.FC<TodoFormProps> = ({
  isOpen,
  onClose,
  onSave,
  todo,
  categories,
  isLoading,
}) => {
  const { t } = useTranslation();

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    status: TodoStatus;
    priority: TodoPriority;
    categoryId: number | undefined;
    dueDate: string;
    dueTime: string;
    estimatedMinutes: number | undefined;
    tags: Tag[];
  }>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    categoryId: undefined,
    dueDate: '',
    dueTime: '',
    estimatedMinutes: undefined,
    tags: [],
  });

  useEffect(() => {
    if (todo) {
      setFormData({
        title: todo.title,
        description: todo.description || '',
        status: todo.status,
        priority: todo.priority,
        categoryId: todo.categoryId,
        dueDate: todo.dueDate || '',
        dueTime: todo.dueTime || '',
        estimatedMinutes: todo.estimatedMinutes,
        tags: todo.tags || [],
      });
    } else {
      // Reset form for new todo
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        categoryId: undefined,
        dueDate: '',
        dueTime: '',
        estimatedMinutes: undefined,
        tags: [],
      });
    }
  }, [todo, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      return;
    }

    const todoData: Partial<Todo> = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      status: formData.status,
      priority: formData.priority,
      categoryId: formData.categoryId || undefined,
      dueDate: formData.dueDate || undefined,
      dueTime: formData.dueTime || undefined,
      estimatedMinutes: formData.estimatedMinutes || undefined,
    };

    const tagIds = formData.tags
      .map((tag) => tag.id)
      .filter((id): id is number => id != null);

    await onSave(todoData, tagIds);
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={todo ? t('todos.editTodo') : t('todos.createTodo')}
      isLoading={isLoading}
      size="lg"
    >
      <div className="space-y-4">
        {/* Title */}
        <FormField
          type="text"
          label={`${t('todos.title')} *`}
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder={t('todos.titlePlaceholder')}
          required
        />

        {/* Description */}
        <FormField
          as="textarea"
          label={t('todos.description')}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder={t('todos.descriptionPlaceholder')}
          rows={3}
        />

        {/* Status and Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            label={`${t('todos.status')} *`}
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as TodoStatus })}
            options={[
              { value: 'todo', label: t('todos.statusTodo') },
              { value: 'in_progress', label: t('todos.statusInProgress') },
              { value: 'completed', label: t('todos.statusCompleted') },
              { value: 'cancelled', label: t('todos.statusCancelled') },
            ]}
            required
          />
          <SelectField
            label={`${t('todos.priority')} *`}
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as TodoPriority })}
            options={[
              { value: 'low', label: t('todos.priorityLow') },
              { value: 'medium', label: t('todos.priorityMedium') },
              { value: 'high', label: t('todos.priorityHigh') },
              { value: 'urgent', label: t('todos.priorityUrgent') },
            ]}
            required
          />
        </div>

        {/* Category */}
        <SelectField
          label={t('todos.category')}
          value={formData.categoryId?.toString() || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              categoryId: e.target.value ? parseInt(e.target.value, 10) : undefined,
            })
          }
          options={[
            { value: '', label: t('todos.selectCategory') },
            ...categories
              .filter((cat) => cat.id != null)
              .map((cat) => ({ value: cat.id!.toString(), label: cat.name })),
          ]}
        />

        {/* Due Date and Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            type="date"
            label={t('todos.dueDate')}
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          />
          <FormField
            type="time"
            label={t('todos.dueTime')}
            value={formData.dueTime}
            onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
          />
        </div>

        {/* Estimated Minutes */}
        <FormField
          type="number"
          label={t('todos.estimatedMinutes')}
          value={formData.estimatedMinutes?.toString() || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              estimatedMinutes: e.target.value ? parseInt(e.target.value, 10) : undefined,
            })
          }
          placeholder="60"
          min={1}
          helperText={t('todos.estimatedMinutesHelp')}
        />

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            {t('todos.tags')}
          </label>
          <TagSelector
            selectedTags={formData.tags}
            onChange={(tags) => setFormData({ ...formData, tags })}
            allowCreate={true}
            placeholder={t('todos.tagsPlaceholder')}
          />
        </div>
      </div>
    </FormModal>
  );
};

export default TodoForm;
