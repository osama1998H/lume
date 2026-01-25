import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { IpcMain } from 'electron';
import { TodosHandlers } from '../TodosHandlers';
import { IIPCHandlerContext } from '@/types';
import { Todo, TodoStats } from '../../../../types';

describe('TodosHandlers', () => {
  let handlers: TodosHandlers;
  let mockIpcMain: any;
  let mockContext: IIPCHandlerContext;
  let consoleLog: ReturnType<typeof spyOn>;
  let consoleError: ReturnType<typeof spyOn>;
  let handlerCallbacks: Map<string, (event: any, ...args: any[]) => Promise<any>>;

  beforeEach(() => {
    handlerCallbacks = new Map();

    // Mock IpcMain
    mockIpcMain = {
      handle: mock((channel: string, listener: any) => {
        handlerCallbacks.set(channel, listener);
      }),
      removeHandler: mock(() => {}),
    } as any;

    // Mock DatabaseManager methods
    mockContext = {
      dbManager: {
        addTodo: mock(() => {}),
        updateTodo: mock(() => {}),
        deleteTodo: mock(() => {}),
        getTodos: mock(() => {}),
        getTodo: mock(() => {}),
        getTodoStats: mock(() => {}),
        getTodosWithCategory: mock(() => {}),
        linkTodoToTimeEntry: mock(() => {}),
        incrementTodoPomodoro: mock(() => {}),
      } as any,
    } as unknown as IIPCHandlerContext;

    handlers = new TodosHandlers();

    // Spy on console methods
    consoleLog = spyOn(console, 'log').mockImplementation(() => {});
    consoleError = spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLog.mockRestore();
    consoleError.mockRestore();
  });

  describe('Handler Registration', () => {
    it('should register all todo-related handlers', () => {
      handlers.register(mockIpcMain, mockContext);

      expect(mockIpcMain.handle).toHaveBeenCalledWith('add-todo', expect.any(Function));
      expect(mockIpcMain.handle).toHaveBeenCalledWith('update-todo', expect.any(Function));
      expect(mockIpcMain.handle).toHaveBeenCalledWith('delete-todo', expect.any(Function));
      expect(mockIpcMain.handle).toHaveBeenCalledWith('get-todos', expect.any(Function));
      expect(mockIpcMain.handle).toHaveBeenCalledWith('get-todo-by-id', expect.any(Function));
      expect(mockIpcMain.handle).toHaveBeenCalledWith('get-todo-stats', expect.any(Function));
      expect(mockIpcMain.handle).toHaveBeenCalledWith('get-todos-with-category', expect.any(Function));
      expect(mockIpcMain.handle).toHaveBeenCalledWith('link-todo-time-entry', expect.any(Function));
      expect(mockIpcMain.handle).toHaveBeenCalledWith('increment-todo-pomodoro', expect.any(Function));
      expect(mockIpcMain.handle).toHaveBeenCalledTimes(9);
    });
  });

  describe('add-todo', () => {
    beforeEach(() => {
      handlers.register(mockIpcMain, mockContext);
    });

    it('should add a new todo successfully', async () => {
      const mockTodo: Partial<Todo> = {
        title: 'Test Todo',
        description: 'Test description',
        status: 'todo',
        priority: 'high',
      };

      (mockContext.dbManager as any).addTodo = mock(() => 1);

      const handler = handlerCallbacks.get('add-todo');
      const result = await handler!(null, mockTodo);

      expect(result).toBe(1);
      expect(mockContext.dbManager?.addTodo).toHaveBeenCalledWith(mockTodo);
      expect(consoleLog).toHaveBeenCalledWith('➕ Adding todo:', 'Test Todo');
    });

    it('should return null when dbManager is not available', async () => {
      const contextWithoutDb = { dbManager: null } as unknown as IIPCHandlerContext;
      handlers.register(mockIpcMain, contextWithoutDb);

      const handler = handlerCallbacks.get('add-todo');
      const result = await handler!(null, { title: 'Test' });

      expect(result).toBeNull();
    });

    it('should handle errors and return null', async () => {
      (mockContext.dbManager as any).addTodo = mock(() => {
        throw new Error('Database error');
      });

      const handler = handlerCallbacks.get('add-todo');
      const result = await handler!(null, { title: 'Test' });

      expect(result).toBeNull();
      expect(consoleError).toHaveBeenCalledWith('Failed to add todo:', expect.any(Error));
    });
  });

  describe('update-todo', () => {
    beforeEach(() => {
      handlers.register(mockIpcMain, mockContext);
    });

    it('should update a todo successfully', async () => {
      const updates: Partial<Todo> = {
        title: 'Updated Title',
        status: 'completed',
      };

      (mockContext.dbManager as any).updateTodo = mock(() => true);

      const handler = handlerCallbacks.get('update-todo');
      const result = await handler!(null, 1, updates);

      expect(result).toBe(true);
      expect(mockContext.dbManager?.updateTodo).toHaveBeenCalledWith(1, updates);
      expect(consoleLog).toHaveBeenCalledWith('📝 Updating todo:', 1);
    });

    it('should return false when todo not found', async () => {
      (mockContext.dbManager as any).updateTodo = mock(() => false);

      const handler = handlerCallbacks.get('update-todo');
      const result = await handler!(null, 999, { title: 'Test' });

      expect(result).toBe(false);
    });

    it('should return false when dbManager is not available', async () => {
      const contextWithoutDb = { dbManager: null } as unknown as IIPCHandlerContext;
      handlers.register(mockIpcMain, contextWithoutDb);

      const handler = handlerCallbacks.get('update-todo');
      const result = await handler!(null, 1, { title: 'Test' });

      expect(result).toBe(false);
    });

    it('should handle errors and return false', async () => {
      (mockContext.dbManager as any).updateTodo = mock(() => {
        throw new Error('Update error');
      });

      const handler = handlerCallbacks.get('update-todo');
      const result = await handler!(null, 1, { title: 'Test' });

      expect(result).toBe(false);
      expect(consoleError).toHaveBeenCalledWith('Failed to update todo:', expect.any(Error));
    });
  });

  describe('delete-todo', () => {
    beforeEach(() => {
      handlers.register(mockIpcMain, mockContext);
    });

    it('should delete a todo successfully', async () => {
      (mockContext.dbManager as any).deleteTodo = mock(() => true);

      const handler = handlerCallbacks.get('delete-todo');
      const result = await handler!(null, 1);

      expect(result).toBe(true);
      expect(mockContext.dbManager?.deleteTodo).toHaveBeenCalledWith(1);
      expect(consoleLog).toHaveBeenCalledWith('🗑️  Deleting todo:', 1);
    });

    it('should return false when todo not found', async () => {
      (mockContext.dbManager as any).deleteTodo = mock(() => false);

      const handler = handlerCallbacks.get('delete-todo');
      const result = await handler!(null, 999);

      expect(result).toBe(false);
    });

    it('should return false when dbManager is not available', async () => {
      const contextWithoutDb = { dbManager: null } as unknown as IIPCHandlerContext;
      handlers.register(mockIpcMain, contextWithoutDb);

      const handler = handlerCallbacks.get('delete-todo');
      const result = await handler!(null, 1);

      expect(result).toBe(false);
    });

    it('should handle errors and return false', async () => {
      (mockContext.dbManager as any).deleteTodo = mock(() => {
        throw new Error('Delete error');
      });

      const handler = handlerCallbacks.get('delete-todo');
      const result = await handler!(null, 1);

      expect(result).toBe(false);
      expect(consoleError).toHaveBeenCalledWith('Failed to delete todo:', expect.any(Error));
    });
  });

  describe('get-todos', () => {
    beforeEach(() => {
      handlers.register(mockIpcMain, mockContext);
    });

    it('should get all todos successfully', async () => {
      const mockTodos: Todo[] = [
        {
          id: 1,
          title: 'Todo 1',
          status: 'todo',
          priority: 'high',
          pomodoroCount: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          title: 'Todo 2',
          status: 'completed',
          priority: 'medium',
          pomodoroCount: 3,
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ];

      (mockContext.dbManager as any).getTodos = mock(() => mockTodos);

      const handler = handlerCallbacks.get('get-todos');
      const result = await handler!(null);

      expect(result).toEqual(mockTodos);
      expect(mockContext.dbManager?.getTodos).toHaveBeenCalledWith(undefined);
    });

    it('should get todos filtered by status', async () => {
      const mockTodos: Todo[] = [
        {
          id: 1,
          title: 'Todo 1',
          status: 'todo',
          priority: 'high',
          pomodoroCount: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      (mockContext.dbManager as any).getTodos = mock(() => mockTodos);

      const handler = handlerCallbacks.get('get-todos');
      const result = await handler!(null, { status: 'todo' });

      expect(result).toEqual(mockTodos);
      expect(mockContext.dbManager?.getTodos).toHaveBeenCalledWith({ status: 'todo' });
    });

    it('should get todos filtered by priority', async () => {
      const mockTodos: Todo[] = [
        {
          id: 1,
          title: 'Urgent Todo',
          status: 'todo',
          priority: 'urgent',
          pomodoroCount: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      (mockContext.dbManager as any).getTodos = mock(() => mockTodos);

      const handler = handlerCallbacks.get('get-todos');
      const result = await handler!(null, { priority: 'urgent' });

      expect(result).toEqual(mockTodos);
      expect(mockContext.dbManager?.getTodos).toHaveBeenCalledWith({ priority: 'urgent' });
    });

    it('should return empty array when dbManager is not available', async () => {
      const contextWithoutDb = { dbManager: null } as unknown as IIPCHandlerContext;
      handlers.register(mockIpcMain, contextWithoutDb);

      const handler = handlerCallbacks.get('get-todos');
      const result = await handler!(null);

      expect(result).toEqual([]);
    });

    it('should handle errors and return empty array', async () => {
      (mockContext.dbManager as any).getTodos = mock(() => {
        throw new Error('Query error');
      });

      const handler = handlerCallbacks.get('get-todos');
      const result = await handler!(null);

      expect(result).toEqual([]);
      expect(consoleError).toHaveBeenCalledWith('Failed to get todos:', expect.any(Error));
    });
  });

  describe('get-todo-by-id', () => {
    beforeEach(() => {
      handlers.register(mockIpcMain, mockContext);
    });

    it('should get a todo by id successfully', async () => {
      const mockTodo: Todo = {
        id: 1,
        title: 'Test Todo',
        status: 'todo',
        priority: 'high',
        pomodoroCount: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      (mockContext.dbManager as any).getTodo = mock(() => mockTodo);

      const handler = handlerCallbacks.get('get-todo-by-id');
      const result = await handler!(null, 1);

      expect(result).toEqual(mockTodo);
      expect(mockContext.dbManager?.getTodo).toHaveBeenCalledWith(1);
    });

    it('should return null when todo not found', async () => {
      (mockContext.dbManager as any).getTodo = mock(() => null);

      const handler = handlerCallbacks.get('get-todo-by-id');
      const result = await handler!(null, 999);

      expect(result).toBeNull();
    });

    it('should return null when dbManager is not available', async () => {
      const contextWithoutDb = { dbManager: null } as unknown as IIPCHandlerContext;
      handlers.register(mockIpcMain, contextWithoutDb);

      const handler = handlerCallbacks.get('get-todo-by-id');
      const result = await handler!(null, 1);

      expect(result).toBeNull();
    });

    it('should handle errors and return null', async () => {
      (mockContext.dbManager as any).getTodo = mock(() => {
        throw new Error('Query error');
      });

      const handler = handlerCallbacks.get('get-todo-by-id');
      const result = await handler!(null, 1);

      expect(result).toBeNull();
      expect(consoleError).toHaveBeenCalledWith('Failed to get todo:', expect.any(Error));
    });
  });

  describe('get-todo-stats', () => {
    beforeEach(() => {
      handlers.register(mockIpcMain, mockContext);
    });

    it('should get todo statistics successfully', async () => {
      const mockStats: TodoStats = {
        totalTodos: 10,
        completedTodos: 5,
        inProgressTodos: 2,
        overdueTodos: 1,
        completionRate: 50,
        avgCompletionTime: 120,
      };

      (mockContext.dbManager as any).getTodoStats = mock(() => mockStats);

      const handler = handlerCallbacks.get('get-todo-stats');
      const result = await handler!(null);

      expect(result).toEqual(mockStats);
      expect(mockContext.dbManager?.getTodoStats).toHaveBeenCalled();
    });

    it('should return default stats when dbManager is not available', async () => {
      const contextWithoutDb = { dbManager: null } as unknown as IIPCHandlerContext;
      handlers.register(mockIpcMain, contextWithoutDb);

      const handler = handlerCallbacks.get('get-todo-stats');
      const result = await handler!(null);

      expect(result).toEqual({
        totalTodos: 0,
        completedTodos: 0,
        inProgressTodos: 0,
        overdueTodos: 0,
        completionRate: 0,
        avgCompletionTime: 0,
      });
    });

    it('should handle errors and return default stats', async () => {
      (mockContext.dbManager as any).getTodoStats = mock(() => {
        throw new Error('Stats error');
      });

      const handler = handlerCallbacks.get('get-todo-stats');
      const result = await handler!(null);

      expect(result).toEqual({
        totalTodos: 0,
        completedTodos: 0,
        inProgressTodos: 0,
        overdueTodos: 0,
        completionRate: 0,
        avgCompletionTime: 0,
      });
      expect(consoleError).toHaveBeenCalledWith('Failed to get todo stats:', expect.any(Error));
    });
  });

  describe('get-todos-with-category', () => {
    beforeEach(() => {
      handlers.register(mockIpcMain, mockContext);
    });

    it('should get todos with category information successfully', async () => {
      const mockTodosWithCategory = [
        {
          id: 1,
          title: 'Work Todo',
          status: 'todo',
          priority: 'high',
          category: {
            id: 1,
            name: 'Work',
            color: '#FF0000',
          },
        },
      ];

      (mockContext.dbManager as any).getTodosWithCategory = mock(() => mockTodosWithCategory);

      const handler = handlerCallbacks.get('get-todos-with-category');
      const result = await handler!(null);

      expect(result).toEqual(mockTodosWithCategory);
      expect(mockContext.dbManager?.getTodosWithCategory).toHaveBeenCalled();
    });

    it('should return empty array when dbManager is not available', async () => {
      const contextWithoutDb = { dbManager: null } as unknown as IIPCHandlerContext;
      handlers.register(mockIpcMain, contextWithoutDb);

      const handler = handlerCallbacks.get('get-todos-with-category');
      const result = await handler!(null);

      expect(result).toEqual([]);
    });

    it('should handle errors and return empty array', async () => {
      (mockContext.dbManager as any).getTodosWithCategory = mock(() => {
        throw new Error('Query error');
      });

      const handler = handlerCallbacks.get('get-todos-with-category');
      const result = await handler!(null);

      expect(result).toEqual([]);
      expect(consoleError).toHaveBeenCalledWith('Failed to get todos with category:', expect.any(Error));
    });
  });

  describe('link-todo-time-entry', () => {
    beforeEach(() => {
      handlers.register(mockIpcMain, mockContext);
    });

    it('should link todo to time entry successfully', async () => {
      (mockContext.dbManager as any).linkTodoToTimeEntry = mock(() => true);

      const handler = handlerCallbacks.get('link-todo-time-entry');
      const result = await handler!(null, 1, 100);

      expect(result).toBe(true);
      expect(mockContext.dbManager?.linkTodoToTimeEntry).toHaveBeenCalledWith(1, 100);
      expect(consoleLog).toHaveBeenCalledWith('🔗 Linking todo 1 to time entry 100');
    });

    it('should return false when linking fails', async () => {
      (mockContext.dbManager as any).linkTodoToTimeEntry = mock(() => false);

      const handler = handlerCallbacks.get('link-todo-time-entry');
      const result = await handler!(null, 999, 100);

      expect(result).toBe(false);
    });

    it('should return false when dbManager is not available', async () => {
      const contextWithoutDb = { dbManager: null } as unknown as IIPCHandlerContext;
      handlers.register(mockIpcMain, contextWithoutDb);

      const handler = handlerCallbacks.get('link-todo-time-entry');
      const result = await handler!(null, 1, 100);

      expect(result).toBe(false);
    });

    it('should handle errors and return false', async () => {
      (mockContext.dbManager as any).linkTodoToTimeEntry = mock(() => {
        throw new Error('Link error');
      });

      const handler = handlerCallbacks.get('link-todo-time-entry');
      const result = await handler!(null, 1, 100);

      expect(result).toBe(false);
      expect(consoleError).toHaveBeenCalledWith('Failed to link todo to time entry:', expect.any(Error));
    });
  });

  describe('increment-todo-pomodoro', () => {
    beforeEach(() => {
      handlers.register(mockIpcMain, mockContext);
    });

    it('should increment pomodoro count successfully', async () => {
      (mockContext.dbManager as any).incrementTodoPomodoro = mock(() => true);

      const handler = handlerCallbacks.get('increment-todo-pomodoro');
      const result = await handler!(null, 1);

      expect(result).toBe(true);
      expect(mockContext.dbManager?.incrementTodoPomodoro).toHaveBeenCalledWith(1);
      expect(consoleLog).toHaveBeenCalledWith('🍅 Incrementing pomodoro count for todo 1');
    });

    it('should return false when increment fails', async () => {
      (mockContext.dbManager as any).incrementTodoPomodoro = mock(() => false);

      const handler = handlerCallbacks.get('increment-todo-pomodoro');
      const result = await handler!(null, 999);

      expect(result).toBe(false);
    });

    it('should return false when dbManager is not available', async () => {
      const contextWithoutDb = { dbManager: null } as unknown as IIPCHandlerContext;
      handlers.register(mockIpcMain, contextWithoutDb);

      const handler = handlerCallbacks.get('increment-todo-pomodoro');
      const result = await handler!(null, 1);

      expect(result).toBe(false);
    });

    it('should handle errors and return false', async () => {
      (mockContext.dbManager as any).incrementTodoPomodoro = mock(() => {
        throw new Error('Increment error');
      });

      const handler = handlerCallbacks.get('increment-todo-pomodoro');
      const result = await handler!(null, 1);

      expect(result).toBe(false);
      expect(consoleError).toHaveBeenCalledWith('Failed to increment todo pomodoro:', expect.any(Error));
    });
  });
});
