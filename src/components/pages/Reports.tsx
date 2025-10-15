import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, CheckCircle2, Timer, Smartphone } from 'lucide-react';
import { UnifiedActivity, Category } from '../../types';
import StatCard from '../ui/StatCard';
import ProgressListCard from '../ui/ProgressListCard';
import DateRangeFilter from '../ui/DateRangeFilter';
import { formatDuration } from '../../utils/format';

const Reports: React.FC = () => {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<UnifiedActivity[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (window.electronAPI) {
        // Get date range for the last 3 months to have enough data for all periods
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);

        const [unifiedActivities, cats] = await Promise.all([
          window.electronAPI.activities.getAll(
            startDate.toISOString(),
            endDate.toISOString(),
            {
              sourceTypes: ['manual', 'automatic', 'pomodoro'],
            }
          ),
          window.electronAPI.categories.getAll(),
        ]);

        setActivities(unifiedActivities);
        setCategories(cats);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredData = () => {
    const now = new Date();
    let startDate: Date;

    switch (selectedPeriod) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
    }

    const filteredActivities = activities.filter(activity => {
      if (!activity.startTime) return false;
      const activityDate = new Date(activity.startTime);
      return activityDate >= startDate;
    });

    // Separate by source type for specific statistics
    const manualActivities = filteredActivities.filter(a => a.sourceType === 'manual');
    const automaticActivities = filteredActivities.filter(a => a.sourceType === 'automatic');
    const pomodoroActivities = filteredActivities.filter(a => a.sourceType === 'pomodoro');

    return {
      filteredActivities,
      manualActivities,
      automaticActivities,
      pomodoroActivities
    };
  };

  const getTimeByCategory = () => {
    const { filteredActivities } = getFilteredData();
    const categoryTimes: Record<number | string, { name: string; color: string; time: number }> = {};

    filteredActivities.forEach(activity => {
      // Use categoryId to lookup actual category data
      let categoryKey: number | string;
      let categoryName: string;
      let categoryColor: string;

      if (activity.categoryId) {
        const category = categories.find(c => c.id === activity.categoryId);
        if (category) {
          categoryKey = activity.categoryId;
          categoryName = category.name;
          categoryColor = category.color;
        } else {
          // CategoryId exists but category not found (deleted?)
          categoryKey = 'uncategorized';
          categoryName = t('common.uncategorized');
          categoryColor = '#6B7280';
        }
      } else {
        // No categoryId - uncategorized
        categoryKey = 'uncategorized';
        categoryName = t('common.uncategorized');
        categoryColor = '#6B7280';
      }

      // Initialize or update category time
      if (!categoryTimes[categoryKey]) {
        categoryTimes[categoryKey] = { name: categoryName, color: categoryColor, time: 0 };
      }
      categoryTimes[categoryKey].time += activity.duration || 0;
    });

    return Object.values(categoryTimes)
      .sort((a, b) => b.time - a.time)
      .slice(0, 10);
  };

  const getTopApps = () => {
    const { automaticActivities } = getFilteredData();
    const appTimes: Record<string, number> = {};

    automaticActivities.forEach(activity => {
      const appName = activity.metadata?.appName || activity.title || 'Unknown';
      appTimes[appName] = (appTimes[appName] || 0) + (activity.duration || 0);
    });

    return Object.entries(appTimes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  };

  const getTotalStats = () => {
    const { manualActivities, automaticActivities } = getFilteredData();

    // Total tracked time from manual activities
    const totalTrackedTime = manualActivities.reduce((sum, activity) => {
      return sum + (activity.duration || 0);
    }, 0);

    // Total app usage time from automatic activities
    const totalAppTime = automaticActivities.reduce((sum, activity) => {
      return sum + (activity.duration || 0);
    }, 0);

    // Count completed manual tasks (tasks with endTime)
    const completedTasks = manualActivities.filter(activity => activity.endTime).length;

    // Average time per task
    const averageTaskTime = completedTasks > 0 ? Math.round(totalTrackedTime / completedTasks) : 0;

    return {
      totalTrackedTime,
      totalAppTime,
      completedTasks,
      averageTaskTime,
    };
  };

  const categoryData = getTimeByCategory();
  const appData = getTopApps();
  const stats = getTotalStats();

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="animate-pulse-slow text-lg text-gray-600 dark:text-gray-400">{t('reports.loading')}</div>
      </div>
    );
  }

  return (
    <div className="p-8 overflow-y-auto">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('reports.title')}</h2>
            <p className="text-gray-600 dark:text-gray-400">{t('reports.subtitle')}</p>
          </div>
          <DateRangeFilter
            options={[
              { value: 'day', label: t('reports.today') },
              { value: 'week', label: t('reports.week') },
              { value: 'month', label: t('reports.month') },
            ]}
            selectedValue={selectedPeriod}
            onChange={(value) => setSelectedPeriod(value as 'day' | 'week' | 'month')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Clock}
          title={t('reports.totalTrackedTime')}
          value={formatDuration(stats.totalTrackedTime, t)}
          colorScheme="primary"
        />
        <StatCard
          icon={CheckCircle2}
          title={t('reports.tasksCompleted')}
          value={stats.completedTasks}
          colorScheme="green"
        />
        <StatCard
          icon={Timer}
          title={t('reports.avgTaskDuration')}
          value={formatDuration(stats.averageTaskTime, t)}
          colorScheme="orange"
        />
        <StatCard
          icon={Smartphone}
          title={t('reports.totalAppUsage')}
          value={formatDuration(stats.totalAppTime, t)}
          colorScheme="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProgressListCard
          title={t('reports.timeByCategory')}
          items={categoryData.map((cat) => ({
            key: cat.name,
            label: cat.name,
            value: cat.time,
            formattedValue: formatDuration(cat.time, t),
            color: cat.color,
          }))}
          colorScheme="primary"
          emptyStateText={t('reports.noData')}
        />

        <ProgressListCard
          title={t('reports.topApplications')}
          items={appData.map(([appName, time]) => ({
            key: appName,
            label: appName,
            value: time,
            formattedValue: formatDuration(time, t),
          }))}
          colorScheme="green"
          emptyStateText={t('reports.noData')}
        />
      </div>
    </div>
  );
};

export default Reports;