import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TimeEntry, AppUsage } from '../types';
import GoalProgressWidget from './GoalProgressWidget';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [appUsage, setAppUsage] = useState<AppUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (window.electronAPI) {
        const [entries, usage] = await Promise.all([
          window.electronAPI.getTimeEntries(),
          window.electronAPI.getAppUsage(),
        ]);
        setTimeEntries(entries);
        setAppUsage(usage);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];
    console.log('📊 Dashboard - Total entries:', timeEntries.length);
    console.log('📊 Dashboard - Today date:', today);

    const todayEntries = timeEntries.filter(entry => {
      if (!entry.startTime) return false;
      // Normalize entry.startTime to date string (YYYY-MM-DD)
      const entryDate = new Date(entry.startTime);
      // Use toISOString to get UTC date, or use toLocaleDateString for local date
      const entryDateString = entryDate.toISOString().split('T')[0];
      const isToday = entryDateString === today;
      if (isToday) {
        console.log('📊 Dashboard - Found today entry:', entry);
      }
      return isToday;
    });

    console.log('📊 Dashboard - Today entries count:', todayEntries.length);

    const totalSeconds = todayEntries.reduce((sum, entry) => {
      // Calculate duration if missing
      let {duration} = entry;
      if (!duration && entry.startTime && entry.endTime) {
        const start = new Date(entry.startTime).getTime();
        const end = new Date(entry.endTime).getTime();
        duration = Math.floor((end - start) / 1000);
      }
      return sum + (duration || 0);
    }, 0);

    console.log('📊 Dashboard - Total seconds:', totalSeconds);

    return {
      totalTime: totalSeconds,
      tasksCompleted: todayEntries.filter(entry => entry.endTime).length,
      activeTask: todayEntries.find(entry => !entry.endTime)?.task || null,
    };
  };

  const stats = getTodayStats();

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="animate-pulse-slow text-lg text-gray-600 dark:text-gray-400">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="p-8 overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('dashboard.title')}</h2>
        <p className="text-gray-600 dark:text-gray-400">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mr-4">
              <span className="text-2xl">⏰</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.todayTime')}</h3>
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {formatDuration(stats.totalTime)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mr-4">
              <span className="text-2xl">✅</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.tasksDone')}</h3>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.tasksCompleted}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 mr-4">
              <span className="text-2xl">🎯</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.activeTask')}</h3>
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400 truncate">
                {stats.activeTask || t('dashboard.noActiveTask')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-xl font-semibold mb-4 dark:text-gray-100">{t('dashboard.recentEntries')}</h3>
          <div className="space-y-3">
            {timeEntries.slice(0, 5).map((entry, index) => (
              <div key={entry.id || index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{entry.task}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(entry.startTime).toLocaleTimeString()}
                    {entry.category && ` • ${entry.category}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary-600 dark:text-primary-400">
                    {entry.duration ? formatDuration(entry.duration) : t('dashboard.active')}
                  </p>
                </div>
              </div>
            ))}
            {timeEntries.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t('dashboard.noEntries')}</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold mb-4 dark:text-gray-100">{t('dashboard.appUsageSummary')}</h3>
          <div className="space-y-3">
            {appUsage.slice(0, 5).map((usage, index) => (
              <div key={usage.id || index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{usage.appName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{usage.windowTitle}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary-600 dark:text-primary-400">
                    {usage.duration ? formatDuration(usage.duration) : t('dashboard.active')}
                  </p>
                </div>
              </div>
            ))}
            {appUsage.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t('dashboard.noAppUsage')}</p>
            )}
          </div>
        </div>

        <GoalProgressWidget />
      </div>
    </div>
  );
};

export default Dashboard;