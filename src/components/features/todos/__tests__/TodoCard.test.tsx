import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TodoCard from '../TodoCard';
import { Todo, Category } from '@/types';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
  },
}));

// Mock translation
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('TodoCard', () => {
  const mockTodo: Todo = {
    id: 1,
    title: 'Test Todo',
    description: 'Test description',
    status: 'todo',
    priority: 'high',
    categoryId: 1,
    pomodoroCount: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockCategories: Category[] = [
    {
      id: 1,
      name: 'Work',
      color: '#FF0000',
      icon: 'briefcase',
      createdAt: '2024-01-01T00:00:00Z',
    },
  ];

  const mockCallbacks = {
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onToggleStatus: jest.fn(),
    onQuickStatusChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders todo title and description', () => {
    render(
      <TodoCard
        todo={mockTodo}
        index={0}
        categories={mockCategories}
        {...mockCallbacks}
      />
    );

    expect(screen.getByText('Test Todo')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('displays category name', () => {
    render(
      <TodoCard
        todo={mockTodo}
        index={0}
        categories={mockCategories}
        {...mockCallbacks}
      />
    );

    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('calls onToggleStatus when checkbox is clicked', () => {
    render(
      <TodoCard
        todo={mockTodo}
        index={0}
        categories={mockCategories}
        {...mockCallbacks}
      />
    );

    const checkbox = screen.getByLabelText('Toggle todo status');
    fireEvent.click(checkbox);

    expect(mockCallbacks.onToggleStatus).toHaveBeenCalledWith(mockTodo);
  });

  it('calls onEdit when edit button is clicked', () => {
    render(
      <TodoCard
        todo={mockTodo}
        index={0}
        categories={mockCategories}
        {...mockCallbacks}
      />
    );

    const editButton = screen.getByTitle('Edit todo');
    fireEvent.click(editButton);

    expect(mockCallbacks.onEdit).toHaveBeenCalledWith(mockTodo);
  });

  it('shows delete confirmation modal when delete button is clicked', () => {
    render(
      <TodoCard
        todo={mockTodo}
        index={0}
        categories={mockCategories}
        {...mockCallbacks}
      />
    );

    const deleteButton = screen.getByTitle('Delete todo');
    fireEvent.click(deleteButton);

    expect(screen.getByText('todos.deleteTodo')).toBeInTheDocument();
    expect(screen.getByText('todos.confirmDelete')).toBeInTheDocument();
  });

  it('shows completed status for completed todos', () => {
    const completedTodo: Todo = {
      ...mockTodo,
      status: 'completed',
    };

    render(
      <TodoCard
        todo={completedTodo}
        index={0}
        categories={mockCategories}
        {...mockCallbacks}
      />
    );

    const title = screen.getByText('Test Todo');
    expect(title).toHaveClass('line-through');
  });

  it('displays due date when provided', () => {
    const todoWithDueDate: Todo = {
      ...mockTodo,
      dueDate: '2024-12-31',
      dueTime: '17:00',
    };

    render(
      <TodoCard
        todo={todoWithDueDate}
        index={0}
        categories={mockCategories}
        {...mockCallbacks}
      />
    );

    expect(screen.getByText(/Dec 31, 2024/)).toBeInTheDocument();
    expect(screen.getByText(/at 17:00/)).toBeInTheDocument();
  });

  it('displays estimated time when provided', () => {
    const todoWithTime: Todo = {
      ...mockTodo,
      estimatedMinutes: 90,
    };

    render(
      <TodoCard
        todo={todoWithTime}
        index={0}
        categories={mockCategories}
        {...mockCallbacks}
      />
    );

    expect(screen.getByText(/1h 30m/)).toBeInTheDocument();
  });

  it('displays pomodoro count when greater than 0', () => {
    const todoWithPomodoros: Todo = {
      ...mockTodo,
      pomodoroCount: 5,
    };

    render(
      <TodoCard
        todo={todoWithPomodoros}
        index={0}
        categories={mockCategories}
        {...mockCallbacks}
      />
    );

    expect(screen.getByText(/🍅 5/)).toBeInTheDocument();
  });

  it('renders without category', () => {
    const todoWithoutCategory: Todo = {
      ...mockTodo,
      categoryId: undefined,
    };

    render(
      <TodoCard
        todo={todoWithoutCategory}
        index={0}
        categories={mockCategories}
        {...mockCallbacks}
      />
    );

    expect(screen.queryByText('Work')).not.toBeInTheDocument();
  });

  it('renders without description', () => {
    const todoWithoutDescription: Todo = {
      ...mockTodo,
      description: undefined,
    };

    render(
      <TodoCard
        todo={todoWithoutDescription}
        index={0}
        categories={mockCategories}
        {...mockCallbacks}
      />
    );

    expect(screen.queryByText('Test description')).not.toBeInTheDocument();
  });
});
