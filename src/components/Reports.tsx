import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, CheckCircle2, Timer, Smartphone } from 'lucide-react';
import { TimeEntry, AppUsage, Category } from '../types';
import { ActivitySession } from '../types/activity';
import StatCard from './ui/StatCard';
import ProgressListCard from './ui/ProgressListCard';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

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

        console.log('📊 Reports - Loaded time entries:', entries.length);
        console.log('📊 Reports - Sample time entry:', entries[0]);
        console.log('📊 Reports - Loaded app usage:', usage.length);
        console.log('📊 Reports - Sample app usage:', usage[0]);
        console.log('📊 Reports - Loaded categories:', cats.length);

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
        <div className="animate-pulse-slow text-lg text-muted-foreground">{t('reports.loading')}</div>
      </div>
    );
  }

  return (
    <div className="p-8 overflow-y-auto">
      <div className="mb-8 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">{t('reports.title')}</h2>
            <p className="text-muted-foreground">{t('reports.subtitle')}</p>
          </div>
          <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as 'day' | 'week' | 'month')}>
            <TabsList>
              <TabsTrigger value="day">{t('reports.today')}</TabsTrigger>
              <TabsTrigger value="week">{t('reports.week')}</TabsTrigger>
              <TabsTrigger value="month">{t('reports.month')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Clock}
          title={t('reports.totalTrackedTime')}
          value={formatDuration(stats.totalTrackedTime)}
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
          value={formatDuration(stats.averageTaskTime)}
          colorScheme="orange"
        />
        <StatCard
          icon={Smartphone}
          title={t('reports.totalAppUsage')}
          value={formatDuration(stats.totalAppTime)}
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
            formattedValue: formatDuration(cat.time),
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

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>{t('reports.recentActivitySessions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('reports.application')}</TableHead>
                  <TableHead>{t('reports.category')}</TableHead>
                  <TableHead>{t('reports.domain')}</TableHead>
                  <TableHead>{t('reports.duration')}</TableHead>
                  <TableHead>{t('reports.startTime')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activitySessions.slice(0, 20).map((session, index) => (
                  <TableRow key={session.id || index}>
                    <TableCell className="font-medium">{session.app_name}</TableCell>
                    <TableCell>
                      <Badge variant={session.category === 'website' ? 'default' : 'secondary'} className="text-xs">
                        {session.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{session.domain || session.window_title || '-'}</TableCell>
                    <TableCell>{session.duration ? formatDuration(session.duration) : '-'}</TableCell>
                    <TableCell>{session.start_time ? new Date(session.start_time).toLocaleString() : '-'}</TableCell>
                  </TableRow>
                ))}
                {activitySessions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      {t('reports.noActivityData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;