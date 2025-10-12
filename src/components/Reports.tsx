import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, CheckCircle2, Timer, Smartphone } from 'lucide-react';
import { TimeEntry, AppUsage, Category } from '../types';
import { ActivitySession } from '../types/activity';
import StatCard from './ui/StatCard';
import ProgressListCard from './ui/ProgressListCard';
import Badge from './ui/Badge';
import DateRangeFilter from './ui/DateRangeFilter';
import { formatDuration } from '../utils/format';

const Reports: React.FC = () => {
  const { t } = useTranslation();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [appUsage, setAppUsage] = useState<AppUsage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [topApplications, setTopApplications] = useState<Array<{name: string, totalDuration: number}>>([]);
  const [topWebsites, setTopWebsites] = useState<Array<{domain: string, totalDuration: number}>>([]);
  const [activitySessions, setActivitySessions] = useState<ActivitySession[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (window.electronAPI) {
        const [entries, usage, cats, sessions, topApps, topSites] = await Promise.all([
          window.electronAPI.getTimeEntries(),
          window.electronAPI.getAppUsage(),
          window.electronAPI.getCategories(),
          window.electronAPI.getRecentActivitySessions(100),
          window.electronAPI.getTopApplications(10),
          window.electronAPI.getTopWebsites(10),
        ]);

        setTimeEntries(entries);
        setAppUsage(usage);
        setCategories(cats);
        setActivitySessions(sessions);
        setTopApplications(topApps);
        setTopWebsites(topSites);
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

    const filteredEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.startTime);
      const matches = entryDate >= startDate;
      if (!matches && timeEntries.indexOf(entry) < 3) {
        console.log('📊 Reports - Excluded time entry:', entry.startTime, 'vs', startDate.toISOString());
      }
      return matches;
    });

    const filteredUsage = appUsage.filter(usage => {
      const usageDate = new Date(usage.startTime);
      return usageDate >= startDate;
    });

    return { filteredEntries, filteredUsage };
  };

  const getTimeByCategory = () => {
    const { filteredEntries } = getFilteredData();
    const categoryTimes: Record<number | string, { name: string; color: string; time: number }> = {};

    filteredEntries.forEach(entry => {
      // Use categoryId to lookup actual category data
      let categoryKey: number | string;
      let categoryName: string;
      let categoryColor: string;

      if (entry.categoryId) {
        const category = categories.find(c => c.id === entry.categoryId);
        if (category) {
          categoryKey = entry.categoryId;
          categoryName = category.name;
          categoryColor = category.color;
        } else {
          // CategoryId exists but category not found (deleted?)
          categoryKey = 'uncategorized';
          categoryName = 'Uncategorized';
          categoryColor = '#6B7280';
        }
      } else {
        // No categoryId - backward compatibility or truly uncategorized
        categoryKey = 'uncategorized';
        categoryName = 'Uncategorized';
        categoryColor = '#6B7280';
      }

      // Calculate duration if missing
      let {duration} = entry;
      if (!duration && entry.startTime && entry.endTime) {
        const start = new Date(entry.startTime).getTime();
        const end = new Date(entry.endTime).getTime();
        duration = Math.floor((end - start) / 1000);
      }

      // Initialize or update category time
      if (!categoryTimes[categoryKey]) {
        categoryTimes[categoryKey] = { name: categoryName, color: categoryColor, time: 0 };
      }
      categoryTimes[categoryKey].time += duration || 0;
    });

    return Object.values(categoryTimes)
      .sort((a, b) => b.time - a.time)
      .slice(0, 10);
  };

  const getTopApps = () => {
    const { filteredUsage } = getFilteredData();
    const appTimes: Record<string, number> = {};

    filteredUsage.forEach(usage => {
      appTimes[usage.appName] = (appTimes[usage.appName] || 0) + (usage.duration || 0);
    });

    return Object.entries(appTimes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  };

  const getTotalStats = () => {
    const { filteredEntries, filteredUsage } = getFilteredData();

    if (filteredEntries.length > 0) {
      console.log('📊 Reports - First filtered entry FULL DATA:', filteredEntries[0]);
    }

    const totalTrackedTime = filteredEntries.reduce((sum, entry) => {
      // Calculate duration if missing but start/end times exist
      let {duration} = entry;

      if (!duration && entry.startTime && entry.endTime) {
        const start = new Date(entry.startTime).getTime();
        const end = new Date(entry.endTime).getTime();
        duration = Math.floor((end - start) / 1000); // in seconds
        console.log('📊 Reports - Calculated duration from times:', duration, 'seconds');
      }

      console.log('📊 Reports - Entry duration:', entry.duration, 'Calculated:', duration);
      return sum + (duration || 0);
    }, 0);

    const totalAppTime = filteredUsage.reduce((sum, usage) => {
      return sum + (usage.duration || 0);
    }, 0);

    const completedTasks = filteredEntries.filter(entry => entry.endTime).length;

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <ProgressListCard
          title={t('reports.activityTrackingTopApps')}
          items={topApplications.map((app) => ({
            key: app.name,
            label: app.name,
            value: app.totalDuration,
            formattedValue: formatDuration(app.totalDuration, t),
          }))}
          colorScheme="blue"
          emptyStateText={t('reports.noActivityData')}
        />

        <ProgressListCard
          title={t('reports.activityTrackingTopWebsites')}
          items={topWebsites.map((site) => ({
            key: site.domain,
            label: site.domain,
            value: site.totalDuration,
            formattedValue: formatDuration(site.totalDuration, t),
          }))}
          colorScheme="purple"
          emptyStateText={t('reports.noWebsiteData')}
        />
      </div>

      <div className="card mt-8">
        <h3 className="text-xl font-semibold mb-4 dark:text-gray-100">{t('reports.recentActivitySessions')}</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('reports.application')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('reports.category')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('reports.domain')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('reports.duration')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('reports.startTime')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {activitySessions.slice(0, 20).map((session, index) => (
                <tr key={session.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {session.app_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <Badge variant={session.category === 'website' ? 'primary' : 'info'} size="sm">
                      {session.category}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {session.domain || session.window_title || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {session.duration ? formatDuration(session.duration, t) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {session.start_time ? new Date(session.start_time).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
              {activitySessions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    {t('reports.noActivityData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;