import { PomodoroService } from '../PomodoroService';
import { DatabaseManager } from '../../../database/DatabaseManager';
import { NotificationService } from '../../notifications/NotificationService';
import { PomodoroSettings } from '../../../types';

// Mock dependencies
jest.mock('../../../database/DatabaseManager');
jest.mock('../../notifications/NotificationService');

describe('PomodoroService', () => {
  let service: PomodoroService;
  let mockDbManager: jest.Mocked<DatabaseManager>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let consoleLog: jest.SpyInstance;

  const defaultSettings: PomodoroSettings = {
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
    autoStartBreaks: false,
    autoStartFocus: false,
    soundEnabled: true,
    notificationsEnabled: true,
    dailyGoal: 8,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    consoleLog = jest.spyOn(console, 'log').mockImplementation();

    let sessionIdCounter = 0;
    mockDbManager = {
      addPomodoroSession: jest.fn().mockImplementation(() => ++sessionIdCounter),
      updatePomodoroSession: jest.fn().mockReturnValue(true),
    } as any;

    mockNotificationService = {
      notifyFocusComplete: jest.fn(),
      notifyBreakComplete: jest.fn(),
      updateSettings: jest.fn(),
    } as any;

    service = new PomodoroService(mockDbManager, mockNotificationService, defaultSettings);
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleLog.mockRestore();
    service.destroy();
  });

  describe('Constructor', () => {
    it('should initialize with provided settings', () => {
      const settings = service.getSettings();
      expect(settings).toEqual(defaultSettings);
    });

    it('should initialize with default settings if not provided', () => {
      const serviceWithDefaults = new PomodoroService(mockDbManager, mockNotificationService);
      const settings = serviceWithDefaults.getSettings();
      expect(settings.focusDuration).toBe(25);
      expect(settings.shortBreakDuration).toBe(5);
      expect(settings.longBreakDuration).toBe(15);
      serviceWithDefaults.destroy();
    });

    it('should initialize with default settings if empty object provided', () => {
      const serviceWithEmpty = new PomodoroService(mockDbManager, mockNotificationService, {} as any);
      const settings = serviceWithEmpty.getSettings();
      expect(settings.focusDuration).toBe(25);
      expect(settings.shortBreakDuration).toBe(5);
      expect(settings.longBreakDuration).toBe(15);
      serviceWithEmpty.destroy();
    });

    it('should merge partial settings with defaults', () => {
      const partialSettings = { focusDuration: 30 } as any;
      const serviceWithPartial = new PomodoroService(mockDbManager, mockNotificationService, partialSettings);
      const settings = serviceWithPartial.getSettings();
      expect(settings.focusDuration).toBe(30); // Custom value
      expect(settings.shortBreakDuration).toBe(5); // Default value
      expect(settings.longBreakDuration).toBe(15); // Default value
      serviceWithPartial.destroy();
    });

    it('should initialize with idle state', () => {
      const status = service.getStatus();
      expect(status.state).toBe('idle');
      expect(status.timeRemaining).toBe(0);
      expect(status.sessionsCompleted).toBe(0);
    });
  });

  describe('updateSettings', () => {
    it('should update settings', () => {
      const newSettings: PomodoroSettings = {
        ...defaultSettings,
        focusDuration: 30,
      };

      service.updateSettings(newSettings);

      expect(service.getSettings().focusDuration).toBe(30);
    });

    it('should update notification service settings', () => {
      service.updateSettings({ ...defaultSettings, soundEnabled: false });

      expect(mockNotificationService.updateSettings).toHaveBeenCalledWith(false, true);
    });

    it('should log settings update', () => {
      service.updateSettings(defaultSettings);

      expect(consoleLog).toHaveBeenCalledWith('⚙️  Pomodoro settings updated');
    });
  });

  describe('start', () => {
    it('should start a focus session', () => {
      service.start('Test Task', 'focus');

      const status = service.getStatus();
      expect(status.state).toBe('running');
      expect(status.sessionType).toBe('focus');
      expect(status.currentTask).toBe('Test Task');
      expect(status.timeRemaining).toBe(25 * 60);
      expect(status.totalDuration).toBe(25 * 60);
    });

    it('should start a short break session', () => {
      service.start('Break', 'shortBreak');

      const status = service.getStatus();
      expect(status.sessionType).toBe('shortBreak');
      expect(status.timeRemaining).toBe(5 * 60);
    });

    it('should start a long break session', () => {
      service.start('Long Break', 'longBreak');

      const status = service.getStatus();
      expect(status.sessionType).toBe('longBreak');
      expect(status.timeRemaining).toBe(15 * 60);
    });

    it('should not start if already running', () => {
      service.start('Task 1', 'focus');
      service.start('Task 2', 'focus');

      expect(service.getStatus().currentTask).toBe('Task 1');
    });

    it('should add session to database', () => {
      service.start('Test Task', 'focus');

      expect(mockDbManager.addPomodoroSession).toHaveBeenCalledWith(
        expect.objectContaining({
          task: 'Test Task',
          sessionType: 'focus',
          duration: 25 * 60,
          completed: false,
          interrupted: false,
        })
      );
    });

    it('should emit start event', (done) => {
      service.on('start', (status) => {
        expect(status.state).toBe('running');
        done();
      });

      service.start('Test Task', 'focus');
    });

    it('should emit stateChange event', (done) => {
      service.on('stateChange', (status) => {
        expect(status.state).toBe('running');
        done();
      });

      service.start('Test Task', 'focus');
    });

    it('should log session start', () => {
      service.start('Test Task', 'focus');

      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Pomodoro started: focus - "Test Task"')
      );
    });
  });

  describe('pause', () => {
    it('should pause a running session', () => {
      service.start('Test Task', 'focus');
      service.pause();

      expect(service.getStatus().state).toBe('paused');
    });

    it('should not pause if not running', () => {
      service.pause();

      expect(service.getStatus().state).toBe('idle');
    });

    it('should emit pause event', (done) => {
      service.start('Test Task', 'focus');

      service.on('pause', (status) => {
        expect(status.state).toBe('paused');
        done();
      });

      service.pause();
    });
  });

  describe('resume', () => {
    it('should resume a paused session', () => {
      service.start('Test Task', 'focus');
      service.pause();
      service.resume();

      expect(service.getStatus().state).toBe('running');
    });

    it('should not resume if not paused', () => {
      service.resume();

      expect(service.getStatus().state).toBe('idle');
    });

    it('should emit resume event', (done) => {
      service.start('Test Task', 'focus');
      service.pause();

      service.on('resume', (status) => {
        expect(status.state).toBe('running');
        done();
      });

      service.resume();
    });
  });

  describe('stop', () => {
    it('should stop a running session', () => {
      service.start('Test Task', 'focus');
      service.stop();

      expect(service.getStatus().state).toBe('idle');
    });

    it('should mark session as interrupted in database', () => {
      service.start('Test Task', 'focus');
      service.stop();

      expect(mockDbManager.updatePomodoroSession).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          interrupted: true,
          completed: false,
        })
      );
    });

    it('should emit stop event', (done) => {
      service.start('Test Task', 'focus');

      service.on('stop', (status) => {
        expect(status.state).toBe('idle');
        done();
      });

      service.stop();
    });

    it('should not stop if idle', () => {
      service.stop();

      expect(mockDbManager.updatePomodoroSession).not.toHaveBeenCalled();
    });
  });

  describe('skip', () => {
    it('should skip current session', () => {
      service.start('Test Task', 'focus');
      service.skip();

      const status = service.getStatus();
      expect(status.state).toBe('idle');
    });

    it('should complete the current session', () => {
      service.start('Test Task', 'focus');
      service.skip();

      expect(mockDbManager.updatePomodoroSession).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          completed: true,
          interrupted: false,
        })
      );
    });

    it('should auto-start next session if enabled', () => {
      const autoStartSettings = { ...defaultSettings, autoStartBreaks: true };
      service.updateSettings(autoStartSettings);

      service.start('Test Task', 'focus');
      service.skip();

      // After focus, should auto-start short break
      const status = service.getStatus();
      expect(status.state).toBe('running');
      expect(status.sessionType).toBe('shortBreak');
    });

    it('should not auto-start if disabled', () => {
      service.start('Test Task', 'focus');
      service.skip();

      expect(service.getStatus().state).toBe('idle');
    });

    it('should not skip if idle', () => {
      service.skip();

      expect(mockDbManager.updatePomodoroSession).not.toHaveBeenCalled();
    });
  });

  describe('Timer tick', () => {
    it('should decrement time remaining every second', () => {
      service.start('Test Task', 'focus');
      const initialTime = service.getStatus().timeRemaining;

      jest.advanceTimersByTime(1000);

      expect(service.getStatus().timeRemaining).toBe(initialTime - 1);
    });

    it('should emit tick event', (done) => {
      service.start('Test Task', 'focus');

      service.on('tick', () => {
        done();
      });

      jest.advanceTimersByTime(1000);
    });

    it('should complete session when time reaches zero', () => {
      service.start('Test Task', 'focus');

      // Fast-forward to end of session
      jest.advanceTimersByTime(25 * 60 * 1000);

      expect(mockDbManager.updatePomodoroSession).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          completed: true,
        })
      );
    });

    it('should notify when focus session completes', () => {
      service.start('Test Task', 'focus');

      jest.advanceTimersByTime(25 * 60 * 1000);

      expect(mockNotificationService.notifyFocusComplete).toHaveBeenCalledWith('Test Task');
    });

    it('should notify when break session completes', () => {
      service.start('Break', 'shortBreak');

      jest.advanceTimersByTime(5 * 60 * 1000);

      expect(mockNotificationService.notifyBreakComplete).toHaveBeenCalled();
    });
  });

  describe('Session type progression', () => {
    it('should progress from focus to short break', () => {
      service.start('Test Task', 'focus');
      jest.advanceTimersByTime(25 * 60 * 1000);

      // Check that next session type would be short break
      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Session completed: focus')
      );
    });

    it('should progress to long break after 4 focus sessions', () => {
      const autoSettings = { ...defaultSettings, autoStartBreaks: true, autoStartFocus: true };
      service.updateSettings(autoSettings);

      // Complete 4 focus sessions
      for (let i = 0; i < 4; i++) {
        service.start('Test Task', 'focus');
        jest.advanceTimersByTime(25 * 60 * 1000 + 1000); // Complete focus
        jest.advanceTimersByTime(5 * 60 * 1000 + 1000); // Complete break
      }

      // The 4th completion should trigger long break
      expect(service.getStatus().sessionsCompleted).toBe(4);
    });

    it('should increment sessions completed counter only for focus sessions', () => {
      service.start('Test Task', 'focus');
      jest.advanceTimersByTime(25 * 60 * 1000);

      expect(service.getStatus().sessionsCompleted).toBe(1);

      service.start('Break', 'shortBreak');
      jest.advanceTimersByTime(5 * 60 * 1000);

      // Should still be 1, breaks don't increment
      expect(service.getStatus().sessionsCompleted).toBe(1);
    });

    it('should properly reset state before auto-starting next session', () => {
      const autoSettings = { ...defaultSettings, autoStartBreaks: true };
      service.updateSettings(autoSettings);

      service.start('Test Task', 'focus');
      const firstSessionId = service.getStatus().currentSessionId;

      // Complete the focus session
      jest.advanceTimersByTime(25 * 60 * 1000);

      // Wait for the 1 second delay before auto-start
      jest.advanceTimersByTime(1000);

      const status = service.getStatus();
      // Should have auto-started short break with new session
      expect(status.state).toBe('running');
      expect(status.sessionType).toBe('shortBreak');
      expect(status.timeRemaining).toBe(5 * 60);
      expect(status.currentSessionId).not.toBe(firstSessionId);
    });
  });

  describe('getStatus', () => {
    it('should return current status', () => {
      service.start('Test Task', 'focus');

      const status = service.getStatus();

      expect(status).toEqual({
        state: 'running',
        sessionType: 'focus',
        timeRemaining: 25 * 60,
        totalDuration: 25 * 60,
        currentTask: 'Test Task',
        sessionsCompleted: 0,
        currentSessionId: 1,
      });
    });
  });

  describe('getSettings', () => {
    it('should return a copy of settings', () => {
      const settings = service.getSettings();
      settings.focusDuration = 999;

      // Original should not be modified
      expect(service.getSettings().focusDuration).toBe(25);
    });
  });

  describe('destroy', () => {
    it('should stop interval', () => {
      service.start('Test Task', 'focus');
      service.destroy();

      const timeBefore = service.getStatus().timeRemaining;
      jest.advanceTimersByTime(1000);
      const timeAfter = service.getStatus().timeRemaining;

      // Time should not change after destroy
      expect(timeAfter).toBe(timeBefore);
    });

    it('should remove all listeners', () => {
      const listener = jest.fn();
      service.on('tick', listener);

      service.destroy();
      service.start('Test Task', 'focus');
      jest.advanceTimersByTime(1000);

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
