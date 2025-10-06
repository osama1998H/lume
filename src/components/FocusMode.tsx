import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PomodoroStats } from '../types';
import { usePomodoro, SessionType } from '../contexts/PomodoroContext';

const FocusMode: React.FC = () => {
  const { t } = useTranslation();
  const {
    status,
    settings,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    skipSession,
  } = usePomodoro();

  const [taskInput, setTaskInput] = useState('');
  const [stats, setStats] = useState<PomodoroStats | null>(null);

  // Load today's stats
  useEffect(() => {
    loadTodayStats();
  }, [status.sessionsCompleted]); // Reload when sessions completed changes

  const loadTodayStats = async () => {
    try {
      if (window.electronAPI) {
        const today = new Date().toISOString().split('T')[0];
        const pomodoroStats = await window.electronAPI.getPomodoroStats(today, today);
        setStats(pomodoroStats);
      }
    } catch (error) {
      console.error('Failed to load pomodoro stats:', error);
    }
  };

  // Handle start session
  const handleStartSession = () => {
    const task = taskInput.trim() || status.currentTask || 'Focus Session';
    startSession(task, status.sessionType);
    setTaskInput('');
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = status.totalDuration > 0
    ? ((status.totalDuration - status.timeRemaining) / status.totalDuration) * 100
    : 0;

  // Get session type label
  const getSessionTypeLabel = (type: SessionType): string => {
    switch (type) {
      case 'focus':
        return t('focusMode.focusSession');
      case 'shortBreak':
        return t('focusMode.shortBreak');
      case 'longBreak':
        return t('focusMode.longBreak');
    }
  };

  // Get session color
  const getSessionColor = (type: SessionType): string => {
    switch (type) {
      case 'focus':
        return 'text-primary-600 dark:text-primary-400';
      case 'shortBreak':
        return 'text-green-600 dark:text-green-400';
      case 'longBreak':
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  const getProgressColor = (type: SessionType): string => {
    switch (type) {
      case 'focus':
        return '#2563eb'; // primary-600
      case 'shortBreak':
        return '#16a34a'; // green-600
      case 'longBreak':
        return '#2563eb'; // blue-600
    }
  };

  if (!settings) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="animate-pulse text-lg text-gray-600 dark:text-gray-400">
          {t('common.loading')}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 overflow-y-auto h-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('focusMode.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">{t('focusMode.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Timer Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Circular Timer */}
          <div className="card flex flex-col items-center justify-center py-12">
            <div className="relative inline-flex items-center justify-center mb-6">
              {/* SVG Circle Progress */}
              <svg className="transform -rotate-90" width="280" height="280">
                <circle
                  cx="140"
                  cy="140"
                  r="120"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="140"
                  cy="140"
                  r="120"
                  stroke={getProgressColor(status.sessionType)}
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 120}`}
                  strokeDashoffset={`${2 * Math.PI * 120 * (1 - progressPercentage / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className={`text-5xl font-bold ${getSessionColor(status.sessionType)}`}>
                  {formatTime(
                    status.timeRemaining !== undefined && status.timeRemaining !== null
                      ? status.timeRemaining
                      : status.totalDuration
                  )}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {getSessionTypeLabel(status.sessionType)}
                </span>
              </div>
            </div>

            {/* Task Display/Input */}
            {status.state === 'idle' && status.sessionType === 'focus' ? (
              <div className="w-full max-w-md mb-6">
                <input
                  type="text"
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  placeholder={t('focusMode.taskPlaceholder')}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (taskInput.trim() || status.currentTask)) {
                      handleStartSession();
                    }
                  }}
                />
              </div>
            ) : (
              <div className="text-center mb-6">
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {status.currentTask}
                </p>
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-3">
              {status.state === 'idle' && (
                <button
                  onClick={handleStartSession}
                  disabled={status.sessionType === 'focus' && !taskInput.trim() && !status.currentTask}
                  className="px-8 py-3 rounded-lg font-medium bg-primary-600 hover:bg-primary-700
                           text-white disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors"
                >
                  {t('focusMode.startFocus')}
                </button>
              )}

              {status.state === 'running' && (
                <>
                  <button
                    onClick={pauseSession}
                    className="px-6 py-3 rounded-lg font-medium bg-orange-600 hover:bg-orange-700
                             text-white transition-colors"
                  >
                    {t('focusMode.pause')}
                  </button>
                  <button
                    onClick={stopSession}
                    className="px-6 py-3 rounded-lg font-medium bg-red-600 hover:bg-red-700
                             text-white transition-colors"
                  >
                    {t('focusMode.stop')}
                  </button>
                  <button
                    onClick={skipSession}
                    className="px-6 py-3 rounded-lg font-medium bg-gray-600 hover:bg-gray-700
                             text-white transition-colors"
                  >
                    {t('focusMode.skip')}
                  </button>
                </>
              )}

              {status.state === 'paused' && (
                <>
                  <button
                    onClick={resumeSession}
                    className="px-6 py-3 rounded-lg font-medium bg-green-600 hover:bg-green-700
                             text-white transition-colors"
                  >
                    {t('focusMode.resume')}
                  </button>
                  <button
                    onClick={stopSession}
                    className="px-6 py-3 rounded-lg font-medium bg-red-600 hover:bg-red-700
                             text-white transition-colors"
                  >
                    {t('focusMode.stop')}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Session Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                {t('focusMode.sessionsCompleted')}
              </h3>
              <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                {status.sessionsCompleted}
              </p>
            </div>
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                {t('focusMode.stats.dailyGoal')}
              </h3>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {stats?.completedSessions || 0} / {settings.dailyGoal}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-xl font-semibold mb-4 dark:text-gray-100">
              {t('focusMode.stats.today')}
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('focusMode.stats.totalSessions')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats?.totalSessions || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('focusMode.stats.completedSessions')}
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats?.completedSessions || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('focusMode.stats.totalFocusTime')}
                </p>
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {Math.floor((stats?.totalFocusTime || 0) / 60)}m
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('focusMode.stats.completionRate')}
                </p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {stats?.completionRate || 0}%
                </p>
              </div>
            </div>
          </div>

          {/* Quick Settings */}
          <div className="card">
            <h3 className="text-xl font-semibold mb-4 dark:text-gray-100">
              {t('focusMode.settings.title')}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Focus:</span>
                <span className="font-medium dark:text-gray-200">{settings.focusDuration}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Short Break:</span>
                <span className="font-medium dark:text-gray-200">{settings.shortBreakDuration}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Long Break:</span>
                <span className="font-medium dark:text-gray-200">{settings.longBreakDuration}m</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FocusMode;
