import { mock } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import '@testing-library/jest-dom';

// Register happy-dom globals (window, document, etc.)
GlobalRegistrator.register();

// Mock window.matchMedia (required for components that use media queries)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mock((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: mock(() => {}),
    removeListener: mock(() => {}),
    addEventListener: mock(() => {}),
    removeEventListener: mock(() => {}),
    dispatchEvent: mock(() => false),
  })),
});

// Mock window.electron API (Electron IPC)
const mockElectronAPI = {
  // Time entries
  getTimeEntries: mock(() => Promise.resolve([])),
  createTimeEntry: mock(() => Promise.resolve({ id: 1 })),
  updateTimeEntry: mock(() => Promise.resolve(true)),
  deleteTimeEntry: mock(() => Promise.resolve(true)),

  // App usage
  getAppUsage: mock(() => Promise.resolve([])),

  // Stats
  getStats: mock(() => Promise.resolve({
    totalTime: 0,
    tasksCompleted: 0,
    activeTask: null,
  })),

  // Activity tracking
  startTracking: mock(() => Promise.resolve(true)),
  stopTracking: mock(() => Promise.resolve(true)),
  getCurrentActivity: mock(() => Promise.resolve(null)),

  // Categories
  getCategories: mock(() => Promise.resolve([])),
  createCategory: mock(() => Promise.resolve({ id: 1 })),
  updateCategory: mock(() => Promise.resolve(true)),
  deleteCategory: mock(() => Promise.resolve(true)),

  // Tags
  getTags: mock(() => Promise.resolve([])),
  createTag: mock(() => Promise.resolve({ id: 1 })),
  updateTag: mock(() => Promise.resolve(true)),
  deleteTag: mock(() => Promise.resolve(true)),

  // Pomodoro
  getPomodoroSessions: mock(() => Promise.resolve([])),
  createPomodoroSession: mock(() => Promise.resolve({ id: 1 })),

  // Goals
  getGoals: mock(() => Promise.resolve([])),
  createGoal: mock(() => Promise.resolve({ id: 1 })),
  updateGoal: mock(() => Promise.resolve(true)),
  deleteGoal: mock(() => Promise.resolve(true)),

  // Todos
  todos: {
    getAll: mock(() => Promise.resolve([])),
    getById: mock(() => Promise.resolve(null)),
    add: mock(() => Promise.resolve(1)),
    update: mock(() => Promise.resolve(true)),
    delete: mock(() => Promise.resolve(true)),
    getStats: mock(() => Promise.resolve({
      totalTodos: 0,
      completedTodos: 0,
      inProgressTodos: 0,
      overdueTodos: 0,
      completionRate: 0,
      avgCompletionTime: 0,
    })),
    getWithCategory: mock(() => Promise.resolve([])),
    linkToTimeEntry: mock(() => Promise.resolve(true)),
    incrementPomodoro: mock(() => Promise.resolve(true)),
  },

  // App info
  getAppVersion: mock(() => Promise.resolve('2.5.4')),

  // IPC listeners
  onTimeEntryUpdate: mock(() => {}),
  onActivityUpdate: mock(() => {}),
  removeAllListeners: mock(() => {}),
};

(window as any).electron = mockElectronAPI;
(window as any).electronAPI = mockElectronAPI;

// Mock IntersectionObserver (required for some UI components)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() { return []; }
  unobserve() {}
} as unknown as typeof IntersectionObserver;

// Mock ResizeObserver (required for recharts and other components)
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as unknown as typeof ResizeObserver;
