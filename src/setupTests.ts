import '@testing-library/jest-dom';

// Mock window.matchMedia (required for components that use media queries)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.electron API (Electron IPC)
const mockElectronAPI = {
  // Time entries
  getTimeEntries: jest.fn().mockResolvedValue([]),
  createTimeEntry: jest.fn().mockResolvedValue({ id: 1 }),
  updateTimeEntry: jest.fn().mockResolvedValue(true),
  deleteTimeEntry: jest.fn().mockResolvedValue(true),

  // App usage
  getAppUsage: jest.fn().mockResolvedValue([]),

  // Stats
  getStats: jest.fn().mockResolvedValue({
    totalTime: 0,
    tasksCompleted: 0,
    activeTask: null,
  }),

  // Activity tracking
  startTracking: jest.fn().mockResolvedValue(true),
  stopTracking: jest.fn().mockResolvedValue(true),
  getCurrentActivity: jest.fn().mockResolvedValue(null),

  // Categories
  getCategories: jest.fn().mockResolvedValue([]),
  createCategory: jest.fn().mockResolvedValue({ id: 1 }),
  updateCategory: jest.fn().mockResolvedValue(true),
  deleteCategory: jest.fn().mockResolvedValue(true),

  // Tags
  getTags: jest.fn().mockResolvedValue([]),
  createTag: jest.fn().mockResolvedValue({ id: 1 }),
  updateTag: jest.fn().mockResolvedValue(true),
  deleteTag: jest.fn().mockResolvedValue(true),

  // Pomodoro
  getPomodoroSessions: jest.fn().mockResolvedValue([]),
  createPomodoroSession: jest.fn().mockResolvedValue({ id: 1 }),

  // Goals
  getGoals: jest.fn().mockResolvedValue([]),
  createGoal: jest.fn().mockResolvedValue({ id: 1 }),
  updateGoal: jest.fn().mockResolvedValue(true),
  deleteGoal: jest.fn().mockResolvedValue(true),

  // App info
  getAppVersion: jest.fn().mockResolvedValue('2.5.4'),

  // IPC listeners
  onTimeEntryUpdate: jest.fn(),
  onActivityUpdate: jest.fn(),
  removeAllListeners: jest.fn(),
};

(window as any).electron = mockElectronAPI;

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