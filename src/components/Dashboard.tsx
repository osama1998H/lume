import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, CheckCircle2, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { TimeEntry, AppUsage } from '../types';
import GoalProgressWidget from './GoalProgressWidget';
import StatCard from './ui/StatCard';
import ActivityListCard from './ui/ActivityListCard';
import Skeleton from './ui/Skeleton';

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
      <div className="p-8 overflow-y-auto space-y-8">
        <div className="space-y-2">
          <Skeleton width="200px" height="32px" />
          <Skeleton width="300px" height="20px" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton variant="rectangular" height="120px" />
          <Skeleton variant="rectangular" height="120px" />
          <Skeleton variant="rectangular" height="120px" />
        </div>
      </div>
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
      transition: { duration: 0.4, ease: 'easeOut' },
    },
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 sm:mb-8"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('dashboard.title')}
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          {t('dashboard.subtitle')}
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8"
      >
        <motion.div variants={itemVariants}>
          <StatCard
            icon={Clock}
            title={t('dashboard.todayTime')}
            value={formatDuration(stats.totalTime)}
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
              value: entry.duration ? formatDuration(entry.duration) : t('dashboard.active'),
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
              value: usage.duration ? formatDuration(usage.duration) : t('dashboard.active'),
            }))}
            emptyStateText={t('dashboard.noAppUsage')}
            showCategory={false}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <GoalProgressWidget />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Dashboard;