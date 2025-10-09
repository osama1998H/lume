import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, Square, SkipForward, Coffee, TrendingUp, Award } from 'lucide-react';
import { PomodoroStats, Tag } from '../types';
import { usePomodoro, SessionType } from '../contexts/PomodoroContext';
import Button from './ui/Button';
import Input from './ui/Input';
import StatCard from './ui/StatCard';
import Skeleton from './ui/Skeleton';
import TagSelector from './ui/TagSelector';

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
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
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
  const handleStartSession = async () => {
    const task = taskInput.trim() || status.currentTask || 'Focus Session';
    await startSession(task, status.sessionType);

    // Save tags if any selected and session ID is available
    if (selectedTags.length > 0 && status.currentSessionId && window.electronAPI) {
      try {
        const tagIds = selectedTags
          .map((tag) => tag.id)
          .filter((id): id is number => id != null);
        await window.electronAPI.addPomodoroSessionTags(status.currentSessionId, tagIds);
      } catch (error) {
        console.error('Failed to add tags to pomodoro session:', error);
      }
    }

    setTaskInput('');
    setSelectedTags([]);
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
      <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6 lg:space-y-8">
        <div className="space-y-2">
          <Skeleton width="200px" height="32px" />
          <Skeleton width="300px" height="20px" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <Skeleton variant="rectangular" height="400px" />
          </div>
          <Skeleton variant="rectangular" height="400px" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto h-full">
      <div className="mb-6 lg:mb-8 animate-fade-in">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('focusMode.title')}
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('focusMode.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Timer Section */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Circular Timer */}
          <div className="card flex flex-col items-center justify-center py-8 sm:py-10 md:py-12">
            <div className="relative inline-flex items-center justify-center mb-4 sm:mb-6">
              {/* SVG Circle Progress */}
              <svg className="timer-circle transform -rotate-90" viewBox="0 0 280 280">
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
                <span className={`text-3xl sm:text-4xl md:text-5xl font-bold ${getSessionColor(status.sessionType)}`}>
                  {formatTime(
                    status.timeRemaining !== undefined && status.timeRemaining !== null
                      ? status.timeRemaining
                      : status.totalDuration
                  )}
                </span>
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {getSessionTypeLabel(status.sessionType)}
                </span>
              </div>
            </div>

            {/* Task Display/Input */}
            {status.state === 'idle' && status.sessionType === 'focus' ? (
              <div className="w-full max-w-md mb-4 sm:mb-6 space-y-3 sm:space-y-4">
                <Input
                  type="text"
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  placeholder={t('focusMode.taskPlaceholder')}
                  aria-label={t('focusMode.taskPlaceholder')}
                  icon={Coffee}
                  iconPosition="left"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (taskInput.trim() || status.currentTask)) {
                      handleStartSession();
                    }
                  }}
                />
                <div>
                  <label htmlFor="focus-tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('focusMode.tags')}
                  </label>
                  <TagSelector
                    selectedTags={selectedTags}
                    onChange={setSelectedTags}
                    allowCreate={true}
                    placeholder={t('focusMode.tagsPlaceholder')}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center mb-4 sm:mb-6">
                <p className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100">
                  {status.currentTask}
                </p>
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-2 sm:gap-3">
              {status.state === 'idle' && (
                <Button
                  onClick={handleStartSession}
                  disabled={status.sessionType === 'focus' && !taskInput.trim() && !status.currentTask}
                  variant="primary"
                  size="lg"
                  icon={Play}
                  className="px-8"
                >
                  {t('focusMode.startFocus')}
                </Button>
              )}

              {status.state === 'running' && (
                <>
                  <Button
                    onClick={pauseSession}
                    variant="secondary"
                    size="lg"
                    icon={Pause}
                  >
                    {t('focusMode.pause')}
                  </Button>
                  <Button
                    onClick={stopSession}
                    variant="danger"
                    size="lg"
                    icon={Square}
                  >
                    {t('focusMode.stop')}
                  </Button>
                  <Button
                    onClick={skipSession}
                    variant="ghost"
                    size="lg"
                    icon={SkipForward}
                  >
                    {t('focusMode.skip')}
                  </Button>
                </>
              )}

              {status.state === 'paused' && (
                <>
                  <Button
                    onClick={resumeSession}
                    variant="primary"
                    size="lg"
                    icon={Play}
                  >
                    {t('focusMode.resume')}
                  </Button>
                  <Button
                    onClick={stopSession}
                    variant="danger"
                    size="lg"
                    icon={Square}
                  >
                    {t('focusMode.stop')}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Session Info */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <StatCard
              icon={Award}
              title={t('focusMode.sessionsCompleted')}
              value={status.sessionsCompleted}
              colorScheme="primary"
            />
            <StatCard
              icon={TrendingUp}
              title={t('focusMode.stats.dailyGoal')}
              value={`${stats?.completedSessions || 0} / ${settings.dailyGoal}`}
              colorScheme="green"
            />
          </div>
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-4 sm:space-y-6">
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
                <span className="text-gray-600 dark:text-gray-400">{t('focusMode.settings.focus')}</span>
                <span className="font-medium dark:text-gray-200">{settings.focusDuration}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('focusMode.settings.shortBreak')}</span>
                <span className="font-medium dark:text-gray-200">{settings.shortBreakDuration}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('focusMode.settings.longBreak')}</span>
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
