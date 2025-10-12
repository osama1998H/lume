import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, CheckCircle2, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { TimeEntry, AppUsage } from '../types';
import GoalProgressWidget from './GoalProgressWidget';
import StatCard from './ui/StatCard';
import ActivityListCard from './ui/ActivityListCard';
import Skeleton from './ui/Skeleton';
import { formatDuration } from '../utils/format';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [appUsage, setAppUsage] = useState<AppUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Keyboard shortcut for refreshing data
  useKeyboardShortcuts([
    { key: 'r', ctrl: true, description: t('dashboard.shortcuts.refresh'), action: () => loadData() },
    { key: 'F5', description: t('dashboard.shortcuts.refresh'), action: () => loadData() },
  ]);

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

  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];

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

    return {
      totalTime: totalSeconds,
      tasksCompleted: todayEntries.filter(entry => entry.endTime).length,
      activeTask: todayEntries.find(entry => !entry.endTime)?.task || null,
    };
  };

  const stats = getTodayStats();

  if (isLoading) {
    return (
      <main
        className="p-8 overflow-y-auto space-y-8"
        role="main"
        aria-busy="true"
        aria-label={t('dashboard.loadingAriaLabel', 'Loading dashboard data')}
      >
        <div className="space-y-2">
          <Skeleton width="200px" height="32px" />
          <Skeleton width="300px" height="20px" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton variant="rectangular" height="120px" />
          <Skeleton variant="rectangular" height="120px" />
          <Skeleton variant="rectangular" height="120px" />
        </div>
      </main>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  return (
    <main
      className="p-4 sm:p-6 lg:p-8 overflow-y-auto"
      role="main"
      aria-label={t('dashboard.ariaLabel', 'Dashboard main content')}
    >
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 sm:mb-8"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('dashboard.title')}
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          {t('dashboard.subtitle')}
        </p>
      </motion.header>

      <section aria-labelledby="today-stats-heading">
        <h2 id="today-stats-heading" className="sr-only">
          {t('dashboard.todayStatsHeading', "Today's Statistics")}
        </h2>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8"
          role="region"
          aria-live="polite"
        >
          <motion.div variants={itemVariants}>
            <StatCard
              icon={Clock}
              title={t('dashboard.todayTime')}
              value={formatDuration(stats.totalTime, t)}
              colorScheme="primary"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              icon={CheckCircle2}
              title={t('dashboard.tasksDone')}
              value={stats.tasksCompleted}
              colorScheme="green"
            />
          </motion.div>
          <motion.div variants={itemVariants} className="sm:col-span-2 lg:col-span-1">
            <StatCard
              icon={Target}
              title={t('dashboard.activeTask')}
              value={stats.activeTask || t('dashboard.noActiveTask')}
              colorScheme="orange"
            />
          </motion.div>
        </motion.div>
      </section>

      <section aria-labelledby="activity-overview-heading">
        <h2 id="activity-overview-heading" className="sr-only">
          {t('dashboard.activityOverviewHeading', 'Activity Overview')}
        </h2>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6"
        >
          <motion.div variants={itemVariants}>
            <ActivityListCard
              title={t('dashboard.recentEntries')}
              items={timeEntries.slice(0, 5).map((entry, index) => ({
                key: entry.id || index,
                mainLabel: entry.task,
                subLabel: new Date(entry.startTime).toLocaleTimeString(),
                category: entry.category,
                value: entry.duration ? formatDuration(entry.duration, t) : t('dashboard.active'),
              }))}
              emptyStateText={t('dashboard.noEntries')}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <ActivityListCard
              title={t('dashboard.appUsageSummary')}
              items={appUsage.slice(0, 5).map((usage, index) => ({
                key: usage.id || index,
                mainLabel: usage.appName,
                subLabel: usage.windowTitle,
                value: usage.duration ? formatDuration(usage.duration, t) : t('dashboard.active'),
              }))}
              emptyStateText={t('dashboard.noAppUsage')}
              showCategory={false}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <GoalProgressWidget />
          </motion.div>
        </motion.div>
      </section>
    </main>
  );
};

export default Dashboard;