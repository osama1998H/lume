import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TimeEntry, AppUsage } from '../types';

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
      let duration = entry.duration;
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
        <div className="animate-pulse-slow text-lg text-gray-600">{t('reports.loading')}</div>
      </div>
    );
  }

  return (
    <div className="p-8 overflow-y-auto">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('reports.title')}</h2>
            <p className="text-gray-600">{t('reports.subtitle')}</p>
          </div>
          <div>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="day">{t('reports.today')}</option>
              <option value="week">{t('reports.week')}</option>
              <option value="month">{t('reports.month')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card text-center">
          <div className="text-3xl font-bold text-primary-600 mb-2">
            {formatDuration(stats.totalTrackedTime)}
          </div>
          <div className="text-sm text-gray-600">{t('reports.totalTrackedTime')}</div>
        </div>

        <div className="card text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {stats.completedTasks}
          </div>
          <div className="text-sm text-gray-600">{t('reports.tasksCompleted')}</div>
        </div>

        <div className="card text-center">
          <div className="text-3xl font-bold text-orange-600 mb-2">
            {formatDuration(stats.averageTaskTime)}
          </div>
          <div className="text-sm text-gray-600">{t('reports.avgTaskDuration')}</div>
        </div>

        <div className="card text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {formatDuration(stats.totalAppTime)}
          </div>
          <div className="text-sm text-gray-600">{t('reports.totalAppUsage')}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-xl font-semibold mb-4">{t('reports.timeByCategory')}</h3>
          <div className="space-y-4">
            {categoryData.map(([category, time], _index) => {
              const maxTime = categoryData[0]?.[1] || 1;
              const percentage = (time / maxTime) * 100;

              return (
                <div key={category} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{category}</span>
                    <span className="text-sm font-semibold text-primary-600">
                      {formatDuration(time)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {categoryData.length === 0 && (
              <p className="text-gray-500 text-center py-4">{t('reports.noData')}</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold mb-4">{t('reports.topApplications')}</h3>
          <div className="space-y-4">
            {appData.map(([appName, time], _index) => {
              const maxTime = appData[0]?.[1] || 1;
              const percentage = (time / maxTime) * 100;

              return (
                <div key={appName} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{appName}</span>
                    <span className="text-sm font-semibold text-primary-600">
                      {formatDuration(time)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {appData.length === 0 && (
              <p className="text-gray-500 text-center py-4">{t('reports.noData')}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="card">
          <h3 className="text-xl font-semibold mb-4">{t('reports.activityTrackingTopApps')}</h3>
          <div className="space-y-4">
            {topApplications.map((app, _index) => {
              const maxTime = topApplications[0]?.totalDuration || 1;
              const percentage = (app.totalDuration / maxTime) * 100;

              return (
                <div key={app.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{app.name}</span>
                    <span className="text-sm font-semibold text-blue-600">
                      {formatDuration(app.totalDuration)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {topApplications.length === 0 && (
              <p className="text-gray-500 text-center py-4">{t('reports.noActivityData')}</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold mb-4">{t('reports.activityTrackingTopWebsites')}</h3>
          <div className="space-y-4">
            {topWebsites.map((site, _index) => {
              const maxTime = topWebsites[0]?.totalDuration || 1;
              const percentage = (site.totalDuration / maxTime) * 100;

              return (
                <div key={site.domain} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{site.domain}</span>
                    <span className="text-sm font-semibold text-purple-600">
                      {formatDuration(site.totalDuration)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {topWebsites.length === 0 && (
              <p className="text-gray-500 text-center py-4">{t('reports.noWebsiteData')}</p>
            )}
          </div>
        </div>
      </div>

      <div className="card mt-8">
        <h3 className="text-xl font-semibold mb-4">{t('reports.recentActivitySessions')}</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('reports.application')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('reports.category')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('reports.domain')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('reports.duration')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('reports.startTime')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activitySessions.slice(0, 20).map((session, index) => (
                <tr key={session.id || index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {session.app_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      session.category === 'website'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {session.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {session.domain || session.window_title || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {session.duration ? formatDuration(session.duration) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {session.start_time ? new Date(session.start_time).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
              {activitySessions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
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