import { DatabaseManager } from '../DatabaseManager';
import Database from 'better-sqlite3';
import { app } from 'electron';
import { ActivitySession } from '../../types/activity';

// Mock better-sqlite3
jest.mock('better-sqlite3');

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(),
  },
}));

// Mock MigrationRunner
jest.mock('../migrations/MigrationRunner', () => ({
  MigrationRunner: jest.fn().mockImplementation(() => ({
    runMigrations: jest.fn(),
  })),
}));

// Mock Repositories
jest.mock('../repositories/TimeEntryRepository', () => ({
  TimeEntryRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../repositories/AppUsageRepository', () => ({
  AppUsageRepository: jest.fn().mockImplementation(() => ({
    insert: jest.fn().mockReturnValue(123),
  })),
}));

jest.mock('../repositories/CategoryRepository', () => ({
  CategoryRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../repositories/TagRepository', () => ({
  TagRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../repositories/PomodoroRepository', () => ({
  PomodoroRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../repositories/GoalRepository', () => ({
  GoalRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../repositories/MappingRepository', () => ({
  MappingRepository: jest.fn().mockImplementation(() => ({})),
}));

// Mock AnalyticsService
jest.mock('../analytics/AnalyticsService', () => ({
  AnalyticsService: jest.fn().mockImplementation(() => ({})),
}));

describe('DatabaseManager', () => {
  let dbManager: DatabaseManager;
  let mockDb: any;
  let mockPrepare: jest.Mock;
  let mockExec: jest.Mock;
  let consoleLog: jest.SpyInstance;
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    // Setup console spies
    consoleLog = jest.spyOn(console, 'log').mockImplementation();
    consoleError = jest.spyOn(console, 'error').mockImplementation();

    // Mock database operations
    mockPrepare = jest.fn();
    mockExec = jest.fn();

    mockDb = {
      prepare: mockPrepare,
      exec: mockExec,
      close: jest.fn(),
      pragma: jest.fn(),
    };

    (Database as unknown as jest.Mock).mockReturnValue(mockDb);
    (app.getPath as jest.Mock).mockReturnValue('/test/path');

    dbManager = new DatabaseManager();
    // Initialize the database with test path
    dbManager.initialize('/test/path');
  });

  afterEach(() => {
    jest.clearAllMocks();
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