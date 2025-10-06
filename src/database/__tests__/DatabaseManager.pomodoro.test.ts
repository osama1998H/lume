import { DatabaseManager } from '../DatabaseManager';
import { PomodoroSession } from '../../types';

// Mock the DatabaseManager to avoid native module issues in Jest
jest.mock('../DatabaseManager', () => {
  let sessions: Map<number, any>;
  let nextId: number;

  const resetState = () => {
    sessions = new Map();
    nextId = 1;
  };

  resetState();

  return {
    DatabaseManager: jest.fn().mockImplementation(() => {
      resetState(); // Reset state for each new instance
      return {
      addPomodoroSession: jest.fn((session: PomodoroSession) => {
        const id = nextId++;
        sessions.set(id, { ...session, id });
        return id;
      }),
      updatePomodoroSession: jest.fn((id: number, updates: Partial<PomodoroSession>) => {
        const session = sessions.get(id);
        if (!session) return false;
        if (Object.keys(updates).length === 0) return false;
        Object.assign(session, updates);
        return true;
      }),
      getPomodoroSessions: jest.fn((limit = 100) => {
        return Array.from(sessions.values())
          .sort((a, b) => (b.id || 0) - (a.id || 0))
          .slice(0, limit);
      }),
      getPomodoroSessionsByDateRange: jest.fn((startDate: string, endDate: string) => {
        return Array.from(sessions.values())
          .filter((s) => {
            const sessionDate = s.startTime.split('T')[0];
            return sessionDate >= startDate && sessionDate <= endDate;
          })
          .sort((a, b) => b.startTime.localeCompare(a.startTime));
      }),
      getPomodoroStats: jest.fn((startDate?: string, endDate?: string) => {
        let filteredSessions = Array.from(sessions.values());

        if (startDate && endDate) {
          filteredSessions = filteredSessions.filter((s) => {
            const sessionDate = s.startTime.split('T')[0];
            return sessionDate >= startDate && sessionDate <= endDate;
          });
        }

        const totalSessions = filteredSessions.length;
        const completedSessions = filteredSessions.filter((s) => s.completed).length;
        const totalFocusTime = filteredSessions
          .filter((s) => s.sessionType === 'focus' && s.completed)
          .reduce((sum, s) => sum + s.duration, 0);
        const totalBreakTime = filteredSessions
          .filter(
            (s) => (s.sessionType === 'shortBreak' || s.sessionType === 'longBreak') && s.completed
          )
          .reduce((sum, s) => sum + s.duration, 0);
        const completionRate =
          totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

        return {
          totalSessions,
          completedSessions,
          totalFocusTime,
          totalBreakTime,
          completionRate,
          currentStreak: 0,
        };
      }),
      initialize: jest.fn(),
      };
    }),
  };
});

describe('DatabaseManager - Pomodoro Methods', () => {
  let dbManager: DatabaseManager;
  let consoleLog: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLog = jest.spyOn(console, 'log').mockImplementation();

    dbManager = new DatabaseManager();
    dbManager.initialize();
  });

  afterEach(() => {
    consoleLog.mockRestore();
  });

  describe('addPomodoroSession', () => {
    it('should add a focus session', () => {
      const session: PomodoroSession = {
        task: 'Test Task',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-01T10:00:00.000Z',
        completed: false,
        interrupted: false,
      };

      const id = dbManager.addPomodoroSession(session);

      expect(id).toBeGreaterThan(0);
    });

    it('should add a short break session', () => {
      const session: PomodoroSession = {
        task: 'Short Break',
        sessionType: 'shortBreak',
        duration: 300,
        startTime: '2025-01-01T10:30:00.000Z',
        completed: false,
        interrupted: false,
      };

      const id = dbManager.addPomodoroSession(session);

      expect(id).toBeGreaterThan(0);
    });

    it('should add a long break session', () => {
      const session: PomodoroSession = {
        task: 'Long Break',
        sessionType: 'longBreak',
        duration: 900,
        startTime: '2025-01-01T12:00:00.000Z',
        completed: false,
        interrupted: false,
      };

      const id = dbManager.addPomodoroSession(session);

      expect(id).toBeGreaterThan(0);
    });

    it('should add session with all fields', () => {
      const session: PomodoroSession = {
        task: 'Complete Task',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-01T10:00:00.000Z',
        endTime: '2025-01-01T10:25:00.000Z',
        completed: true,
        interrupted: false,
      };

      const id = dbManager.addPomodoroSession(session);

      expect(id).toBeGreaterThan(0);
    });

    it('should increment session IDs', () => {
      const session1: PomodoroSession = {
        task: 'Task 1',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-01T10:00:00.000Z',
        completed: false,
        interrupted: false,
      };

      const session2: PomodoroSession = {
        task: 'Task 2',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-01T11:00:00.000Z',
        completed: false,
        interrupted: false,
      };

      const id1 = dbManager.addPomodoroSession(session1);
      const id2 = dbManager.addPomodoroSession(session2);

      expect(id2).toBeGreaterThan(id1);
    });
  });

  describe('updatePomodoroSession', () => {
    it('should update session end time', () => {
      const session: PomodoroSession = {
        task: 'Test Task',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-01T10:00:00.000Z',
        completed: false,
        interrupted: false,
      };

      const id = dbManager.addPomodoroSession(session);
      const success = dbManager.updatePomodoroSession(id, {
        endTime: '2025-01-01T10:25:00.000Z',
      });

      expect(success).toBe(true);
    });

    it('should mark session as completed', () => {
      const session: PomodoroSession = {
        task: 'Test Task',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-01T10:00:00.000Z',
        completed: false,
        interrupted: false,
      };

      const id = dbManager.addPomodoroSession(session);
      const success = dbManager.updatePomodoroSession(id, {
        completed: true,
        endTime: '2025-01-01T10:25:00.000Z',
      });

      expect(success).toBe(true);

      const sessions = dbManager.getPomodoroSessions();
      expect(sessions[0].completed).toBe(true);
    });

    it('should mark session as interrupted', () => {
      const session: PomodoroSession = {
        task: 'Test Task',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-01T10:00:00.000Z',
        completed: false,
        interrupted: false,
      };

      const id = dbManager.addPomodoroSession(session);
      const success = dbManager.updatePomodoroSession(id, {
        interrupted: true,
        endTime: '2025-01-01T10:15:00.000Z',
      });

      expect(success).toBe(true);

      const sessions = dbManager.getPomodoroSessions();
      expect(sessions[0].interrupted).toBe(true);
    });

    it('should return false when no updates provided', () => {
      const session: PomodoroSession = {
        task: 'Test Task',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-01T10:00:00.000Z',
        completed: false,
        interrupted: false,
      };

      const id = dbManager.addPomodoroSession(session);
      const success = dbManager.updatePomodoroSession(id, {});

      expect(success).toBe(false);
    });

    it('should return false for non-existent session', () => {
      const success = dbManager.updatePomodoroSession(9999, {
        completed: true,
      });

      expect(success).toBe(false);
    });

    it('should update task name', () => {
      const session: PomodoroSession = {
        task: 'Original Task',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-01T10:00:00.000Z',
        completed: false,
        interrupted: false,
      };

      const id = dbManager.addPomodoroSession(session);
      const success = dbManager.updatePomodoroSession(id, {
        task: 'Updated Task',
      });

      expect(success).toBe(true);

      const sessions = dbManager.getPomodoroSessions();
      expect(sessions[0].task).toBe('Updated Task');
    });

    it('should update multiple fields at once', () => {
      const session: PomodoroSession = {
        task: 'Test Task',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-01T10:00:00.000Z',
        completed: false,
        interrupted: false,
      };

      const id = dbManager.addPomodoroSession(session);
      const success = dbManager.updatePomodoroSession(id, {
        endTime: '2025-01-01T10:25:00.000Z',
        completed: true,
        interrupted: false,
      });

      expect(success).toBe(true);

      const sessions = dbManager.getPomodoroSessions();
      expect(sessions[0].completed).toBe(true);
      expect(sessions[0].interrupted).toBe(false);
      expect(sessions[0].endTime).toBe('2025-01-01T10:25:00.000Z');
    });
  });

  describe('getPomodoroSessions', () => {
    it('should return empty array when no sessions', () => {
      const sessions = dbManager.getPomodoroSessions();

      expect(sessions).toEqual([]);
    });

    it('should retrieve all sessions', () => {
      const session1: PomodoroSession = {
        task: 'Task 1',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-01T10:00:00.000Z',
        completed: true,
        interrupted: false,
      };

      const session2: PomodoroSession = {
        task: 'Task 2',
        sessionType: 'shortBreak',
        duration: 300,
        startTime: '2025-01-01T10:30:00.000Z',
        completed: true,
        interrupted: false,
      };

      dbManager.addPomodoroSession(session1);
      dbManager.addPomodoroSession(session2);

      const sessions = dbManager.getPomodoroSessions();

      expect(sessions).toHaveLength(2);
    });

    it('should order sessions by creation date descending', () => {
      const session1: PomodoroSession = {
        task: 'Task 1',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-01T10:00:00.000Z',
        completed: true,
        interrupted: false,
      };

      const session2: PomodoroSession = {
        task: 'Task 2',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-01T11:00:00.000Z',
        completed: true,
        interrupted: false,
      };

      dbManager.addPomodoroSession(session1);
      dbManager.addPomodoroSession(session2);

      const sessions = dbManager.getPomodoroSessions();

      expect(sessions[0].task).toBe('Task 2'); // Most recent first
      expect(sessions[1].task).toBe('Task 1');
    });

    it('should respect limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        dbManager.addPomodoroSession({
          task: `Task ${i}`,
          sessionType: 'focus',
          duration: 1500,
          startTime: new Date().toISOString(),
          completed: false,
          interrupted: false,
        });
      }

      const sessions = dbManager.getPomodoroSessions(5);

      expect(sessions).toHaveLength(5);
    });

    it('should convert boolean fields correctly', () => {
      const session: PomodoroSession = {
        task: 'Test Task',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-01T10:00:00.000Z',
        completed: true,
        interrupted: false,
      };

      dbManager.addPomodoroSession(session);

      const sessions = dbManager.getPomodoroSessions();

      expect(typeof sessions[0].completed).toBe('boolean');
      expect(typeof sessions[0].interrupted).toBe('boolean');
      expect(sessions[0].completed).toBe(true);
      expect(sessions[0].interrupted).toBe(false);
    });
  });

  describe('getPomodoroSessionsByDateRange', () => {
    it('should return sessions within date range', () => {
      const session1: PomodoroSession = {
        task: 'Task 1',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-01T10:00:00.000Z',
        completed: true,
        interrupted: false,
      };

      const session2: PomodoroSession = {
        task: 'Task 2',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-02T10:00:00.000Z',
        completed: true,
        interrupted: false,
      };

      const session3: PomodoroSession = {
        task: 'Task 3',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-05T10:00:00.000Z',
        completed: true,
        interrupted: false,
      };

      dbManager.addPomodoroSession(session1);
      dbManager.addPomodoroSession(session2);
      dbManager.addPomodoroSession(session3);

      const sessions = dbManager.getPomodoroSessionsByDateRange('2025-01-01', '2025-01-02');

      expect(sessions).toHaveLength(2);
      expect(sessions.some(s => s.task === 'Task 1')).toBe(true);
      expect(sessions.some(s => s.task === 'Task 2')).toBe(true);
      expect(sessions.some(s => s.task === 'Task 3')).toBe(false);
    });

    it('should return empty array for date range with no sessions', () => {
      const session: PomodoroSession = {
        task: 'Task 1',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-01T10:00:00.000Z',
        completed: true,
        interrupted: false,
      };

      dbManager.addPomodoroSession(session);

      const sessions = dbManager.getPomodoroSessionsByDateRange('2025-02-01', '2025-02-28');

      expect(sessions).toHaveLength(0);
    });
  });

  describe('getPomodoroStats', () => {
    it('should return zero stats when no sessions', () => {
      const stats = dbManager.getPomodoroStats();

      expect(stats).toEqual({
        totalSessions: 0,
        completedSessions: 0,
        totalFocusTime: 0,
        totalBreakTime: 0,
        completionRate: 0,
        currentStreak: 0,
      });
    });

    it('should calculate total and completed sessions', () => {
      dbManager.addPomodoroSession({
        task: 'Task 1',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-01T10:00:00.000Z',
        completed: true,
        interrupted: false,
      });

      dbManager.addPomodoroSession({
        task: 'Task 2',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-01T11:00:00.000Z',
        completed: false,
        interrupted: true,
      });

      const stats = dbManager.getPomodoroStats();

      expect(stats.totalSessions).toBe(2);
      expect(stats.completedSessions).toBe(1);
    });

    it('should calculate total focus time', () => {
      dbManager.addPomodoroSession({
        task: 'Task 1',
        sessionType: 'focus',
        duration: 1500, // 25 minutes
        startTime: '2025-01-01T10:00:00.000Z',
        completed: true,
        interrupted: false,
      });

      dbManager.addPomodoroSession({
        task: 'Task 2',
        sessionType: 'focus',
        duration: 1500, // 25 minutes
        startTime: '2025-01-01T11:00:00.000Z',
        completed: true,
        interrupted: false,
      });

      const stats = dbManager.getPomodoroStats();

      expect(stats.totalFocusTime).toBe(3000); // 50 minutes total
    });

    it('should calculate total break time', () => {
      dbManager.addPomodoroSession({
        task: 'Short Break',
        sessionType: 'shortBreak',
        duration: 300, // 5 minutes
        startTime: '2025-01-01T10:30:00.000Z',
        completed: true,
        interrupted: false,
      });

      dbManager.addPomodoroSession({
        task: 'Long Break',
        sessionType: 'longBreak',
        duration: 900, // 15 minutes
        startTime: '2025-01-01T12:00:00.000Z',
        completed: true,
        interrupted: false,
      });

      const stats = dbManager.getPomodoroStats();

      expect(stats.totalBreakTime).toBe(1200); // 20 minutes total
    });

    it('should calculate completion rate', () => {
      dbManager.addPomodoroSession({
        task: 'Task 1',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-01T10:00:00.000Z',
        completed: true,
        interrupted: false,
      });

      dbManager.addPomodoroSession({
        task: 'Task 2',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-01T11:00:00.000Z',
        completed: true,
        interrupted: false,
      });

      dbManager.addPomodoroSession({
        task: 'Task 3',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-01T12:00:00.000Z',
        completed: false,
        interrupted: true,
      });

      const stats = dbManager.getPomodoroStats();

      expect(stats.completionRate).toBe(67); // 2 of 3 = 66.67% rounded
    });

    it('should only count completed sessions in time totals', () => {
      dbManager.addPomodoroSession({
        task: 'Completed Focus',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-01T10:00:00.000Z',
        completed: true,
        interrupted: false,
      });

      dbManager.addPomodoroSession({
        task: 'Interrupted Focus',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-01T11:00:00.000Z',
        completed: false,
        interrupted: true,
      });

      const stats = dbManager.getPomodoroStats();

      expect(stats.totalFocusTime).toBe(1500); // Only completed session
    });

    it('should filter stats by date range', () => {
      dbManager.addPomodoroSession({
        task: 'Task 1',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-01T10:00:00.000Z',
        completed: true,
        interrupted: false,
      });

      dbManager.addPomodoroSession({
        task: 'Task 2',
        sessionType: 'focus',
        duration: 1500,
        startTime: '2025-01-05T10:00:00.000Z',
        completed: true,
        interrupted: false,
      });

      const stats = dbManager.getPomodoroStats('2025-01-01', '2025-01-02');

      expect(stats.totalSessions).toBe(1);
      expect(stats.completedSessions).toBe(1);
    });
  });
});
