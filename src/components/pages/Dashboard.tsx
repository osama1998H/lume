import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, CheckCircle2, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { UnifiedActivity } from '../../types';
import GoalProgressWidget from './GoalProgressWidget';
import StatCard from '../ui/StatCard';
import ActivityListCard from '../ui/ActivityListCard';
import Skeleton from '../ui/Skeleton';
import { formatDuration } from '../../utils/format';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<UnifiedActivity[]>([]);
  const [activeEntry, setActiveEntry] = useState<any | null>(null);
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
        // Get today's activities
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Fetch both completed activities and active entry in parallel
        const [unifiedActivities, activeTimeEntry] = await Promise.all([
          window.electronAPI.activities.getAll(
            today.toISOString(),
            tomorrow.toISOString(),
            {
              sourceTypes: ['manual', 'automatic', 'pomodoro'],
            }
          ),
          window.electronAPI.timeEntries.getActive(),
        ]);

        setActivities(unifiedActivities);
        setActiveEntry(activeTimeEntry);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTodayStats = () => {
    // Filter for manual activities only (tasks) for task-related stats
    const manualActivities = activities.filter(a => a.sourceType === 'manual');

    const totalSeconds = manualActivities.reduce((sum, activity) => {
      return sum + (activity.duration || 0);
    }, 0);

    const completedTasks = manualActivities.filter(activity => activity.endTime).length;

    return {
      totalTime: totalSeconds,
      tasksCompleted: completedTasks,
      activeTask: activeEntry?.task || null,
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
              items={activities
                .filter(a => a.sourceType === 'manual')
                .slice(0, 5)
                .map((activity, index) => ({
                  key: activity.id ? `${activity.id}-${activity.sourceType}` : index,
                  mainLabel: activity.title,
                  subLabel: new Date(activity.startTime).toLocaleTimeString(),
                  category: activity.categoryName,
                  value: activity.duration ? formatDuration(activity.duration, t) : t('dashboard.active'),
                }))}
              emptyStateText={t('dashboard.noEntries')}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <ActivityListCard
              title={t('dashboard.appUsageSummary')}
              items={activities
                .filter(a => a.sourceType === 'automatic')
                .slice(0, 5)
                .map((activity, index) => ({
                  key: activity.id ? `${activity.id}-${activity.sourceType}` : index,
                  mainLabel: activity.metadata?.appName || activity.title,
                  subLabel: activity.metadata?.windowTitle || '',
                  value: activity.duration ? formatDuration(activity.duration, t) : t('dashboard.active'),
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