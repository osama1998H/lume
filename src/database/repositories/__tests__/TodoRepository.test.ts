import { TodoRepository } from '../TodoRepository';
import { Todo } from '../../../types';

// Mock better-sqlite3
jest.mock('better-sqlite3');

describe('TodoRepository', () => {
  let repository: TodoRepository;
  let mockDb: any;
  let mockPrepare: jest.Mock;
  let mockRun: jest.Mock;
  let mockGet: jest.Mock;
  let mockAll: jest.Mock;

  beforeEach(() => {
    // Setup mock database methods
    mockRun = jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 });
    mockGet = jest.fn();
    mockAll = jest.fn().mockReturnValue([]);

    mockPrepare = jest.fn().mockReturnValue({
      run: mockRun,
      get: mockGet,
      all: mockAll,
    });

    mockDb = {
      prepare: mockPrepare,
      exec: jest.fn(),
      transaction: jest.fn((fn) => () => fn()),
    };

    repository = new TodoRepository(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('insert', () => {
    it('should insert a new todo with all fields', () => {
      const todo: Partial<Todo> = {
        title: 'Test Todo',
        description: 'Test description',
        status: 'todo',
        priority: 'high',
        categoryId: 1,
        dueDate: '2024-12-31',
        dueTime: '23:59',
        estimatedMinutes: 60,
      };

      const result = repository.insert(todo);

      expect(result).toBe(1);
      expect(mockPrepare).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();
    });

    it('should insert a minimal todo with only required fields', () => {
      const todo: Partial<Todo> = {
        title: 'Minimal Todo',
      };

      const result = repository.insert(todo);

      expect(result).toBe(1);
      expect(mockPrepare).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();
    });

    it('should handle undefined optional fields', () => {
      const todo: Partial<Todo> = {
        title: 'Test Todo',
        description: undefined,
        categoryId: undefined,
      };

      const result = repository.insert(todo);

      expect(result).toBe(1);
    });
  });

  describe('update', () => {
    it('should update todo fields', () => {
      const updates: Partial<Todo> = {
        title: 'Updated Title',
        status: 'in_progress',
        priority: 'urgent',
      };

      const result = repository.update(1, updates);

      expect(result).toBe(true);
      expect(mockPrepare).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();
    });

    it('should return false when no fields to update', () => {
      const result = repository.update(1, {});

      expect(result).toBe(false);
      expect(mockPrepare).not.toHaveBeenCalled();
    });

    it('should update status to completed with completedAt timestamp', () => {
      const updates: Partial<Todo> = {
        status: 'completed',
      };

      const result = repository.update(1, updates);

      expect(result).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete a todo by id', () => {
      mockRun.mockReturnValue({ changes: 1 });

      const result = repository.delete(1);

      expect(result).toBe(true);
      expect(mockPrepare).toHaveBeenCalledWith('DELETE FROM todos WHERE id = ?');
      expect(mockRun).toHaveBeenCalledWith(1);
    });

    it('should return false when todo not found', () => {
      mockRun.mockReturnValue({ changes: 0 });

      const result = repository.delete(999);

      expect(result).toBe(false);
    });
  });

  describe('getById', () => {
    it('should return a todo by id', () => {
      const mockTodo = {
        id: 1,
        title: 'Test Todo',
        description: 'Test description',
        status: 'todo',
        priority: 'medium',
        category_id: 1,
        due_date: '2024-12-31',
        due_time: '23:59',
        completed_at: null,
        estimated_minutes: 60,
        actual_minutes: null,
        time_entry_id: null,
        pomodoro_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockGet.mockReturnValue(mockTodo);

      const result = repository.getById(1);

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(result?.title).toBe('Test Todo');
      expect(mockPrepare).toHaveBeenCalled();
      expect(mockGet).toHaveBeenCalledWith(1);
    });

    it('should return null when todo not found', () => {
      mockGet.mockReturnValue(null);

      const result = repository.getById(999);

      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return all todos', () => {
      const mockTodos = [
        {
          id: 1,
          title: 'Todo 1',
          status: 'todo',
          priority: 'high',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          title: 'Todo 2',
          status: 'completed',
          priority: 'low',
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      mockAll.mockReturnValue(mockTodos);

      const result = repository.getAll();

      expect(result).toHaveLength(2);
      expect(mockPrepare).toHaveBeenCalled();
    });

    it('should return empty array when no todos', () => {
      mockAll.mockReturnValue([]);

      const result = repository.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('getAll with status filter', () => {
    it('should filter todos by status', () => {
      const mockTodos = [
        {
          id: 1,
          title: 'Todo 1',
          status: 'todo',
          priority: 'high',
        },
      ];

      mockAll.mockReturnValue(mockTodos);

      const result = repository.getAll({ status: 'todo' });

      expect(result).toHaveLength(1);
      expect(result[0]!.status).toBe('todo');
    });

    it('should return empty array when no todos match status', () => {
      mockAll.mockReturnValue([]);

      const result = repository.getAll({ status: 'completed' });

      expect(result).toEqual([]);
    });
  });

  describe('getAll with priority filter', () => {
    it('should filter todos by priority', () => {
      const mockTodos = [
        {
          id: 1,
          title: 'Urgent Todo',
          status: 'todo',
          priority: 'urgent',
        },
      ];

      mockAll.mockReturnValue(mockTodos);

      const result = repository.getAll({ priority: 'urgent' });

      expect(result).toHaveLength(1);
      expect(result[0]!.priority).toBe('urgent');
    });
  });

  describe('getOverdue', () => {
    it('should return overdue todos', () => {
      const mockTodos = [
        {
          id: 1,
          title: 'Overdue Todo',
          status: 'todo',
          due_date: '2023-01-01',
        },
      ];

      mockAll.mockReturnValue(mockTodos);

      repository.getOverdue();

      expect(mockPrepare).toHaveBeenCalled();
      expect(mockAll).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return todo statistics', () => {
      mockGet.mockReturnValueOnce({ total: 10, completed: 5, inProgress: 2 });
      mockGet.mockReturnValueOnce({ overdue: 1 });
      mockGet.mockReturnValueOnce({ avgMinutes: 120 });

      const result = repository.getStats();

      expect(result.totalTodos).toBe(10);
      expect(result.completedTodos).toBe(5);
      expect(result.inProgressTodos).toBe(2);
      expect(result.overdueTodos).toBe(1);
      expect(result.completionRate).toBe(50);
      expect(result.avgCompletionTime).toBe(120);
    });

    it('should handle zero division in completion rate', () => {
      mockGet.mockReturnValueOnce({ total: 0, completed: 0, inProgress: 0 });
      mockGet.mockReturnValueOnce({ overdue: 0 });
      mockGet.mockReturnValueOnce({ avgMinutes: null });

      const result = repository.getStats();

      expect(result.completionRate).toBe(0);
    });
  });

  describe('linkTimeEntry', () => {
    it('should link a time entry to a todo', () => {
      mockRun.mockReturnValue({ changes: 1 });

      const result = repository.linkTimeEntry(1, 100);

      expect(result).toBe(true);
      expect(mockPrepare).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalledWith(100, 1);
    });

    it('should return false when todo not found', () => {
      mockRun.mockReturnValue({ changes: 0 });

      const result = repository.linkTimeEntry(999, 100);

      expect(result).toBe(false);
    });
  });

  describe('incrementPomodoroCount', () => {
    it('should increment pomodoro count', () => {
      mockRun.mockReturnValue({ changes: 1 });

      const result = repository.incrementPomodoroCount(1);

      expect(result).toBe(true);
      expect(mockPrepare).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalledWith(1);
    });

    it('should return false when todo not found', () => {
      mockRun.mockReturnValue({ changes: 0 });

      const result = repository.incrementPomodoroCount(999);

      expect(result).toBe(false);
    });
  });

  describe('getTags', () => {
    it('should return tags for a todo', () => {
      const mockTags = [
        { id: 1, name: 'work', color: '#FF0000', createdAt: '2024-01-01T00:00:00Z' },
        { id: 2, name: 'urgent', color: '#00FF00', createdAt: '2024-01-01T00:00:00Z' },
      ];

      mockAll.mockReturnValue(mockTags);

      const result = repository.getTags(1);

      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe('work');
      expect(mockPrepare).toHaveBeenCalled();
    });

    it('should return empty array when todo has no tags', () => {
      mockAll.mockReturnValue([]);

      const result = repository.getTags(1);

      expect(result).toEqual([]);
    });
  });

  describe('addTags', () => {
    it('should add tags to a todo', () => {
      repository.addTags(1, [1, 2, 3]);

      expect(mockPrepare).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalledTimes(3);
    });

    it('should handle empty tag array', () => {
      repository.addTags(1, []);

      expect(mockRun).not.toHaveBeenCalled();
    });
  });

  describe('setTags', () => {
    it('should replace all tags for a todo', () => {
      repository.setTags(1, [1, 2]);

      expect(mockPrepare).toHaveBeenCalledTimes(2); // DELETE + INSERT
      expect(mockRun).toHaveBeenCalled();
    });

    it('should handle empty tags array', () => {
      repository.setTags(1, []);

      expect(mockPrepare).toHaveBeenCalledTimes(1); // Just DELETE
    });
  });

  describe('getAllWithTags', () => {
    it('should return todos with their tags', () => {
      const mockTodos = [
        {
          id: 1,
          title: 'Todo 1',
          status: 'todo',
          priority: 'high',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockTags = [
        { id: 1, name: 'work', color: '#FF0000', createdAt: '2024-01-01T00:00:00Z' },
      ];

      mockAll.mockReturnValueOnce(mockTodos).mockReturnValueOnce(mockTags);

      const result = repository.getAllWithTags();

      expect(result).toHaveLength(1);
      expect(result[0]!.tags).toBeDefined();
    });
  });

  describe('getAllWithCategory', () => {
    it('should return todos with category information', () => {
      const mockTodos = [
        {
          id: 1,
          title: 'Todo 1',
          categoryId: 1,
          categoryIdFull: 1,
          categoryName: 'Work',
          categoryColor: '#FF0000',
          categoryIcon: 'briefcase',
          categoryDescription: 'Work tasks',
        },
      ];

      mockAll.mockReturnValue(mockTodos);

      const result = repository.getAllWithCategory();

      expect(result).toHaveLength(1);
      expect(result[0]!.category?.name).toBe('Work');
      expect(result[0]!.category?.color).toBe('#FF0000');
    });

    it('should handle todos without categories', () => {
      const mockTodos = [
        {
          id: 1,
          title: 'Todo 1',
          categoryId: null,
          categoryIdFull: null,
          categoryName: null,
          categoryColor: null,
        },
      ];

      mockAll.mockReturnValue(mockTodos);

      const result = repository.getAllWithCategory();

      expect(result).toHaveLength(1);
      expect(result[0]!.category).toBeUndefined();
    });
  });
});
