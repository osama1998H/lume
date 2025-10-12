import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { List, Calendar, Clock, Filter, RefreshCw, Plus, BarChart3, RotateCcw, RotateCw, ChevronDown, Sparkles } from 'lucide-react';
import { ActivityLogProvider, useActivityLog, parseSelectionKey } from '../contexts/ActivityLogContext';
import BulkActionToolbar from './ActivityLog/BulkActionToolbar';
import ActivityFilters from './ActivityLog/ActivityFilters';
import ActivityStatsPanel from './ActivityLog/ActivityStatsPanel';
import DataQualityPanel from './dataQuality/DataQualityPanel';
import { formatActionDescription } from '../utils/activityHistory';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import type { UnifiedActivity, Category, Tag, TimeGap } from '../types';

// View components
import ActivityListView from './ActivityLog/ActivityListView';
import ActivityCalendarView from './ActivityLog/ActivityCalendarView';
import Timeline from './Timeline';

// Modal components
import ActivityDetailModal from './ActivityLog/ActivityDetailModal';
import ActivityEditModal from './ActivityLog/ActivityEditModal';
import ActivityCreateModal, { NewActivityData } from './ActivityLog/ActivityCreateModal';
import BulkActionsModal, { BulkUpdateData } from './ActivityLog/BulkActionsModal';
import MergeActivitiesModal from './ActivityLog/MergeActivitiesModal';

/**
 * ActivityLog
 * Main container for the Unified Activity Log feature
 * Provides tab navigation, filtering, and view management
 */
const ActivityLogContent: React.FC = () => {
  const { t } = useTranslation();
  const {
    activeView,
    setActiveView,
    dateRange,
    filters,
    activities,
    setActivities,
    selectedActivities,
    clearSelection,
    refreshActivities,
    setRefreshCallback,
    undo,
    redo,
    canUndo,
    canRedo,
    recentActions,
  } = useActivityLog();

  // Local state
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDataQuality, setShowDataQuality] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal states
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [bulkActionsModalOpen, setBulkActionsModalOpen] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [selectedActivityForDetail, setSelectedActivityForDetail] = useState<UnifiedActivity | null>(null);
  const [selectedActivityForEdit, setSelectedActivityForEdit] = useState<UnifiedActivity | null>(null);

  // Data for modals
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  // Load categories and tags
  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoriesData, tagsData] = await Promise.all([
          window.electronAPI.getCategories(),
          window.electronAPI.getTags(),
        ]);
        setCategories(categoriesData);
        setTags(tagsData);
      } catch (error) {
        console.error('Failed to load categories and tags:', error);
      }
    };
    loadData();
  }, []);

  // Load activities when filters or date range changes
  useEffect(() => {
    const loadActivities = async () => {
      try {
        setIsRefreshing(true);
        const startDate = dateRange.start.toISOString();
        const endDate = dateRange.end.toISOString();

        const activitiesData = await window.electronAPI.getUnifiedActivities(
          startDate,
          endDate,
          filters
        );

        setActivities(activitiesData);
      } catch (error) {
        console.error('Failed to load activities:', error);
      } finally {
        setIsRefreshing(false);
      }
    };

    loadActivities();
    setRefreshCallback(loadActivities);
  }, [dateRange, filters, setActivities, setRefreshCallback]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshActivities();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'z',
      ctrl: true,
      description: t('activityLog.shortcuts.undo', 'Undo last action'),
      action: () => canUndo && undo()
    },
    {
      key: 'z',
      ctrl: true,
      shift: true,
      description: t('activityLog.shortcuts.redo', 'Redo last action'),
      action: () => canRedo && redo()
    },
    {
      key: 'n',
      ctrl: true,
      description: t('activityLog.shortcuts.newActivity', 'Create new activity'),
      action: () => setCreateModalOpen(true)
    },
    {
      key: 'r',
      ctrl: true,
      description: t('activityLog.shortcuts.refresh', 'Refresh activities'),
      action: handleRefresh
    },
    {
      key: 'f',
      ctrl: true,
      description: t('activityLog.shortcuts.toggleFilters', 'Toggle filters'),
      action: () => setShowFilters(!showFilters)
    },
    {
      key: 'Escape',
      description: t('activityLog.shortcuts.closePanels', 'Close all panels'),
      action: () => {
        setShowFilters(false);
        setShowStats(false);
        setShowHistory(false);
        setShowDataQuality(false);
        clearSelection();
      }
    },
  ]);

  // Tab configuration
  const tabs = [
    { id: 'list', label: t('activityLog.listView', 'List'), icon: List },
    { id: 'timeline', label: t('activityLog.timelineView', 'Timeline'), icon: Clock },
    { id: 'calendar', label: t('activityLog.calendarView', 'Calendar'), icon: Calendar },
  ] as const;

  // Bulk action handlers
  const handleBulkDelete = async () => {
    if (selectedActivities.size === 0) return;

    const confirmMessage = t(
      'activityLog.confirmDelete',
      `Are you sure you want to delete ${selectedActivities.size} activities? This action cannot be undone.`
    );

    if (window.confirm(confirmMessage)) {
      // TODO: Implement bulk delete via IPC
      console.log('Delete activities:', Array.from(selectedActivities));
      clearSelection();
    }
  };

  const handleBulkMerge = () => {
    if (selectedActivities.size < 2) return;
    setMergeModalOpen(true);
  };

  const handleBulkEdit = () => {
    if (selectedActivities.size === 0) return;
    setBulkActionsModalOpen(true);
  };

  const handleAssignCategory = () => {
    if (selectedActivities.size === 0) return;
    setBulkActionsModalOpen(true);
  };

  const handleAssignTags = () => {
    if (selectedActivities.size === 0) return;
    setBulkActionsModalOpen(true);
  };

  // Create activity handler
  const handleCreateActivity = async (data: NewActivityData) => {
    try {
      await window.electronAPI.addTimeEntry({
        task: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        duration: data.duration,
        categoryId: data.categoryId,
      });

      // Add tags if specified
      if (data.tagIds && data.tagIds.length > 0) {
        // Get the created entry ID (we'll need to fetch it or get it from the response)
        // For now, refresh the activities list
      }

      await refreshActivities();
    } catch (error) {
      console.error('Failed to create activity:', error);
      throw error;
    }
  };

  // Handler for creating activity from gap
  const handleCreateActivityFromGap = (_gap: TimeGap) => {
    // Pre-fill create modal with gap time range
    setCreateModalOpen(true);
    // Note: We would need to pass initial data to the modal
    // For now, the user will manually fill in the gap times
  };

  // Bulk update handler
  const handleBulkUpdate = async (updates: BulkUpdateData) => {
    try {
      await window.electronAPI.bulkUpdateActivities({
        activityIds: updates.activityIds,
        operation: 'update',
        updates: {
          categoryId: updates.categoryId ?? undefined,
        },
        addTagIds: updates.addTagIds,
        removeTagIds: updates.removeTagIds,
      });

      await refreshActivities();
      clearSelection();
    } catch (error) {
      console.error('Failed to bulk update:', error);
      throw error;
    }
  };

  // Merge handler
  const handleMerge = async (_mergedActivity: Partial<UnifiedActivity>) => {
    try {
      const activityIds = Array.from(selectedActivities).map(parseSelectionKey);
      // Use bulk operations for merging
      await window.electronAPI.bulkUpdateActivities({
        activityIds,
        operation: 'merge',
        mergeStrategy: 'longest',
      });

      await refreshActivities();
      clearSelection();
    } catch (error) {
      console.error('Failed to merge activities:', error);
      throw error;
    }
  };

  // Edit handler
  const handleEdit = async (updates: Partial<UnifiedActivity>) => {
    if (!selectedActivityForEdit) return;

    try {
      await window.electronAPI.updateUnifiedActivity({
        id: selectedActivityForEdit.id,
        sourceType: selectedActivityForEdit.sourceType,
        updates,
      });

      await refreshActivities();
    } catch (error) {
      console.error('Failed to update activity:', error);
      throw error;
    }
  };

  // Render active view
  const renderActiveView = () => {
    switch (activeView) {
      case 'list':
        return (
          <ActivityListView
            onActivityClick={(activity) => {
              setSelectedActivityForDetail(activity);
              setDetailModalOpen(true);
            }}
            onActivityEdit={(activity) => {
              setSelectedActivityForEdit(activity);
              setEditModalOpen(true);
            }}
            onActivityDelete={(activity) => {
              // TODO: Implement delete confirmation
              console.log('Delete activity:', activity);
            }}
            onActivityDuplicate={(activity) => {
              // TODO: Implement duplicate
              console.log('Duplicate activity:', activity);
            }}
          />
        );
      case 'timeline':
        return (
          <Timeline
            dateRange={dateRange}
            onActivityClick={(activity) => {
              setSelectedActivityForDetail(activity);
              setDetailModalOpen(true);
            }}
          />
        );
      case 'calendar':
        return (
          <ActivityCalendarView
            onActivityClick={(activity) => {
              setSelectedActivityForDetail(activity);
              setDetailModalOpen(true);
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <main
      className="h-full flex flex-col bg-gray-50 dark:bg-gray-900"
      role="main"
      aria-label={t('activityLog.ariaLabel', 'Activity Log main content')}
    >
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('activityLog.title', 'Activity Log')}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('activityLog.subtitle', 'View and manage all your tracked activities')}
              </p>
            </div>

            {/* Actions */}
            <nav className="flex items-center gap-2" aria-label={t('activityLog.toolbarLabel', 'Activity log toolbar')}>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                aria-label={t('activityLog.newActivityLabel', 'Create new activity (Ctrl+N)')}
                title={t('activityLog.newActivity', 'New Activity')}
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm font-medium">{t('activityLog.newActivity', 'New Activity')}</span>
              </button>

              {/* Undo/Redo with history dropdown */}
              <div className="flex items-center gap-1" role="group" aria-label={t('activityLog.historyActionsLabel', 'History actions')}>
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  aria-label={`${t('activityLog.history.undo', 'Undo')} (${navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Z)`}
                  aria-disabled={!canUndo}
                  title={`${t('activityLog.history.undo', 'Undo')} (${navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Z)`}
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  aria-label={`${t('activityLog.history.redo', 'Redo')} (${navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Shift+Z)`}
                  aria-disabled={!canRedo}
                  title={`${t('activityLog.history.redo', 'Redo')} (${navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Shift+Z)`}
                >
                  <RotateCw className="w-4 h-4" aria-hidden="true" />
                </button>

                {/* History dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    disabled={recentActions.length === 0}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={t('activityLog.history.actionHistory', 'Action History')}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {showHistory && recentActions.length > 0 && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50">
                      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {t('activityLog.history.actionHistory', 'Action History')}
                        </h4>
                      </div>
                      <div className="max-h-64 overflow-y-auto p-2">
                        {recentActions.map((action, index) => (
                          <div
                            key={index}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                          >
                            {formatActionDescription(action, t)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                aria-label={t('activityLog.refreshLabel', 'Refresh activities (Ctrl+R)')}
                aria-busy={isRefreshing}
                title={t('common.refresh', 'Refresh')}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                <span className="text-sm font-medium">{t('common.refresh', 'Refresh')}</span>
              </button>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  showFilters
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
                aria-label={t('activityLog.filtersLabel', 'Toggle filters panel (Ctrl+F)')}
                aria-expanded={showFilters}
                aria-controls="filters-panel"
              >
                <Filter className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm font-medium">{t('common.filters', 'Filters')}</span>
              </button>

              <button
                onClick={() => setShowStats(!showStats)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  showStats
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
                aria-label={t('activityLog.statsLabel', 'Toggle statistics panel')}
                aria-expanded={showStats}
                aria-controls="stats-panel"
                title={t('activityLog.statistics.title', 'Statistics')}
              >
                <BarChart3 className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm font-medium">{t('activityLog.statistics.title', 'Statistics')}</span>
              </button>

              <button
                onClick={() => setShowDataQuality(!showDataQuality)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  showDataQuality
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
                aria-label={t('activityLog.dataQualityLabel', 'Toggle data quality panel')}
                aria-expanded={showDataQuality}
                aria-controls="data-quality-panel"
                title={t('dataQuality.title', 'Data Quality')}
              >
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm font-medium">{t('dataQuality.button', 'Data Quality')}</span>
              </button>
            </nav>
          </div>

          {/* Tab Navigation */}
          <nav
            className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg"
            role="tablist"
            aria-label={t('activityLog.viewSelectorLabel', 'Activity view selector')}
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeView === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id as any)}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`${tab.id}-view-panel`}
                  tabIndex={isActive ? 0 : -1}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all flex-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    isActive
                      ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div id="filters-panel" role="region" aria-label={t('activityLog.filtersPanelLabel', 'Filters panel')}>
            <ActivityFilters
              categories={categories}
              tags={tags}
              onClose={() => setShowFilters(false)}
            />
          </div>
        )}
      </header>

      {/* Data Quality Panel */}
      {showDataQuality && (
        <section
          id="data-quality-panel"
          className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
          role="region"
          aria-label={t('activityLog.dataQualityPanelLabel', 'Data quality panel')}
        >
          <DataQualityPanel
            startDate={dateRange.start.toISOString()}
            endDate={dateRange.end.toISOString()}
            onClose={() => setShowDataQuality(false)}
            onCreateActivity={handleCreateActivityFromGap}
            onRefreshActivities={refreshActivities}
          />
        </section>
      )}

      {/* View Content and Stats Panel */}
      <div className="flex-1 overflow-hidden flex">
        <div
          id={`${activeView}-view-panel`}
          className={`flex-1 overflow-hidden ${showStats ? 'mr-2' : ''}`}
          role="tabpanel"
          aria-labelledby={`${activeView}-tab`}
        >
          {renderActiveView()}
        </div>

        {/* Stats Panel Sidebar */}
        {showStats && (
          <aside
            id="stats-panel"
            className="w-96 border-l border-gray-200 dark:border-gray-700 overflow-y-auto"
            role="complementary"
            aria-label={t('activityLog.statsPanelLabel', 'Statistics panel')}
          >
            <ActivityStatsPanel
              activities={activities}
              dateRange={dateRange}
              onClose={() => setShowStats(false)}
            />
          </aside>
        )}
      </div>

      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        selectionCount={selectedActivities.size}
        onClearSelection={clearSelection}
        onDelete={handleBulkDelete}
        onMerge={selectedActivities.size > 1 ? handleBulkMerge : undefined}
        onBulkEdit={handleBulkEdit}
        onAssignCategory={handleAssignCategory}
        onAssignTags={handleAssignTags}
      />

      {/* Modals */}
      {detailModalOpen && selectedActivityForDetail && (
        <ActivityDetailModal
          activity={selectedActivityForDetail}
          onClose={() => setDetailModalOpen(false)}
          onEdit={() => {
            setDetailModalOpen(false);
            setSelectedActivityForEdit(selectedActivityForDetail);
            setEditModalOpen(true);
          }}
        />
      )}

      {editModalOpen && selectedActivityForEdit && (
        <ActivityEditModal
          activity={selectedActivityForEdit}
          categories={categories}
          tags={tags}
          onClose={() => setEditModalOpen(false)}
          onSave={handleEdit}
        />
      )}

      {createModalOpen && (
        <ActivityCreateModal
          categories={categories}
          tags={tags}
          onClose={() => setCreateModalOpen(false)}
          onCreate={handleCreateActivity}
        />
      )}

      {bulkActionsModalOpen && (
        <BulkActionsModal
          selectedActivities={activities.filter(a =>
            Array.from(selectedActivities).some(key => {
              const parsed = parseSelectionKey(key);
              return parsed.id === a.id && parsed.sourceType === a.sourceType;
            })
          )}
          categories={categories}
          tags={tags}
          onClose={() => setBulkActionsModalOpen(false)}
          onBulkUpdate={handleBulkUpdate}
        />
      )}

      {mergeModalOpen && (
        <MergeActivitiesModal
          activities={Array.from(selectedActivities).map(parseSelectionKey)}
          allActivities={activities}
          onClose={() => setMergeModalOpen(false)}
          onMerge={handleMerge}
        />
      )}
    </main>
  );
};

/**
 * ActivityLog with Provider
 * Wraps the main component with ActivityLogProvider
 */
const ActivityLog: React.FC = () => {
  return (
    <ActivityLogProvider>
      <ActivityLogContent />
    </ActivityLogProvider>
  );
};

export default ActivityLog;
