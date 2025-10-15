import { IpcMain } from 'electron';
import { IIPCHandlerContext, IIPCHandlerGroup } from '../types';
import type { Todo, TodoStatus, TodoPriority } from '../../../types';

/**
 * TodosHandlers - IPC handlers for todo/task management
 *
 * Handles:
 * - add-todo: Create a new todo
 * - update-todo: Update an existing todo
 * - delete-todo: Delete a todo
 * - get-todos: Get all todos (with optional filters)
 * - get-todo-by-id: Get a single todo by ID
 * - get-todo-stats: Get todo statistics
 * - get-todos-with-category: Get todos with category information
 * - link-todo-time-entry: Link a todo to a time entry
 * - increment-todo-pomodoro: Increment pomodoro count for a todo
 *
 * Dependencies: DatabaseManager (via context.db)
 */
export class TodosHandlers implements IIPCHandlerGroup {
  register(ipcMain: IpcMain, context: IIPCHandlerContext): void {
    // Add todo
    ipcMain.handle('add-todo', async (_, todo: Partial<Todo>) => {
      try {
        console.log('➕ Adding todo:', todo.title);
        const todoId = context.dbManager?.addTodo(todo);
        return todoId || null;
      } catch (error) {
        console.error('Failed to add todo:', error);
        return null;
      }
    });

    // Update todo
    ipcMain.handle('update-todo', async (_, id: number, updates: Partial<Todo>) => {
      try {
        console.log('📝 Updating todo:', id);
        return context.dbManager?.updateTodo(id, updates) || false;
      } catch (error) {
        console.error('Failed to update todo:', error);
        return false;
      }
    });

    // Delete todo
    ipcMain.handle('delete-todo', async (_, id: number) => {
      try {
        console.log('🗑️  Deleting todo:', id);
        return context.dbManager?.deleteTodo(id) || false;
      } catch (error) {
        console.error('Failed to delete todo:', error);
        return false;
      }
    });

    // Get todos with optional filters
    ipcMain.handle('get-todos', async (_, options?: { status?: TodoStatus; priority?: TodoPriority }) => {
      try {
        return context.dbManager?.getTodos(options) || [];
      } catch (error) {
        console.error('Failed to get todos:', error);
        return [];
      }
    });

    // Get single todo by ID
    ipcMain.handle('get-todo-by-id', async (_, id: number) => {
      try {
        return context.dbManager?.getTodo(id) || null;
      } catch (error) {
        console.error('Failed to get todo:', error);
        return null;
      }
    });

    // Get todo statistics
    ipcMain.handle('get-todo-stats', async () => {
      try {
        return context.dbManager?.getTodoStats() || {
          totalTodos: 0,
          completedTodos: 0,
          inProgressTodos: 0,
          overdueTodos: 0,
          completionRate: 0,
          avgCompletionTime: 0,
        };
      } catch (error) {
        console.error('Failed to get todo stats:', error);
        return {
          totalTodos: 0,
          completedTodos: 0,
          inProgressTodos: 0,
          overdueTodos: 0,
          completionRate: 0,
          avgCompletionTime: 0,
        };
      }
    });

    // Get todos with category information
    ipcMain.handle('get-todos-with-category', async () => {
      try {
        return context.dbManager?.getTodosWithCategory() || [];
      } catch (error) {
        console.error('Failed to get todos with category:', error);
        return [];
      }
    });

    // Link todo to time entry
    ipcMain.handle('link-todo-time-entry', async (_, todoId: number, timeEntryId: number) => {
      try {
        console.log(`🔗 Linking todo ${todoId} to time entry ${timeEntryId}`);
        return context.dbManager?.linkTodoToTimeEntry(todoId, timeEntryId) || false;
      } catch (error) {
        console.error('Failed to link todo to time entry:', error);
        return false;
      }
    });

    // Increment pomodoro count
    ipcMain.handle('increment-todo-pomodoro', async (_, todoId: number) => {
      try {
        console.log(`🍅 Incrementing pomodoro count for todo ${todoId}`);
        return context.dbManager?.incrementTodoPomodoro(todoId) || false;
      } catch (error) {
        console.error('Failed to increment todo pomodoro:', error);
        return false;
      }
    });
  }
}
