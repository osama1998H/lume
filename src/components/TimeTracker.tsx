import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TimeEntry } from '../types';
import { normalizeTimeEntries } from '../utils/normalizeData';

const TimeTracker: React.FC = () => {
  const { t } = useTranslation();
  const [currentTask, setCurrentTask] = useState('');
  const [category, setCategory] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isTracking && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isTracking, startTime]);

  useEffect(() => {
    loadRecentEntries();
  }, []);

  const loadRecentEntries = async () => {
    try {
      if (window.electronAPI) {
        const entries = await window.electronAPI.getTimeEntries();
        const normalized = normalizeTimeEntries(entries);
        setRecentEntries(normalized.slice(0, 10));
      }
    } catch (error) {
      console.error('Failed to load recent entries:', error);
    }
  };

  const startTracking = () => {
    if (!currentTask.trim()) return;

    const now = new Date();
    setStartTime(now);
    setIsTracking(true);
    setElapsedTime(0);
  };

  const stopTracking = async () => {
    if (!startTime || !currentTask.trim()) return;

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 60000); // in minutes

    const entry: TimeEntry = {
      task: currentTask,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      category: category || undefined,
    };

    try {
      if (window.electronAPI) {
        await window.electronAPI.addTimeEntry(entry);
        await loadRecentEntries();
      }
    } catch (error) {
      console.error('Failed to save time entry:', error);
    }

    setIsTracking(false);
    setStartTime(null);
    setElapsedTime(0);
    setCurrentTask('');
    setCategory('');
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="p-8 overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('timeTracker.title')}</h2>
        <p className="text-gray-600">{t('timeTracker.subtitle')}</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="card mb-8">
          <div className="text-center mb-6">
            <div className="text-6xl font-mono font-bold text-primary-600 mb-4">
              {formatTime(elapsedTime)}
            </div>
            {isTracking && currentTask && (
              <p className="text-lg text-gray-700">{t('timeTracker.workingOn')} <span className="font-semibold">{currentTask}</span></p>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="task" className="block text-sm font-medium text-gray-700 mb-2">
                {t('timeTracker.taskName')}
              </label>
              <input
                type="text"
                id="task"
                value={currentTask}
                onChange={(e) => setCurrentTask(e.target.value)}
                disabled={isTracking}
                placeholder={t('timeTracker.taskPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                {t('timeTracker.category')}
              </label>
              <input
                type="text"
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isTracking}
                placeholder={t('timeTracker.categoryPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div className="flex justify-center pt-4">
              {!isTracking ? (
                <button
                  onClick={startTracking}
                  disabled={!currentTask.trim()}
                  className="btn-primary px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('timeTracker.startTracking')}
                </button>
              ) : (
                <button
                  onClick={stopTracking}
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white px-8 py-3 text-lg rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
                >
                  {t('timeTracker.stopTracking')}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold mb-4">{t('timeTracker.recentEntries')}</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentEntries.map((entry, index) => (
              <div key={entry.id || index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{entry.task}</p>
                  <div className="flex items-center space-x-4 mt-1">
                    <p className="text-sm text-gray-600">
                      {new Date(entry.startTime).toLocaleDateString()} {t('timeTracker.at')}{' '}
                      {new Date(entry.startTime).toLocaleTimeString()}
                    </p>
                    {entry.category && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        {entry.category}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary-600">
                    {entry.duration ? formatDuration(entry.duration) : t('timeTracker.active')}
                  </p>
                </div>
              </div>
            ))}
            {recentEntries.length === 0 && (
              <p className="text-gray-500 text-center py-8">{t('timeTracker.noEntries')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeTracker;
