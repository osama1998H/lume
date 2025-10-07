import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TimeEntry, AppUsage } from '../types';
import StatCard from './ui/StatCard';
import ProgressListCard from './ui/ProgressListCard';

const Reports: React.FC = () => {
  const { t } = useTranslation();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [appUsage, setAppUsage] = useState<AppUsage[]>([]);
  const [topApplications, setTopApplications] = useState<Array<{name: string, totalDuration: number}>>([]);
  const [topWebsites, setTopWebsites] = useState<Array<{domain: string, totalDuration: number}>>([]);
  const [activitySessions, setActivitySessions] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (window.electronAPI) {
        const [entries, usage, sessions, topApps, topSites] = await Promise.all([
          window.electronAPI.getTimeEntries(),
          window.electronAPI.getAppUsage(),
          window.electronAPI.getRecentActivitySessions(100),
          window.electronAPI.getTopApplications(10),
          window.electronAPI.getTopWebsites(10),
        ]);

        console.log('📊 Reports - Loaded time entries:', entries.length);
        console.log('📊 Reports - Sample time entry:', entries[0]);
        console.log('📊 Reports - Loaded app usage:', usage.length);
        console.log('📊 Reports - Sample app usage:', usage[0]);

        setTimeEntries(entries);
        setAppUsage(usage);
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

    console.log('📊 Reports - Filter period:', selectedPeriod);
    console.log('📊 Reports - Start date:', startDate.toISOString());
    console.log('📊 Reports - Total timeEntries before filter:', timeEntries.length);
    console.log('📊 Reports - Total appUsage before filter:', appUsage.length);

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

    console.log('📊 Reports - Filtered entries count:', filteredEntries.length);
    console.log('📊 Reports - Filtered usage count:', filteredUsage.length);

    return { filteredEntries, filteredUsage };
  };

  const getTimeByCategory = () => {
    const { filteredEntries } = getFilteredData();
    const categoryTimes: Record<string, number> = {};

    filteredEntries.forEach(entry => {
      const category = entry.category || 'Uncategorized';

      // Calculate duration if missing
      let {duration} = entry;
      if (!duration && entry.startTime && entry.endTime) {
        const start = new Date(entry.startTime).getTime();
        const end = new Date(entry.endTime).getTime();
        duration = Math.floor((end - start) / 1000);
      }

      categoryTimes[category] = (categoryTimes[category] || 0) + (duration || 0);
    });

    return Object.entries(categoryTimes)
      .sort(([, a], [, b]) => b - a)
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

    console.log('📊 Reports - Filtered entries:', filteredEntries.length);
    console.log('📊 Reports - Filtered usage:', filteredUsage.length);

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
      console.log('📊 Reports - Usage duration:', usage.duration);
      return sum + (usage.duration || 0);
    }, 0);

    const completedTasks = filteredEntries.filter(entry => entry.endTime).length;

    console.log('📊 Reports - Total tracked time:', totalTrackedTime);
    console.log('📊 Reports - Total app time:', totalAppTime);
    console.log('📊 Reports - Completed tasks:', completedTasks);

    const averageTaskTime = completedTasks > 0 ? Math.round(totalTrackedTime / completedTasks) : 0;
    console.log('📊 Reports - Avg task time:', averageTaskTime);

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
          <div>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="day">{t('reports.today')}</option>
              <option value="week">{t('reports.week')}</option>
              <option value="month">{t('reports.month')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon="⏱️"
          title={t('reports.totalTrackedTime')}
          value={formatDuration(stats.totalTrackedTime)}
          colorScheme="primary"
        />
        <StatCard
          icon="✅"
          title={t('reports.tasksCompleted')}
          value={stats.completedTasks}
          colorScheme="green"
        />
        <StatCard
          icon="⏰"
          title={t('reports.avgTaskDuration')}
          value={formatDuration(stats.averageTaskTime)}
          colorScheme="orange"
        />
        <StatCard
          icon="📱"
          title={t('reports.totalAppUsage')}
          value={formatDuration(stats.totalAppTime)}
          colorScheme="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProgressListCard
          title={t('reports.timeByCategory')}
          items={categoryData.map(([category, time]) => ({
            key: category,
            label: category,
            value: time,
            formattedValue: formatDuration(time),
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
            formattedValue: formatDuration(time),
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
            formattedValue: formatDuration(app.totalDuration),
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
            formattedValue: formatDuration(site.totalDuration),
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
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      session.category === 'website'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                    }`}>
                      {session.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {session.domain || session.window_title || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {session.duration ? formatDuration(session.duration) : '-'}
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