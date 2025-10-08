import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Square, Clock, Tag as TagIcon, FileText } from 'lucide-react';
import { TimeEntry, Category, Tag } from '../types';
import ActivityListCard from './ui/ActivityListCard';
import Button from './ui/Button';
import Input from './ui/Input';
import TagSelector from './ui/TagSelector';
import TagDisplay from './ui/TagDisplay';

const TimeTracker: React.FC = () => {
  const { t } = useTranslation();
  const [currentTask, setCurrentTask] = useState('');
  const [category, setCategory] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<number | null>(null);

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
    const init = async () => {
      const categoriesData = await loadCategories();
      await loadRecentEntries();
      await restoreActiveTimer(categoriesData);
    };
    init();
  }, []);

  const loadCategories = async () => {
    try {
      if (window.electronAPI) {
        const categoriesData = await window.electronAPI.getCategories();
        setCategories(categoriesData);
        return categoriesData;
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
    return [];
  };

  const restoreActiveTimer = async (categoriesData: Category[]) => {
    try {
      if (window.electronAPI) {
        const activeEntry = await window.electronAPI.getActiveTimeEntry();
        if (activeEntry && activeEntry.id) {
          console.log('📋 Restoring active timer:', activeEntry);
          setCurrentTask(activeEntry.task);

          // Restore category ID if available
          if (activeEntry.categoryId) {
            setSelectedCategoryId(activeEntry.categoryId);
            // Find the category name
            const categoryData = categoriesData.find(c => c.id === activeEntry.categoryId);
            setCategory(categoryData?.name || activeEntry.category || '');
          } else if (activeEntry.category) {
            // Backward compatibility: try to match by name
            const categoryData = categoriesData.find(c => c.name === activeEntry.category);
            if (categoryData) {
              setSelectedCategoryId(categoryData.id || null);
            }
            setCategory(activeEntry.category);
          }

          const parsedStartTime = new Date(activeEntry.startTime);
          if (!isNaN(parsedStartTime.getTime())) {
            setStartTime(parsedStartTime);
          } else {
            console.warn('Invalid startTime format for activeEntry:', activeEntry.startTime);
            setStartTime(null);
          }
          setIsTracking(true);
          setActiveEntryId(activeEntry.id);
        }
      }
    } catch (error) {
      console.error('Failed to restore active timer:', error);
    }
  };

  const loadRecentEntries = async () => {
    try {
      if (window.electronAPI) {
        const entries = await window.electronAPI.getTimeEntries();
        // Load tags for each entry
        const entriesWithTags = await Promise.all(
          entries.slice(0, 10).map(async (entry) => {
            if (entry.id) {
              const tags = await window.electronAPI.getTimeEntryTags(entry.id);
              return { ...entry, tags };
            }
            return entry;
          })
        );
        setRecentEntries(entriesWithTags);
      }
    } catch (error) {
      console.error('Failed to load recent entries:', error);
    }
  };

  const startTracking = async () => {
    if (!currentTask.trim()) return;

    const now = new Date();
    const entry: TimeEntry = {
      task: currentTask,
      startTime: now.toISOString(),
      category: category || undefined,
      categoryId: selectedCategoryId || undefined,
      // No endTime = active timer
    };

    try {
      if (window.electronAPI) {
        const id = await window.electronAPI.addTimeEntry(entry);
        console.log('⏱️  Started timer with ID:', id);

        // Save tags if any selected
        if (selectedTags.length > 0) {
          const tagIds = selectedTags.map((tag) => tag.id!).filter((id) => id !== undefined);
          await window.electronAPI.addTimeEntryTags(id, tagIds);
        }

        setActiveEntryId(id);
        setStartTime(now);
        setIsTracking(true);
        setElapsedTime(0);
      }
    } catch (error) {
      console.error('Failed to start timer:', error);
    }
  };

  const stopTracking = async () => {
    if (!startTime || !currentTask.trim() || !activeEntryId) return;

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000); // in seconds

    try {
      if (window.electronAPI) {
        const updated = await window.electronAPI.updateTimeEntry(activeEntryId, {
          endTime: endTime.toISOString(),
          duration,
        });

        if (updated) {
          console.log('✅ Timer stopped and entry updated:', activeEntryId);
          await loadRecentEntries();
        } else {
          console.error('Failed to update timer entry');
        }
      }
    } catch (error) {
      console.error('Failed to save time entry:', error);
    }

    setIsTracking(false);
    setStartTime(null);
    setElapsedTime(0);
    setCurrentTask('');
    setCategory('');
    setSelectedCategoryId(null);
    setSelectedTags([]);
    setActiveEntryId(null);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryId = e.target.value ? Number(e.target.value) : null;
    setSelectedCategoryId(categoryId);

    // Update category name for backward compatibility
    if (categoryId) {
      const selectedCategory = categories.find(c => c.id === categoryId);
      setCategory(selectedCategory?.name || '');
    } else {
      setCategory('');
    }
  };

  return (
    <div className="p-8 overflow-y-auto">
      <div className="mb-8 animate-fade-in">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('timeTracker.title')}</h2>
        <p className="text-gray-600 dark:text-gray-400">{t('timeTracker.subtitle')}</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="card mb-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center gap-3 mb-4 px-8 py-4 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-2xl">
              <Clock className={`h-8 w-8 ${isTracking ? 'text-primary-600 dark:text-primary-400 animate-pulse' : 'text-gray-400'}`} />
              <div className="text-6xl font-mono font-bold text-primary-600 dark:text-primary-400 tracking-tight">
                {formatTime(elapsedTime)}
              </div>
            </div>
            {isTracking && currentTask && (
              <p className="text-lg text-gray-700 dark:text-gray-300 animate-fade-in">
                {t('timeTracker.workingOn')} <span className="font-semibold text-gray-900 dark:text-gray-100">{currentTask}</span>
              </p>
            )}
          </div>

          <div className="space-y-4">
            <Input
              id="task"
              label={t('timeTracker.taskName')}
              value={currentTask}
              onChange={(e) => setCurrentTask(e.target.value)}
              disabled={isTracking}
              placeholder={t('timeTracker.taskPlaceholder')}
              icon={FileText}
              iconPosition="left"
            />

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('timeTracker.category')}
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <TagIcon className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="category"
                  value={selectedCategoryId || ''}
                  onChange={handleCategoryChange}
                  disabled={isTracking}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">{t('timeTracker.categoryPlaceholder')}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {selectedCategoryId && categories.find(c => c.id === selectedCategoryId) && (
                  <div
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white dark:border-gray-700"
                    style={{ backgroundColor: categories.find(c => c.id === selectedCategoryId)?.color }}
                  />
                )}
              </div>
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('timeTracker.tags')}
              </label>
              <TagSelector
                selectedTags={selectedTags}
                onChange={setSelectedTags}
                allowCreate={true}
                placeholder={t('timeTracker.tagsPlaceholder')}
              />
            </div>

            <div className="flex justify-center pt-4">
              {!isTracking ? (
                <Button
                  onClick={startTracking}
                  disabled={!currentTask.trim()}
                  variant="primary"
                  size="lg"
                  icon={Play}
                  className="px-8"
                >
                  {t('timeTracker.startTracking')}
                </Button>
              ) : (
                <Button
                  onClick={stopTracking}
                  variant="danger"
                  size="lg"
                  icon={Square}
                  className="px-8"
                >
                  {t('timeTracker.stopTracking')}
                </Button>
              )}
            </div>
          </div>
        </div>

        <ActivityListCard
          title={t('timeTracker.recentEntries')}
          items={recentEntries.map((entry, index) => ({
            key: entry.id || index,
            mainLabel: entry.task,
            subLabel: `${new Date(entry.startTime).toLocaleDateString()} ${t('timeTracker.at')} ${new Date(entry.startTime).toLocaleTimeString()}`,
            category: entry.category,
            tags: entry.tags,
            value: entry.duration ? formatDuration(entry.duration) : t('timeTracker.active'),
          }))}
          emptyStateText={t('timeTracker.noEntries')}
          className="max-h-96 overflow-y-auto"
        />
      </div>
    </div>
  );
};

export default TimeTracker;