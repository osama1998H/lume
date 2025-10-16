import type { Tag, Category } from './categories';

// Todo/Task Management Types
export type TodoStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';
export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Todo {
  id?: number;
  title: string;
  description?: string;
  status: TodoStatus;
  priority: TodoPriority;
  categoryId?: number;
  dueDate?: string; // ISO date string
  dueTime?: string; // HH:mm format
  completedAt?: string; // ISO timestamp
  estimatedMinutes?: number;
  actualMinutes?: number;
  timeEntryId?: number; // Link to time entry when completed
  pomodoroCount?: number; // Number of pomodoro sessions
  tags?: Tag[]; // Tags associated with this todo
  createdAt?: string;
  updatedAt?: string;
}

export interface TodoWithCategory extends Todo {
  category?: Category;
}

export interface TodoStats {
  totalTodos: number;
  completedTodos: number;
  inProgressTodos: number;
  overdueTodos: number;
  completionRate: number; // percentage
  avgCompletionTime: number; // in minutes
}
