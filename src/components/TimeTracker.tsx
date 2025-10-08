import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Square, Clock, FileText } from 'lucide-react';
import { TimeEntry, Category } from '../types';
import ActivityListCard from './ui/ActivityListCard';
import { Button } from './ui/button';
import InputWithIcon from './ui/InputWithIcon';
import { CategorySelect } from './ui/CategorySelect';
import { Card, CardContent } from './ui/card';

const TimeTracker: React.FC = () => {
  const { t } = useTranslation();
  const [currentTask, setCurrentTask] = useState('');
  const [category, setCategory] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
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
        setRecentEntries(entries.slice(0, 10));
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

  return (
    <div className="p-8 overflow-y-auto">
      <div className="mb-8 animate-fade-in">
        <h2 className="text-3xl font-bold text-foreground mb-2">{t('timeTracker.title')}</h2>
        <p className="text-muted-foreground">{t('timeTracker.subtitle')}</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center gap-3 mb-4 px-8 py-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl">
              <Clock className={`h-8 w-8 ${isTracking ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
              <div className="text-6xl font-mono font-bold text-primary tracking-tight">
                {formatTime(elapsedTime)}
              </div>
            </div>
            {isTracking && currentTask && (
              <p className="text-lg text-muted-foreground animate-fade-in">
                {t('timeTracker.workingOn')} <span className="font-semibold text-foreground">{currentTask}</span>
              </p>
            )}
          </div>

          <div className="space-y-4">
            <InputWithIcon
              id="task"
              label={t('timeTracker.taskName')}
              value={currentTask}
              onChange={(e) => setCurrentTask(e.target.value)}
              disabled={isTracking}
              placeholder={t('timeTracker.taskPlaceholder')}
              icon={FileText}
              iconPosition="left"
              required
            />

            <CategorySelect
              value={selectedCategoryId?.toString() || ''}
              onValueChange={(value) => {
                const categoryId = value ? Number(value) : null;
                setSelectedCategoryId(categoryId);
                if (categoryId) {
                  const selectedCategory = categories.find(c => c.id === categoryId);
                  setCategory(selectedCategory?.name || '');
                } else {
                  setCategory('');
                }
              }}
              categories={categories}
              label={t('timeTracker.category')}
              placeholder={t('timeTracker.categoryPlaceholder')}
              disabled={isTracking}
            />

            <div className="flex justify-center pt-4">
              {!isTracking ? (
                <Button
                  onClick={startTracking}
                  disabled={!currentTask.trim()}
                  size="lg"
                  className="px-8"
                >
                  <Play className="mr-2 h-5 w-5" />
                  {t('timeTracker.startTracking')}
                </Button>
              ) : (
                <Button
                  onClick={stopTracking}
                  variant="destructive"
                  size="lg"
                  className="px-8"
                >
                  <Square className="mr-2 h-5 w-5" />
                  {t('timeTracker.stopTracking')}
                </Button>
              )}
            </div>
          </div>
          </CardContent>
        </Card>

        <ActivityListCard
          title={t('timeTracker.recentEntries')}
          items={recentEntries.map((entry, index) => ({
            key: entry.id || index,
            mainLabel: entry.task,
            subLabel: `${new Date(entry.startTime).toLocaleDateString()} ${t('timeTracker.at')} ${new Date(entry.startTime).toLocaleTimeString()}`,
            category: entry.category,
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