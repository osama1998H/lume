import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TimeEntry, AppUsage } from '../types';
import GoalProgressWidget from './GoalProgressWidget';
import StatCard from './ui/StatCard';
import ActivityListCard from './ui/ActivityListCard';

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
        <StatCard
          icon="⏰"
          title={t('dashboard.todayTime')}
          value={formatDuration(stats.totalTime)}
          colorScheme="primary"
        />
        <StatCard
          icon="✅"
          title={t('dashboard.tasksDone')}
          value={stats.tasksCompleted}
          colorScheme="green"
        />
        <StatCard
          icon="🎯"
          title={t('dashboard.activeTask')}
          value={stats.activeTask || t('dashboard.noActiveTask')}
          colorScheme="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ActivityListCard
          title={t('dashboard.recentEntries')}
          items={timeEntries.slice(0, 5).map((entry, index) => ({
            key: entry.id || index,
            mainLabel: entry.task,
            subLabel: new Date(entry.startTime).toLocaleTimeString(),
            category: entry.category,
            value: entry.duration ? formatDuration(entry.duration) : t('dashboard.active'),
          }))}
          emptyStateText={t('dashboard.noEntries')}
        />

        <ActivityListCard
          title={t('dashboard.appUsageSummary')}
          items={appUsage.slice(0, 5).map((usage, index) => ({
            key: usage.id || index,
            mainLabel: usage.appName,
            subLabel: usage.windowTitle,
            value: usage.duration ? formatDuration(usage.duration) : t('dashboard.active'),
          }))}
          emptyStateText={t('dashboard.noAppUsage')}
          showCategory={false}
        />

        <GoalProgressWidget />
      </div>
    </div>
  );
};

export default Dashboard;