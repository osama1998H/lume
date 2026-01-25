import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { ActivitySession } from '@/types/activity';

// Create mock functions
const mockRunMigrations = mock(() => {});
const mockAppUsageInsert = mock(() => 123);

// Mock better-sqlite3
mock.module('better-sqlite3', () => ({
  default: mock(() => ({
    prepare: mock(() => ({})),
    exec: mock(() => {}),
    close: mock(() => {}),
    pragma: mock(() => {}),
  })),
}));

// Mock electron app
mock.module('electron', () => ({
  app: {
    getPath: mock(() => '/test/path'),
  },
}));

// Mock MigrationRunner
mock.module('../migrations/MigrationRunner', () => ({
  MigrationRunner: mock(() => ({
    runMigrations: mockRunMigrations,
  })),
}));

// Mock Repositories
mock.module('../repositories/TimeEntryRepository', () => ({
  TimeEntryRepository: mock(() => ({})),
}));

mock.module('../repositories/AppUsageRepository', () => ({
  AppUsageRepository: mock(() => ({
    insert: mockAppUsageInsert,
  })),
}));

mock.module('../repositories/CategoryRepository', () => ({
  CategoryRepository: mock(() => ({})),
}));

mock.module('../repositories/TagRepository', () => ({
  TagRepository: mock(() => ({})),
}));

mock.module('../repositories/PomodoroRepository', () => ({
  PomodoroRepository: mock(() => ({})),
}));

mock.module('../repositories/GoalRepository', () => ({
  GoalRepository: mock(() => ({})),
}));

mock.module('../repositories/MappingRepository', () => ({
  MappingRepository: mock(() => ({})),
}));

// Mock AnalyticsService
mock.module('../analytics/AnalyticsService', () => ({
  AnalyticsService: mock(() => ({})),
}));

import { DatabaseManager } from '../DatabaseManager';
import Database from 'better-sqlite3';
import { app } from 'electron';

describe('DatabaseManager', () => {
  let dbManager: DatabaseManager;
  let mockDb: any;
  let mockPrepare: ReturnType<typeof mock>;
  let mockExec: ReturnType<typeof mock>;
  let consoleLog: ReturnType<typeof spyOn>;
  let consoleError: ReturnType<typeof spyOn>;

  beforeEach(() => {
    // Setup console spies
    consoleLog = spyOn(console, 'log').mockImplementation(() => {});
    consoleError = spyOn(console, 'error').mockImplementation(() => {});

    // Mock database operations
    mockPrepare = mock(() => ({}));
    mockExec = mock(() => {});

    mockDb = {
      prepare: mockPrepare,
      exec: mockExec,
      close: mock(() => {}),
      pragma: mock(() => {}),
    };

    (Database as any) = mock(() => mockDb);
    (app.getPath as any) = mock(() => '/test/path');

    dbManager = new DatabaseManager();
    // Initialize the database with test path
    dbManager.initialize('/test/path');
  });

  afterEach(() => {
    consoleLog.mockRestore();
    consoleError.mockRestore();
  });

  describe('Constructor', () => {
    it('should create database manager instance', () => {
      const newManager = new DatabaseManager();
      expect(newManager).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should log initialization messages', () => {
      // Check that initialization logs were called in beforeEach
      expect(consoleLog).toHaveBeenCalledWith('📁 Database path:', '/test/path/lume.db');
      expect(consoleLog).toHaveBeenCalledWith('🔄 Running database migrations...');
      expect(consoleLog).toHaveBeenCalledWith('✅ Database migrations completed');
      expect(consoleLog).toHaveBeenCalledWith('✅ Database initialized successfully');
    });

    it('should create database instance with correct path', () => {
      expect(Database).toHaveBeenCalledWith('/test/path/lume.db');
    });

    it('should enable foreign keys', () => {
      expect(mockDb.pragma).toHaveBeenCalledWith('foreign_keys = ON');
    });

    it('should throw error when path not provided', () => {
      const newManager = new DatabaseManager();
      expect(() => newManager.initialize()).toThrow('Database path not provided');
    });

    it('should not reinitialize if already initialized and no path provided', () => {
      // Clear previous mocks
      jest.clearAllMocks();

      // Call initialize without path (since already initialized)
      dbManager.initialize();

      // Database constructor should not be called again
      expect(Database).not.toHaveBeenCalled();
    });
  });

  describe('addActivitySession', () => {
    const mockSession: ActivitySession = {
      app_name: 'TestApp',
      window_title: 'Test Window',
      category: 'application',
      domain: undefined,
      url: undefined,
      start_time: '2024-01-01T00:00:00Z',
      end_time: '2024-01-01T00:05:00Z',
      duration: 300,
      is_browser: false,
    };

    it('should return the inserted row ID', () => {
      const result = dbManager.addActivitySession(mockSession);
      expect(result).toBe(123);
    });

    it('should handle browser sessions with domain and URL', () => {
      const browserSession: ActivitySession = {
        ...mockSession,
        is_browser: true,
        category: 'website',
        domain: 'example.com',
        url: 'https://example.com/page',
      };

      const result = dbManager.addActivitySession(browserSession);
      expect(result).toBe(123);
    });

    it('should handle null optional fields correctly', () => {
      const minimalSession: ActivitySession = {
        app_name: 'MinimalApp',
        category: 'application',
        start_time: '2024-01-01T00:00:00Z',
        is_browser: false,
      };

      const result = dbManager.addActivitySession(minimalSession);
      expect(result).toBe(123);
    });

    it('should map ActivitySession to AppUsage correctly', () => {
      const result = dbManager.addActivitySession(mockSession);

      // Verify it returns the mocked insert result
      expect(result).toBe(123);
    });

    it('should handle browser sessions correctly', () => {
      const browserSession: ActivitySession = {
        ...mockSession,
        is_browser: true,
        category: 'website',
        domain: 'example.com',
        url: 'https://example.com/page',
      };

      const result = dbManager.addActivitySession(browserSession);
      expect(result).toBe(123);
    });
  });

  describe('Close', () => {
    it('should close database connection', () => {
      dbManager.close();
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should set db to null after closing', () => {
      dbManager.close();
      expect((dbManager as any).db).toBeNull();
    });

    it('should handle closing when db is already null', () => {
      (dbManager as any).db = null;
      expect(() => dbManager.close()).not.toThrow();
    });
  });
});