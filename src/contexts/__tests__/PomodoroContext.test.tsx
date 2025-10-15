import { waitFor, act, renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PomodoroProvider, usePomodoro, PomodoroTimerStatus } from '../PomodoroContext';
import { PomodoroSettings } from '../../types';

// Mock window.electronAPI
const mockElectronAPI = {
  pomodoro: {
    settings: {
      get: jest.fn(),
      save: jest.fn(),
    },
    timer: {
      start: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      stop: jest.fn(),
      skip: jest.fn(),
      getStatus: jest.fn(),
    },
  },
};

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

const defaultStatus: PomodoroTimerStatus = {
  state: 'idle',
  sessionType: 'focus',
  timeRemaining: 0,
  totalDuration: 0,
  currentTask: '',
  sessionsCompleted: 0,
};

describe('PomodoroContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockElectronAPI.pomodoro.settings.get.mockResolvedValue(defaultSettings);
    mockElectronAPI.pomodoro.timer.getStatus.mockResolvedValue(defaultStatus);
    mockElectronAPI.pomodoro.settings.save.mockResolvedValue(true);
    mockElectronAPI.pomodoro.timer.start.mockResolvedValue(undefined);
    mockElectronAPI.pomodoro.timer.pause.mockResolvedValue(undefined);
    mockElectronAPI.pomodoro.timer.resume.mockResolvedValue(undefined);
    mockElectronAPI.pomodoro.timer.stop.mockResolvedValue(undefined);
    mockElectronAPI.pomodoro.timer.skip.mockResolvedValue(undefined);

    (window as any).electronAPI = mockElectronAPI;
  });

  afterEach(() => {
    jest.useRealTimers();
    delete (window as any).electronAPI;
  });

  describe('Provider Initialization', () => {
    it('should load settings on mount', async () => {
      renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      await waitFor(() => {
        expect(mockElectronAPI.pomodoro.settings.get).toHaveBeenCalled();
      });
    });

    it('should load status on mount', async () => {
      renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      await waitFor(() => {
        expect(mockElectronAPI.pomodoro.timer.getStatus).toHaveBeenCalled();
      });
    });

    it('should provide default status initially', () => {
      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      expect(result.current.status).toEqual(defaultStatus);
    });

    it('should handle missing electronAPI gracefully', async () => {
      delete (window as any).electronAPI;

      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      // Should not crash and should provide default values
      await waitFor(() => {
        expect(result.current.settings).toBeDefined();
        expect(result.current.status).toEqual(defaultStatus);
      });
    });
  });

  describe('Settings Management', () => {
    it('should load and provide settings', async () => {
      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      await waitFor(() => {
        expect(result.current.settings).toEqual(defaultSettings);
      });
    });

    it('should save settings', async () => {
      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      const newSettings: PomodoroSettings = {
        ...defaultSettings,
        focusDuration: 30,
      };

      await act(async () => {
        await result.current.saveSettings(newSettings);
      });

      expect(mockElectronAPI.pomodoro.settings.save).toHaveBeenCalledWith(newSettings);
    });

    it('should update local settings after save', async () => {
      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      const newSettings: PomodoroSettings = {
        ...defaultSettings,
        focusDuration: 30,
      };

      await act(async () => {
        await result.current.saveSettings(newSettings);
      });

      expect(result.current.settings?.focusDuration).toBe(30);
    });

    it('should handle save settings error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockElectronAPI.pomodoro.settings.save.mockRejectedValue(new Error('Save failed'));

      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      await act(async () => {
        await result.current.saveSettings(defaultSettings);
      });

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to save pomodoro settings:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });

    it('should reload settings', async () => {
      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      mockElectronAPI.pomodoro.settings.get.mockResolvedValueOnce({
        ...defaultSettings,
        focusDuration: 35,
      });

      await act(async () => {
        await result.current.loadSettings();
      });

      expect(result.current.settings?.focusDuration).toBe(35);
    });
  });

  describe('Status Management', () => {
    it('should refresh status on demand', async () => {
      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      const newStatus: PomodoroTimerStatus = {
        ...defaultStatus,
        state: 'running',
        timeRemaining: 1500,
      };

      mockElectronAPI.pomodoro.timer.getStatus.mockResolvedValueOnce(newStatus);

      await act(async () => {
        await result.current.refreshStatus();
      });

      expect(result.current.status.state).toBe('running');
      expect(result.current.status.timeRemaining).toBe(1500);
    });

    it('should handle refresh status error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockElectronAPI.pomodoro.timer.getStatus.mockRejectedValue(new Error('Refresh failed'));

      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      await act(async () => {
        await result.current.refreshStatus();
      });

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to refresh pomodoro status:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe('Timer Control - Start Session', () => {
    it('should start a focus session', async () => {
      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      await act(async () => {
        await result.current.startSession('Test Task', 'focus');
      });

      expect(mockElectronAPI.pomodoro.timer.start).toHaveBeenCalledWith('Test Task', 'focus');
    });

    it('should start with default focus type', async () => {
      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      await act(async () => {
        await result.current.startSession('Test Task');
      });

      expect(mockElectronAPI.pomodoro.timer.start).toHaveBeenCalledWith('Test Task', 'focus');
    });

    it('should start a short break session', async () => {
      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      await act(async () => {
        await result.current.startSession('Break', 'shortBreak');
      });

      expect(mockElectronAPI.pomodoro.timer.start).toHaveBeenCalledWith('Break', 'shortBreak');
    });

    it('should refresh status after starting', async () => {
      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      await act(async () => {
        await result.current.startSession('Test Task');
      });

      expect(mockElectronAPI.pomodoro.timer.getStatus).toHaveBeenCalled();
    });

    it('should handle start session error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockElectronAPI.pomodoro.timer.start.mockRejectedValue(new Error('Start failed'));

      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      await act(async () => {
        await result.current.startSession('Test Task');
      });

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to start pomodoro session:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe('Timer Control - Pause Session', () => {
    it('should pause session', async () => {
      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      await act(async () => {
        await result.current.pauseSession();
      });

      expect(mockElectronAPI.pomodoro.timer.pause).toHaveBeenCalled();
    });

    it('should refresh status after pausing', async () => {
      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      await act(async () => {
        await result.current.pauseSession();
      });

      expect(mockElectronAPI.pomodoro.timer.getStatus).toHaveBeenCalled();
    });

    it('should handle pause error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockElectronAPI.pomodoro.timer.pause.mockRejectedValue(new Error('Pause failed'));

      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      await act(async () => {
        await result.current.pauseSession();
      });

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to pause pomodoro session:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe('Timer Control - Resume Session', () => {
    it('should resume session', async () => {
      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      await act(async () => {
        await result.current.resumeSession();
      });

      expect(mockElectronAPI.pomodoro.timer.resume).toHaveBeenCalled();
    });

    it('should refresh status after resuming', async () => {
      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      await act(async () => {
        await result.current.resumeSession();
      });

      expect(mockElectronAPI.pomodoro.timer.getStatus).toHaveBeenCalled();
    });

    it('should handle resume error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockElectronAPI.pomodoro.timer.resume.mockRejectedValue(new Error('Resume failed'));

      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      await act(async () => {
        await result.current.resumeSession();
      });

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to resume pomodoro session:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe('Timer Control - Stop Session', () => {
    it('should stop session', async () => {
      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      await act(async () => {
        await result.current.stopSession();
      });

      expect(mockElectronAPI.pomodoro.timer.stop).toHaveBeenCalled();
    });

    it('should refresh status after stopping', async () => {
      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      await act(async () => {
        await result.current.stopSession();
      });

      expect(mockElectronAPI.pomodoro.timer.getStatus).toHaveBeenCalled();
    });

    it('should handle stop error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockElectronAPI.pomodoro.timer.stop.mockRejectedValue(new Error('Stop failed'));

      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      await act(async () => {
        await result.current.stopSession();
      });

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to stop pomodoro session:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe('Timer Control - Skip Session', () => {
    it('should skip session', async () => {
      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      await act(async () => {
        await result.current.skipSession();
      });

      expect(mockElectronAPI.pomodoro.timer.skip).toHaveBeenCalled();
    });

    it('should refresh status after skipping', async () => {
      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      await act(async () => {
        await result.current.skipSession();
      });

      expect(mockElectronAPI.pomodoro.timer.getStatus).toHaveBeenCalled();
    });

    it('should handle skip error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockElectronAPI.pomodoro.timer.skip.mockRejectedValue(new Error('Skip failed'));

      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      await act(async () => {
        await result.current.skipSession();
      });

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to skip pomodoro session:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe('Status Polling', () => {
    it('should poll status when timer is running', async () => {
      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      const runningStatus: PomodoroTimerStatus = {
        ...defaultStatus,
        state: 'running',
        timeRemaining: 1500,
      };

      mockElectronAPI.pomodoro.timer.getStatus.mockResolvedValue(runningStatus);

      await act(async () => {
        await result.current.refreshStatus();
      });

      // Clear previous calls
      mockElectronAPI.pomodoro.timer.getStatus.mockClear();

      // Advance timers to trigger polling
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockElectronAPI.pomodoro.timer.getStatus).toHaveBeenCalled();
      });
    });

    it('should poll status when timer is paused', async () => {
      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      const pausedStatus: PomodoroTimerStatus = {
        ...defaultStatus,
        state: 'paused',
        timeRemaining: 1200,
      };

      mockElectronAPI.pomodoro.timer.getStatus.mockResolvedValue(pausedStatus);

      await act(async () => {
        await result.current.refreshStatus();
      });

      mockElectronAPI.pomodoro.timer.getStatus.mockClear();

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockElectronAPI.pomodoro.timer.getStatus).toHaveBeenCalled();
      });
    });

    it('should not poll status when timer is idle', async () => {
      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      await act(async () => {
        await result.current.refreshStatus();
      });

      mockElectronAPI.pomodoro.timer.getStatus.mockClear();

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      // Should not poll when idle
      expect(mockElectronAPI.pomodoro.timer.getStatus).not.toHaveBeenCalled();
    });
  });

  describe('usePomodoro Hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => usePomodoro());
      }).toThrow('usePomodoro must be used within a PomodoroProvider');

      consoleError.mockRestore();
    });

    it('should provide all context methods', () => {
      const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

      expect(result.current).toHaveProperty('status');
      expect(result.current).toHaveProperty('settings');
      expect(result.current).toHaveProperty('startSession');
      expect(result.current).toHaveProperty('pauseSession');
      expect(result.current).toHaveProperty('resumeSession');
      expect(result.current).toHaveProperty('stopSession');
      expect(result.current).toHaveProperty('skipSession');
      expect(result.current).toHaveProperty('loadSettings');
      expect(result.current).toHaveProperty('saveSettings');
      expect(result.current).toHaveProperty('refreshStatus');
    });
  });
});
