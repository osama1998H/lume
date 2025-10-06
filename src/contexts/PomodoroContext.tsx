import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { PomodoroSettings } from '../types';

export type SessionType = 'focus' | 'shortBreak' | 'longBreak';
export type TimerState = 'idle' | 'running' | 'paused';

export interface PomodoroTimerStatus {
  state: TimerState;
  sessionType: SessionType;
  timeRemaining: number; // in seconds
  totalDuration: number; // in seconds
  currentTask: string;
  sessionsCompleted: number;
  currentSessionId?: number;
}

interface PomodoroContextType {
  status: PomodoroTimerStatus;
  settings: PomodoroSettings | null;
  startSession: (task: string, type?: SessionType) => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  stopSession: () => Promise<void>;
  skipSession: () => Promise<void>;
  loadSettings: () => Promise<void>;
  saveSettings: (settings: PomodoroSettings) => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

const defaultStatus: PomodoroTimerStatus = {
  state: 'idle',
  sessionType: 'focus',
  timeRemaining: 0,
  totalDuration: 0,
  currentTask: '',
  sessionsCompleted: 0,
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

export const PomodoroProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<PomodoroTimerStatus>(defaultStatus);
  const [settings, setSettings] = useState<PomodoroSettings | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    refreshStatus();
  }, []);

  // Poll for status updates from main process
  useEffect(() => {
    if (status.state === 'running' || status.state === 'paused') {
          intervalRef.current = setInterval(() => {
            refreshStatus();
          }, 1000);
        }
    else if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }


    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status.state]);

  const loadSettings = useCallback(async () => {
    try {
      if (window.electronAPI) {
        const pomodoroSettings = await window.electronAPI.getPomodoroSettings();
        setSettings(pomodoroSettings || defaultSettings);
      }
    } catch (error) {
      console.error('Failed to load pomodoro settings:', error);
      setSettings(defaultSettings);
    }
  }, []);

  const saveSettings = useCallback(async (newSettings: PomodoroSettings) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.savePomodoroSettings(newSettings);
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Failed to save pomodoro settings:', error);
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      if (window.electronAPI && window.electronAPI.getPomodoroStatus) {
        const currentStatus = await window.electronAPI.getPomodoroStatus();
        setStatus(currentStatus);
      }
    } catch (error) {
      console.error('Failed to refresh pomodoro status:', error);
    }
  }, []);

  const startSession = useCallback(async (task: string, type: SessionType = 'focus') => {
    try {
      if (window.electronAPI && window.electronAPI.startPomodoroSession) {
        await window.electronAPI.startPomodoroSession(task, type);
        await refreshStatus();
      }
    } catch (error) {
      console.error('Failed to start pomodoro session:', error);
    }
  }, [refreshStatus]);

  const pauseSession = useCallback(async () => {
    try {
      if (window.electronAPI && window.electronAPI.pausePomodoroSession) {
        await window.electronAPI.pausePomodoroSession();
        await refreshStatus();
      }
    } catch (error) {
      console.error('Failed to pause pomodoro session:', error);
    }
  }, [refreshStatus]);

  const resumeSession = useCallback(async () => {
    try {
      if (window.electronAPI && window.electronAPI.resumePomodoroSession) {
        await window.electronAPI.resumePomodoroSession();
        await refreshStatus();
      }
    } catch (error) {
      console.error('Failed to resume pomodoro session:', error);
    }
  }, [refreshStatus]);

  const stopSession = useCallback(async () => {
    try {
      if (window.electronAPI && window.electronAPI.stopPomodoroSession) {
        await window.electronAPI.stopPomodoroSession();
        await refreshStatus();
      }
    } catch (error) {
      console.error('Failed to stop pomodoro session:', error);
    }
  }, [refreshStatus]);

  const skipSession = useCallback(async () => {
    try {
      if (window.electronAPI && window.electronAPI.skipPomodoroSession) {
        await window.electronAPI.skipPomodoroSession();
        await refreshStatus();
      }
    } catch (error) {
      console.error('Failed to skip pomodoro session:', error);
    }
  }, [refreshStatus]);

  const value: PomodoroContextType = {
    status,
    settings,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    skipSession,
    loadSettings,
    saveSettings,
    refreshStatus,
  };

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
};

export const usePomodoro = () => {
  const context = useContext(PomodoroContext);
  if (context === undefined) {
    throw new Error('usePomodoro must be used within a PomodoroProvider');
  }
  return context;
};
