import { EventEmitter } from 'events';
import { PomodoroSettings, PomodoroSession } from '../types';
import { DatabaseManager } from '../database/DatabaseManager';
import { NotificationService } from './NotificationService';

export type PomodoroTimerState = 'idle' | 'running' | 'paused';
export type SessionType = 'focus' | 'shortBreak' | 'longBreak';

export interface PomodoroTimerStatus {
  state: PomodoroTimerState;
  sessionType: SessionType;
  timeRemaining: number; // in seconds
  totalDuration: number; // in seconds
  currentTask: string;
  sessionsCompleted: number;
  currentSessionId?: number;
}

/**
 * PomodoroService manages the Pomodoro timer logic
 * Emits events: 'tick', 'complete', 'start', 'pause', 'stop', 'stateChange'
 */
export class PomodoroService extends EventEmitter {
  private state: PomodoroTimerState = 'idle';
  private sessionType: SessionType = 'focus';
  private timeRemaining: number = 0; // in seconds
  private totalDuration: number = 0; // in seconds
  private currentTask: string = '';
  private sessionsCompleted: number = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private startTime: Date | null = null;
  private currentSessionId?: number;

  private settings: PomodoroSettings;
  private dbManager: DatabaseManager;
  private notificationService: NotificationService;

  constructor(
    dbManager: DatabaseManager,
    notificationService: NotificationService,
    settings?: PomodoroSettings
  ) {
    super();
    this.dbManager = dbManager;
    this.notificationService = notificationService;
    // Merge provided settings with defaults, ensuring all required fields exist
    const defaultSettings = this.getDefaultSettings();
    this.settings = settings && Object.keys(settings).length > 0
      ? { ...defaultSettings, ...settings }
      : defaultSettings;
  }

  /**
   * Get default Pomodoro settings
   */
  private getDefaultSettings(): PomodoroSettings {
    return {
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
  }

  /**
   * Update settings
   */
  updateSettings(settings: PomodoroSettings): void {
    this.settings = settings;
    this.notificationService.updateSettings(settings.soundEnabled, settings.notificationsEnabled);
    console.log('⚙️  Pomodoro settings updated');
  }

  /**
   * Start a new session
   */
  start(task: string, sessionType: SessionType = 'focus'): void {
    if (this.state === 'running') {
      console.warn('⚠️  Timer already running');
      return;
    }

    this.currentTask = task;
    this.sessionType = sessionType;
    this.state = 'running';
    this.startTime = new Date();

    // Set duration based on session type
    switch (sessionType) {
      case 'focus':
        this.totalDuration = this.settings.focusDuration * 60;
        break;
      case 'shortBreak':
        this.totalDuration = this.settings.shortBreakDuration * 60;
        break;
      case 'longBreak':
        this.totalDuration = this.settings.longBreakDuration * 60;
        break;
    }

    this.timeRemaining = this.totalDuration;

    // Save session start to database
    const session: PomodoroSession = {
      task,
      sessionType,
      duration: this.totalDuration,
      startTime: this.startTime.toISOString(),
      completed: false,
      interrupted: false,
    };

    this.currentSessionId = this.dbManager.addPomodoroSession(session);

    // Start the timer
    this.startInterval();

    this.emit('start', this.getStatus());
    this.emit('stateChange', this.getStatus());

    console.log(`▶️  Pomodoro started: ${sessionType} - "${task}" (${this.totalDuration}s)`);
  }

  /**
   * Pause the timer
   */
  pause(): void {
    if (this.state !== 'running') {
      console.warn('⚠️  Timer not running');
      return;
    }

    this.state = 'paused';
    this.stopInterval();

    this.emit('pause', this.getStatus());
    this.emit('stateChange', this.getStatus());

    console.log('⏸️  Pomodoro paused');
  }

  /**
   * Resume the timer
   */
  resume(): void {
    if (this.state !== 'paused') {
      console.warn('⚠️  Timer not paused');
      return;
    }

    this.state = 'running';
    this.startInterval();

    this.emit('resume', this.getStatus());
    this.emit('stateChange', this.getStatus());

    console.log('▶️  Pomodoro resumed');
  }

  /**
   * Stop the timer (mark as interrupted)
   */
  stop(): void {
    if (this.state === 'idle') {
      console.warn('⚠️  Timer not active');
      return;
    }

    // Mark session as interrupted
    if (this.currentSessionId && this.startTime) {
      this.dbManager.updatePomodoroSession(this.currentSessionId, {
        endTime: new Date().toISOString(),
        interrupted: true,
        completed: false,
      });
    }

    this.reset();

    this.emit('stop', this.getStatus());
    this.emit('stateChange', this.getStatus());

    console.log('⏹️  Pomodoro stopped');
  }

  /**
   * Skip to next session
   */
  skip(): void {
    if (this.state === 'idle') {
      console.warn('⚠️  Timer not active');
      return;
    }

    // Complete current session
    this.completeSession();

    // Start next session automatically if enabled
    const nextSessionType = this.getNextSessionType();
    const autoStart = nextSessionType === 'focus'
      ? this.settings.autoStartFocus
      : this.settings.autoStartBreaks;

    if (autoStart) {
      this.start(this.currentTask, nextSessionType);
    } else {
      this.reset();
      this.emit('stateChange', this.getStatus());
    }

    console.log('⏭️  Pomodoro skipped');
  }

  /**
   * Reset the timer
   */
  private reset(): void {
    this.stopInterval();
    this.state = 'idle';
    this.timeRemaining = 0;
    this.totalDuration = 0;
    this.startTime = null;
    this.currentSessionId = undefined;
  }

  /**
   * Start the interval
   */
  private startInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);
  }

  /**
   * Stop the interval
   */
  private stopInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Timer tick
   */
  private tick(): void {
    if (this.state !== 'running') return;

    this.timeRemaining--;

    this.emit('tick', this.getStatus());

    // Check if session complete
    if (this.timeRemaining <= 0) {
      this.onSessionComplete();
    }
  }

  /**
   * Handle session completion
   */
  private onSessionComplete(): void {
    this.completeSession();

    // Show notification
    if (this.sessionType === 'focus') {
      this.notificationService.notifyFocusComplete(this.currentTask);
    } else {
      this.notificationService.notifyBreakComplete();
    }

    // Get next session type
    const nextSessionType = this.getNextSessionType();

    // Auto-start next session if enabled
    const autoStart = nextSessionType === 'focus'
      ? this.settings.autoStartFocus
      : this.settings.autoStartBreaks;

    if (autoStart) {
      setTimeout(() => {
        this.start(this.currentTask, nextSessionType);
      }, 1000);
    } else {
      this.reset();
      this.emit('complete', {
        ...this.getStatus(),
        nextSessionType,
      });
      this.emit('stateChange', this.getStatus());
    }
  }

  /**
   * Mark current session as completed
   */
  private completeSession(): void {
    if (this.currentSessionId && this.startTime) {
      this.dbManager.updatePomodoroSession(this.currentSessionId, {
        endTime: new Date().toISOString(),
        completed: true,
        interrupted: false,
      });
    }

    // Increment completed sessions counter for focus sessions
    if (this.sessionType === 'focus') {
      this.sessionsCompleted++;
    }

    console.log(`✅ Session completed: ${this.sessionType}`);
  }

  /**
   * Get next session type based on completed sessions
   */
  private getNextSessionType(): SessionType {
    if (this.sessionType !== 'focus') {
      return 'focus';
    }

    // Check if it's time for a long break
    if (this.sessionsCompleted % this.settings.longBreakInterval === 0 && this.sessionsCompleted > 0) {
      return 'longBreak';
    }

    return 'shortBreak';
  }

  /**
   * Get current timer status
   */
  getStatus(): PomodoroTimerStatus {
    return {
      state: this.state,
      sessionType: this.sessionType,
      timeRemaining: this.timeRemaining,
      totalDuration: this.totalDuration,
      currentTask: this.currentTask,
      sessionsCompleted: this.sessionsCompleted,
      currentSessionId: this.currentSessionId,
    };
  }

  /**
   * Get settings
   */
  getSettings(): PomodoroSettings {
    return { ...this.settings };
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.stopInterval();
    this.removeAllListeners();
  }
}
