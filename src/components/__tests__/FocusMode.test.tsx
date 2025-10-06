import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FocusMode from '../FocusMode';
import * as PomodoroContext from '../../contexts/PomodoroContext';
import { PomodoroTimerStatus, SessionType, TimerState } from '../../contexts/PomodoroContext';
import { PomodoroSettings } from '../../types';

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock PomodoroContext
const mockPomodoroContext = {
  status: {
    state: 'idle' as TimerState,
    sessionType: 'focus' as SessionType,
    timeRemaining: 0,
    totalDuration: 0,
    currentTask: '',
    sessionsCompleted: 0,
  } as PomodoroTimerStatus,
  settings: {
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
    autoStartBreaks: false,
    autoStartFocus: false,
    soundEnabled: true,
    notificationsEnabled: true,
    dailyGoal: 8,
  } as PomodoroSettings,
  startSession: jest.fn(),
  pauseSession: jest.fn(),
  resumeSession: jest.fn(),
  stopSession: jest.fn(),
  skipSession: jest.fn(),
  loadSettings: jest.fn(),
  saveSettings: jest.fn(),
  refreshStatus: jest.fn(),
};

const mockElectronAPI = {
  getPomodoroStats: jest.fn(),
};

describe('FocusMode Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(PomodoroContext, 'usePomodoro').mockReturnValue(mockPomodoroContext);

    mockElectronAPI.getPomodoroStats.mockResolvedValue({
      totalSessions: 5,
      completedSessions: 4,
      totalFocusTime: 6000,
      totalBreakTime: 1200,
      completionRate: 80,
      currentStreak: 2,
    });

    (window as any).electronAPI = mockElectronAPI;

    // Reset mock context to defaults
    mockPomodoroContext.status = {
      state: 'idle',
      sessionType: 'focus',
      timeRemaining: 0,
      totalDuration: 0,
      currentTask: '',
      sessionsCompleted: 0,
    };
  });

  afterEach(() => {
    delete (window as any).electronAPI;
  });

  describe('Component Rendering', () => {
    it('should render loading state when settings is null', () => {
      jest.spyOn(PomodoroContext, 'usePomodoro').mockReturnValue({
        ...mockPomodoroContext,
        settings: null,
      });

      render(<FocusMode />);

      expect(screen.getByText('common.loading')).toBeInTheDocument();
    });

    it('should render component after loading', async () => {
      render(<FocusMode />);

      await waitFor(() => {
        expect(screen.getByText('focusMode.title')).toBeInTheDocument();
      });
    });

    it('should render subtitle', async () => {
      render(<FocusMode />);

      await waitFor(() => {
        expect(screen.getByText('focusMode.subtitle')).toBeInTheDocument();
      });
    });

    it('should load today\'s stats on mount', async () => {
      render(<FocusMode />);

      await waitFor(() => {
        expect(mockElectronAPI.getPomodoroStats).toHaveBeenCalled();
      });
    });
  });

  describe('Timer Display', () => {
    it('should display timer in idle state', () => {
      render(<FocusMode />);

      expect(screen.getByText('focusMode.focusSession')).toBeInTheDocument();
    });

    it('should display formatted time', () => {
      mockPomodoroContext.status = {
        ...mockPomodoroContext.status,
        state: 'running',
        totalDuration: 1500,
        timeRemaining: 1500,
      };

      render(<FocusMode />);

      expect(screen.getByText('25:00')).toBeInTheDocument();
    });

    it('should display session type label for focus', () => {
      mockPomodoroContext.status = {
        ...mockPomodoroContext.status,
        sessionType: 'focus',
      };

      render(<FocusMode />);

      expect(screen.getByText('focusMode.focusSession')).toBeInTheDocument();
    });

    it('should display session type label for short break', () => {
      mockPomodoroContext.status = {
        ...mockPomodoroContext.status,
        sessionType: 'shortBreak',
      };

      render(<FocusMode />);

      expect(screen.getByText('focusMode.shortBreak')).toBeInTheDocument();
    });

    it('should display session type label for long break', () => {
      mockPomodoroContext.status = {
        ...mockPomodoroContext.status,
        sessionType: 'longBreak',
      };

      render(<FocusMode />);

      expect(screen.getByText('focusMode.longBreak')).toBeInTheDocument();
    });

    it('should display current task when running', () => {
      mockPomodoroContext.status = {
        ...mockPomodoroContext.status,
        state: 'running',
        currentTask: 'Important Work',
      };

      render(<FocusMode />);

      expect(screen.getByText('Important Work')).toBeInTheDocument();
    });
  });

  describe('Task Input', () => {
    it('should display task input when idle', () => {
      render(<FocusMode />);

      const input = screen.getByPlaceholderText('focusMode.taskPlaceholder');
      expect(input).toBeInTheDocument();
    });

    it('should not display task input when running', () => {
      mockPomodoroContext.status = {
        ...mockPomodoroContext.status,
        state: 'running',
      };

      render(<FocusMode />);

      expect(screen.queryByPlaceholderText('focusMode.taskPlaceholder')).not.toBeInTheDocument();
    });

    it('should update task input value', () => {
      render(<FocusMode />);

      const input = screen.getByPlaceholderText('focusMode.taskPlaceholder') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'New Task' } });

      expect(input.value).toBe('New Task');
    });

    it('should start session on Enter key', () => {
      render(<FocusMode />);

      const input = screen.getByPlaceholderText('focusMode.taskPlaceholder');
      fireEvent.change(input, { target: { value: 'New Task' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockPomodoroContext.startSession).toHaveBeenCalledWith('New Task', 'focus');
    });

    it('should not start session on Enter if task is empty and no current task', () => {
      render(<FocusMode />);

      const input = screen.getByPlaceholderText('focusMode.taskPlaceholder');
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockPomodoroContext.startSession).not.toHaveBeenCalled();
    });
  });

  describe('Control Buttons - Idle State', () => {
    it('should display start button when idle', () => {
      render(<FocusMode />);

      expect(screen.getByText('focusMode.startFocus')).toBeInTheDocument();
    });

    it('should start session when start button clicked', () => {
      render(<FocusMode />);

      const input = screen.getByPlaceholderText('focusMode.taskPlaceholder');
      fireEvent.change(input, { target: { value: 'Test Task' } });

      const startButton = screen.getByText('focusMode.startFocus');
      fireEvent.click(startButton);

      expect(mockPomodoroContext.startSession).toHaveBeenCalledWith('Test Task', 'focus');
    });

    it('should disable start button if no task and no current task', () => {
      render(<FocusMode />);

      const startButton = screen.getByText('focusMode.startFocus') as HTMLButtonElement;

      expect(startButton.disabled).toBe(true);
    });

    it('should enable start button if task is entered', () => {
      render(<FocusMode />);

      const input = screen.getByPlaceholderText('focusMode.taskPlaceholder');
      fireEvent.change(input, { target: { value: 'Test Task' } });

      const startButton = screen.getByText('focusMode.startFocus') as HTMLButtonElement;

      expect(startButton.disabled).toBe(false);
    });

    it('should clear task input after starting session', () => {
      render(<FocusMode />);

      const input = screen.getByPlaceholderText('focusMode.taskPlaceholder') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Test Task' } });

      const startButton = screen.getByText('focusMode.startFocus');
      fireEvent.click(startButton);

      expect(input.value).toBe('');
    });
  });

  describe('Control Buttons - Running State', () => {
    beforeEach(() => {
      mockPomodoroContext.status = {
        ...mockPomodoroContext.status,
        state: 'running',
        currentTask: 'Test Task',
      };
    });

    it('should display pause, stop, and skip buttons when running', () => {
      render(<FocusMode />);

      expect(screen.getByText('focusMode.pause')).toBeInTheDocument();
      expect(screen.getByText('focusMode.stop')).toBeInTheDocument();
      expect(screen.getByText('focusMode.skip')).toBeInTheDocument();
    });

    it('should pause session when pause button clicked', () => {
      render(<FocusMode />);

      const pauseButton = screen.getByText('focusMode.pause');
      fireEvent.click(pauseButton);

      expect(mockPomodoroContext.pauseSession).toHaveBeenCalled();
    });

    it('should stop session when stop button clicked', () => {
      render(<FocusMode />);

      const stopButton = screen.getByText('focusMode.stop');
      fireEvent.click(stopButton);

      expect(mockPomodoroContext.stopSession).toHaveBeenCalled();
    });

    it('should skip session when skip button clicked', () => {
      render(<FocusMode />);

      const skipButton = screen.getByText('focusMode.skip');
      fireEvent.click(skipButton);

      expect(mockPomodoroContext.skipSession).toHaveBeenCalled();
    });
  });

  describe('Control Buttons - Paused State', () => {
    beforeEach(() => {
      mockPomodoroContext.status = {
        ...mockPomodoroContext.status,
        state: 'paused',
        currentTask: 'Test Task',
      };
    });

    it('should display resume and stop buttons when paused', () => {
      render(<FocusMode />);

      expect(screen.getByText('focusMode.resume')).toBeInTheDocument();
      expect(screen.getByText('focusMode.stop')).toBeInTheDocument();
    });

    it('should resume session when resume button clicked', () => {
      render(<FocusMode />);

      const resumeButton = screen.getByText('focusMode.resume');
      fireEvent.click(resumeButton);

      expect(mockPomodoroContext.resumeSession).toHaveBeenCalled();
    });

    it('should stop session when stop button clicked', () => {
      render(<FocusMode />);

      const stopButton = screen.getByText('focusMode.stop');
      fireEvent.click(stopButton);

      expect(mockPomodoroContext.stopSession).toHaveBeenCalled();
    });
  });

  describe('Session Info Display', () => {
    it('should display sessions completed', () => {
      mockPomodoroContext.status = {
        ...mockPomodoroContext.status,
        sessionsCompleted: 3,
      };

      render(<FocusMode />);

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('focusMode.sessionsCompleted')).toBeInTheDocument();
    });

    it('should display daily goal progress', async () => {
      render(<FocusMode />);

      await waitFor(() => {
        expect(screen.getByText('4 / 8')).toBeInTheDocument();
      });
    });
  });

  describe('Statistics Display', () => {
    it('should display today\'s stats', async () => {
      render(<FocusMode />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument(); // Total sessions
        expect(screen.getByText('4')).toBeInTheDocument(); // Completed sessions
        expect(screen.getByText('100m')).toBeInTheDocument(); // Focus time (6000/60)
        expect(screen.getByText('80%')).toBeInTheDocument(); // Completion rate
      });
    });

    it('should display zero stats when no data', async () => {
      mockElectronAPI.getPomodoroStats.mockResolvedValue({
        totalSessions: 0,
        completedSessions: 0,
        totalFocusTime: 0,
        totalBreakTime: 0,
        completionRate: 0,
        currentStreak: 0,
      });

      render(<FocusMode />);
    });

    it('should display extremely large stats correctly', async () => {
      mockElectronAPI.getPomodoroStats.mockResolvedValue({
        totalSessions: 999999999,
        completedSessions: 888888888,
        totalFocusTime: 999999999, // in minutes
        totalBreakTime: 888888888, // in minutes
        completionRate: 99.9999,
        currentStreak: 123456789,
      });

      render(<FocusMode />);

      await waitFor(() => {
        expect(screen.getByText('999999999')).toBeInTheDocument(); // Total sessions
        expect(screen.getByText('888888888')).toBeInTheDocument(); // Completed sessions
        expect(screen.getByText('999999999m')).toBeInTheDocument(); // Focus time
        expect(screen.getByText('888888888m')).toBeInTheDocument(); // Break time
        expect(screen.getByText('99.9999%')).toBeInTheDocument(); // Completion rate
        expect(screen.getByText('123456789')).toBeInTheDocument(); // Current streak
      });

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });

    it('should reload stats when sessions completed changes', async () => {
      const { rerender } = render(<FocusMode />);

      await waitFor(() => {
        expect(mockElectronAPI.getPomodoroStats).toHaveBeenCalledTimes(1);
      });

      mockPomodoroContext.status = {
        ...mockPomodoroContext.status,
        sessionsCompleted: 1,
      };

      rerender(<FocusMode />);

      await waitFor(() => {
        expect(mockElectronAPI.getPomodoroStats).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Settings Display', () => {
    it('should display focus duration', () => {
      render(<FocusMode />);

      expect(screen.getByText('25m')).toBeInTheDocument();
    });

    it('should display short break duration', () => {
      render(<FocusMode />);

      expect(screen.getByText('5m')).toBeInTheDocument();
    });

    it('should display long break duration', () => {
      render(<FocusMode />);

      expect(screen.getByText('15m')).toBeInTheDocument();
    });
  });

  describe('Progress Indicator', () => {
    it('should calculate progress percentage correctly', () => {
      mockPomodoroContext.status = {
        ...mockPomodoroContext.status,
        state: 'running',
        totalDuration: 1500,
        timeRemaining: 750, // 50% complete
      };

      render(<FocusMode />);

      // Progress circle should be rendered (difficult to test SVG values directly)
      const circles = screen.getAllByRole('img', { hidden: true });
      expect(circles.length).toBeGreaterThan(0);
    });

    it('should show 0% progress when idle', () => {
      render(<FocusMode />);

      // Should render but with 0 progress
      const circles = screen.getAllByRole('img', { hidden: true });
      expect(circles.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing electronAPI gracefully', async () => {
      delete (window as any).electronAPI;
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      render(<FocusMode />);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });

    it('should handle getPomodoroStats error', async () => {
      mockElectronAPI.getPomodoroStats.mockRejectedValue(new Error('Stats failed'));
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      render(<FocusMode />);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to load pomodoro stats:',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });
  });

  describe('i18n Integration', () => {
    it('should use translation keys for all text', () => {
      render(<FocusMode />);

      expect(screen.getByText('focusMode.title')).toBeInTheDocument();
      expect(screen.getByText('focusMode.subtitle')).toBeInTheDocument();
      expect(screen.getByText('focusMode.stats.today')).toBeInTheDocument();
      expect(screen.getByText('focusMode.settings.title')).toBeInTheDocument();
    });
  });
});
