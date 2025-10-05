import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TimeEntry, AppUsage } from '../types';

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

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = timeEntries.filter(entry =>
      entry.startTime && entry.startTime.startsWith(today)
    );

    const totalMinutes = todayEntries.reduce((sum, entry) =>
      sum + (entry.duration || 0), 0
    );

    return {
      totalTime: totalMinutes,
      tasksCompleted: todayEntries.filter(entry => entry.endTime).length,
      activeTask: todayEntries.find(entry => !entry.endTime)?.task || null,
    };
  };

  const stats = getTodayStats();

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="animate-pulse-slow text-lg text-gray-600">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="p-8 overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('dashboard.title')}</h2>
        <p className="text-gray-600">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-primary-100 text-primary-600 mr-4">
              <span className="text-2xl">⏰</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.todayTime')}</h3>
              <p className="text-2xl font-bold text-primary-600">
                {formatDuration(stats.totalTime)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
              <span className="text-2xl">✅</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.tasksDone')}</h3>
              <p className="text-2xl font-bold text-green-600">{stats.tasksCompleted}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100 text-orange-600 mr-4">
              <span className="text-2xl">🎯</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.activeTask')}</h3>
              <p className="text-sm font-medium text-orange-600 truncate">
                {stats.activeTask || t('dashboard.noActiveTask')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-xl font-semibold mb-4">{t('dashboard.recentEntries')}</h3>
          <div className="space-y-3">
            {timeEntries.slice(0, 5).map((entry, index) => (
              <div key={entry.id || index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{entry.task}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(entry.startTime).toLocaleTimeString()}
                    {entry.category && ` • ${entry.category}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary-600">
                    {entry.duration ? formatDuration(entry.duration) : t('dashboard.active')}
                  </p>
                </div>
              </div>
            ))}
            {timeEntries.length === 0 && (
              <p className="text-gray-500 text-center py-4">{t('dashboard.noEntries')}</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold mb-4">{t('dashboard.appUsageSummary')}</h3>
          <div className="space-y-3">
            {appUsage.slice(0, 5).map((usage, index) => (
              <div key={usage.id || index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{usage.appName}</p>
                  <p className="text-sm text-gray-600 truncate">{usage.windowTitle}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary-600">
                    {usage.duration ? formatDuration(usage.duration) : t('dashboard.active')}
                  </p>
                </div>
              </div>
            ))}
            {appUsage.length === 0 && (
              <p className="text-gray-500 text-center py-4">{t('dashboard.noAppUsage')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;