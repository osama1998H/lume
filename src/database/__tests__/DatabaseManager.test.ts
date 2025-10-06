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
    };

    (Database as unknown as jest.Mock).mockReturnValue(mockDb);
    (app.getPath as jest.Mock).mockReturnValue('/test/path');

    dbManager = new DatabaseManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleLog.mockRestore();
    consoleError.mockRestore();
  });

  describe('Constructor', () => {
    it('should create database instance with correct path', () => {
      expect(app.getPath).toHaveBeenCalledWith('userData');
      expect(Database).toHaveBeenCalledWith('/test/path/lume.db');
    });
  });

  describe('initialize', () => {
    it('should log initialization message', () => {
      dbManager.initialize();
      expect(consoleLog).toHaveBeenCalledWith('🗄️  Initializing database tables...');
    });

    it('should create time_entries table', () => {
      dbManager.initialize();
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS time_entries')
      );
    });

    it('should create app_usage table', () => {
      dbManager.initialize();
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS app_usage')
      );
    });

    it('should create indexes', () => {
      dbManager.initialize();
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX IF NOT EXISTS')
      );
    });

    it('should handle null database instance', () => {
      (dbManager as any).db = null;
      dbManager.initialize();
      
      expect(consoleError).toHaveBeenCalledWith('❌ Database instance is null, cannot initialize');
    });

    it('should attempt to add missing columns to existing table', () => {
      // Mock succeeds for table creation, then throws for ALTER TABLE
      mockExec
        .mockImplementationOnce(() => {}) // CREATE time_entries
        .mockImplementationOnce(() => {}) // CREATE app_usage
        .mockImplementationOnce(() => { throw new Error('Column exists'); }) // ALTER TABLE (category)
        .mockImplementation(() => {}); // Subsequent calls succeed

      // Should not throw despite column already existing (error is caught)
      expect(() => dbManager.initialize()).not.toThrow();
      expect(mockExec).toHaveBeenCalled();
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

    beforeEach(() => {
      const mockStmt = {
        run: jest.fn().mockReturnValue({ lastInsertRowid: 123 }),
      };
      mockPrepare.mockReturnValue(mockStmt);
    });

    it('should log insert operation with app name and category', () => {
      dbManager.addActivitySession(mockSession);
      
      expect(consoleLog).toHaveBeenCalledWith(
        `💾 DB: Inserting activity session - ${mockSession.app_name} (${mockSession.category})`
      );
    });

    it('should prepare correct SQL statement', () => {
      dbManager.addActivitySession(mockSession);
      
      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO app_usage')
      );
    });

    it('should insert session with correct values', () => {
      const mockRun = jest.fn().mockReturnValue({ lastInsertRowid: 123 });
      mockPrepare.mockReturnValue({ run: mockRun });
      
      dbManager.addActivitySession(mockSession);
      
      expect(mockRun).toHaveBeenCalledWith(
        mockSession.app_name,
        mockSession.window_title,
        mockSession.category,
        null,
        null,
        mockSession.start_time,
        mockSession.end_time,
        mockSession.duration,
        0,
        0
      );
    });

    it('should convert is_browser boolean to integer', () => {
      const browserSession = { ...mockSession, is_browser: true };
      const mockRun = jest.fn().mockReturnValue({ lastInsertRowid: 123 });
      mockPrepare.mockReturnValue({ run: mockRun });

      dbManager.addActivitySession(browserSession);

      // Check that is_browser (9th param) is converted to 1
      expect(mockRun).toHaveBeenCalled();
      const callArgs = mockRun.mock.calls[0];
      expect(callArgs[8]).toBe(1); // is_browser parameter (0-indexed)
      expect(callArgs[9]).toBe(0); // is_idle parameter
    });

    it('should set is_idle to 0 (false)', () => {
      const mockRun = jest.fn().mockReturnValue({ lastInsertRowid: 123 });
      mockPrepare.mockReturnValue({ run: mockRun });

      dbManager.addActivitySession(mockSession);

      // Check that is_idle (10th param) is always 0
      expect(mockRun).toHaveBeenCalled();
      const callArgs = mockRun.mock.calls[0];
      expect(callArgs[9]).toBe(0); // is_idle parameter (0-indexed, so index 9)
    });

    it('should return the inserted row ID', () => {
      const result = dbManager.addActivitySession(mockSession);
      expect(result).toBe(123);
    });

    it('should log success message with row ID', () => {
      dbManager.addActivitySession(mockSession);
      
      expect(consoleLog).toHaveBeenCalledWith('✅ DB: Session saved with ID: 123');
    });

    it('should handle browser sessions with domain and URL', () => {
      const browserSession: ActivitySession = {
        ...mockSession,
        is_browser: true,
        category: 'website',
        domain: 'example.com',
        url: 'https://example.com/page',
      };
      
      const mockRun = jest.fn().mockReturnValue({ lastInsertRowid: 456 });
      mockPrepare.mockReturnValue({ run: mockRun });
      
      dbManager.addActivitySession(browserSession);
      
      expect(mockRun).toHaveBeenCalledWith(
        browserSession.app_name,
        browserSession.window_title,
        browserSession.category,
        browserSession.domain,
        browserSession.url,
        browserSession.start_time,
        browserSession.end_time,
        browserSession.duration,
        1,
        0
      );
    });

    it('should throw error when database is not initialized', () => {
      (dbManager as any).db = null;
      
      expect(() => {
        dbManager.addActivitySession(mockSession);
      }).toThrow('Database not initialized');
    });

    it('should handle null optional fields correctly', () => {
      const minimalSession: ActivitySession = {
        app_name: 'MinimalApp',
        category: 'application',
        start_time: '2024-01-01T00:00:00Z',
        is_browser: false,
      };
      
      const mockRun = jest.fn().mockReturnValue({ lastInsertRowid: 789 });
      mockPrepare.mockReturnValue({ run: mockRun });
      
      dbManager.addActivitySession(minimalSession);
      
      expect(mockRun).toHaveBeenCalledWith(
        minimalSession.app_name,
        null,
        minimalSession.category,
        null,
        null,
        minimalSession.start_time,
        null,
        null,
        0,
        0
      );
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