import type { Tag } from './categories';

export interface PomodoroSession {
  id?: number;
  task: string;
  sessionType: 'focus' | 'shortBreak' | 'longBreak';
  duration: number; // in seconds
  startTime: string;
  endTime?: string;
  completed: boolean;
  interrupted: boolean;
  todoId?: number; // Associated todo item
  tags?: Tag[]; // Tags associated with this session
  createdAt?: string;
}

export interface PomodoroSettings {
  focusDuration: number; // in minutes, default 25
  shortBreakDuration: number; // in minutes, default 5
  longBreakDuration: number; // in minutes, default 15
  longBreakInterval: number; // after how many sessions, default 4
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  dailyGoal: number; // number of focus sessions
}

export interface PomodoroStats {
  totalSessions: number;
  completedSessions: number;
  totalFocusTime: number; // in seconds
  totalBreakTime: number; // in seconds
  completionRate: number; // percentage
  currentStreak: number; // consecutive days with completed sessions
}
