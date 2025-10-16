import type Database from 'better-sqlite3';
import type { DatabaseManager } from '@/database/DatabaseManager';
import { logger } from '@/services/logging/Logger';
import type {
  UnifiedActivity,
  UnifiedActivityFilters,
  UnifiedActivityUpdateOptions,
  BulkActivityOperation,
  ActivityConflict,
  UnifiedActivityStats,
  ActivitySourceType,
  UnifiedActivityType,
  TimeEntry,
  AppUsage,
  PomodoroSession,
  Tag,
} from '@/types';

/**
 * UnifiedActivityService - Manages unified activity log across all sources
 * Provides a unified interface for querying, updating, and analyzing activities
 * from time entries, app usage, and pomodoro sessions
 */
export class UnifiedActivityService {
  private db: Database.Database;
  private dbManager: DatabaseManager;

  constructor(db: Database.Database, dbManager: DatabaseManager) {
    this.db = db;
    this.dbManager = dbManager;
  }

  /**
   * Get unified activities from all sources (time entries, app usage, pomodoro)
   * with optional filtering
   */
  getUnifiedActivities(
    startDate: string,
    endDate: string,
    filters?: UnifiedActivityFilters
  ): UnifiedActivity[] {
    const activities: UnifiedActivity[] = [];

    try {
      // Determine which sources to query based on filters
      const sourceTypes = filters?.sourceTypes || ['manual', 'automatic', 'pomodoro'];

      // Query time entries (manual activities)
      if (sourceTypes.includes('manual')) {
        const timeEntries = this.queryTimeEntriesAsUnified(startDate, endDate, filters);
        activities.push(...timeEntries);
      }

      // Query app usage (automatic activities)
      if (sourceTypes.includes('automatic')) {
        const appUsage = this.queryAppUsageAsUnified(startDate, endDate, filters);
        activities.push(...appUsage);
      }

      // Query pomodoro sessions
      if (sourceTypes.includes('pomodoro')) {
        const pomodoroSessions = this.queryPomodoroAsUnified(startDate, endDate, filters);
        activities.push(...pomodoroSessions);
      }

      // Sort by start time
      activities.sort((a, b) => {
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });

      // Apply additional filters
      return this.applyUnifiedActivityFilters(activities, filters);
    } catch (error) {
      logger.error('Failed to get unified activities', {
        startDate,
        endDate,
        filters: JSON.stringify(filters),
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      return [];
    }
  }

  /**
   * Query time entries and transform to UnifiedActivity format
   */
  private queryTimeEntriesAsUnified(
    startDate: string,
    endDate: string,
    _filters?: UnifiedActivityFilters
  ): UnifiedActivity[] {
    const stmt = this.db.prepare(`
      SELECT
        te.id,
        te.task,
        te.start_time,
        te.end_time,
        te.duration,
        te.category,
        te.category_id,
        te.created_at,
        c.id AS categoryId,
        c.name AS categoryName,
        c.color AS categoryColor
      FROM time_entries te
      LEFT JOIN categories c ON te.category_id = c.id OR te.category = c.name
      WHERE te.end_time IS NOT NULL
        AND datetime(te.start_time) < datetime(?)
        AND datetime(te.end_time) > datetime(?)
      ORDER BY te.start_time ASC
    `);

    const rows = stmt.all(endDate, startDate) as any[];

    return rows.map(row => {
      const tags = row.id ? this.dbManager.getTimeEntryTags(row.id) : [];

      return {
        id: row.id,
        sourceType: 'manual' as ActivitySourceType,
        type: 'time_entry' as UnifiedActivityType,
        title: row.task,
        startTime: row.start_time,
        endTime: row.end_time,
        duration: row.duration || 0,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        categoryColor: row.categoryColor,
        tags,
        metadata: {
          originalId: row.id,
          originalTable: 'time_entries' as const,
        },
        isEditable: true,
        editableFields: ['title', 'startTime', 'endTime', 'duration', 'categoryId', 'tags'],
        createdAt: row.created_at,
      };
    });
  }

  /**
   * Query app usage and transform to UnifiedActivity format
   */
  private queryAppUsageAsUnified(
    startDate: string,
    endDate: string,
    _filters?: UnifiedActivityFilters
  ): UnifiedActivity[] {
    const stmt = this.db.prepare(`
      SELECT
        au.id,
        au.app_name,
        au.window_title,
        au.start_time,
        au.end_time,
        au.duration,
        au.category,
        au.category_id,
        au.domain,
        au.url,
        au.is_browser,
        au.is_idle,
        au.created_at,
        c.id AS categoryId,
        c.name AS categoryName,
        c.color AS categoryColor
      FROM app_usage au
      LEFT JOIN categories c ON au.category_id = c.id OR au.category = c.name
      WHERE au.end_time IS NOT NULL
        AND datetime(au.start_time) < datetime(?)
        AND datetime(au.end_time) > datetime(?)
      ORDER BY au.start_time ASC
    `);

    const rows = stmt.all(endDate, startDate) as any[];

    return rows.map(row => {
      const tags = row.id ? this.dbManager.getAppUsageTags(row.id) : [];
      const isBrowser = row.is_browser === 1;

      return {
        id: row.id,
        sourceType: 'automatic' as ActivitySourceType,
        type: (isBrowser ? 'browser' : 'app') as UnifiedActivityType,
        title: isBrowser ? (row.domain || row.app_name) : row.app_name,
        startTime: row.start_time,
        endTime: row.end_time,
        duration: row.duration || 0,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        categoryColor: row.categoryColor,
        tags,
        metadata: {
          appName: row.app_name,
          windowTitle: row.window_title,
          domain: row.domain,
          url: row.url,
          isBrowser,
          isIdle: row.is_idle === 1,
          originalId: row.id,
          originalTable: 'app_usage' as const,
        },
        isEditable: true,
        // Automatic activities can only edit category and tags, not time/app
        editableFields: ['categoryId', 'tags'],
        createdAt: row.created_at,
      };
    });
  }

  /**
   * Query pomodoro sessions and transform to UnifiedActivity format
   */
  private queryPomodoroAsUnified(
    startDate: string,
    endDate: string,
    _filters?: UnifiedActivityFilters
  ): UnifiedActivity[] {
    const stmt = this.db.prepare(`
      SELECT
        ps.id,
        ps.task,
        ps.session_type,
        ps.start_time,
        ps.end_time,
        ps.duration,
        ps.completed,
        ps.interrupted,
        ps.created_at
      FROM pomodoro_sessions ps
      WHERE ps.end_time IS NOT NULL
        AND datetime(ps.start_time) < datetime(?)
        AND datetime(ps.end_time) > datetime(?)
      ORDER BY ps.start_time ASC
    `);

    const rows = stmt.all(endDate, startDate) as any[];

    return rows.map(row => {
      const tags = row.id ? this.dbManager.getPomodoroSessionTags(row.id) : [];
      const isFocus = row.session_type === 'focus';

      return {
        id: row.id,
        sourceType: 'pomodoro' as ActivitySourceType,
        type: (isFocus ? 'pomodoro_focus' : 'pomodoro_break') as UnifiedActivityType,
        title: isFocus ? row.task : `${row.session_type} Break`,
        startTime: row.start_time,
        endTime: row.end_time,
        duration: row.duration || 0,
        tags,
        metadata: {
          sessionType: row.session_type,
          completed: row.completed === 1,
          interrupted: row.interrupted === 1,
          originalId: row.id,
          originalTable: 'pomodoro_sessions' as const,
        },
        isEditable: true,
        // Pomodoro sessions can only edit task name and tags, not duration
        editableFields: isFocus ? ['title', 'tags'] : ['tags'],
        createdAt: row.created_at,
      };
    });
  }

  /**
   * Apply additional filters to unified activities
   */
  private applyUnifiedActivityFilters(
    activities: UnifiedActivity[],
    filters?: UnifiedActivityFilters
  ): UnifiedActivity[] {
    if (!filters) return activities;

    return activities.filter(activity => {
      // Filter by activity types
      if (filters.activityTypes && filters.activityTypes.length > 0) {
        if (!filters.activityTypes.includes(activity.type)) {
          return false;
        }
      }

      // Filter by categories
      if (filters.categories && filters.categories.length > 0) {
        if (!activity.categoryId || !filters.categories.includes(activity.categoryId)) {
          return false;
        }
      }

      // Filter by tags
      if (filters.tags && filters.tags.length > 0) {
        const activityTagIds = activity.tags?.map(t => t.id).filter((id): id is number => id != null) || [];
        const hasMatchingTag = filters.tags.some(tagId => activityTagIds.includes(tagId));
        if (!hasMatchingTag) {
          return false;
        }
      }

      // Filter by search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesTitle = activity.title.toLowerCase().includes(query);
        const matchesCategory = activity.categoryName?.toLowerCase().includes(query);
        const matchesApp = activity.metadata?.appName?.toLowerCase().includes(query);
        const matchesDomain = activity.metadata?.domain?.toLowerCase().includes(query);

        if (!matchesTitle && !matchesCategory && !matchesApp && !matchesDomain) {
          return false;
        }
      }

      // Filter by duration
      if (filters.minDuration !== undefined && activity.duration < filters.minDuration) {
        return false;
      }
      if (filters.maxDuration !== undefined && activity.duration > filters.maxDuration) {
        return false;
      }

      // Filter by editability
      if (filters.isEditable !== undefined && activity.isEditable !== filters.isEditable) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get a single unified activity by ID and source type
   */
  getUnifiedActivity(id: number, sourceType: ActivitySourceType): UnifiedActivity | null {
    try {
      const activities = this.getUnifiedActivities(
        new Date('1970-01-01').toISOString(),
        new Date('2100-12-31').toISOString(),
        { sourceTypes: [sourceType] }
      );

      return activities.find(a => a.id === id && a.sourceType === sourceType) || null;
    } catch (error) {
      logger.error('Failed to get unified activity', {
        id,
        sourceType,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      return null;
    }
  }

  /**
   * Update a unified activity
   */
  updateUnifiedActivity(options: UnifiedActivityUpdateOptions): boolean {
    const { id, sourceType, updates, validateOverlap: _validateOverlap = true } = options;

    try {
      // Validate that only editable fields are being updated
      const activity = this.getUnifiedActivity(id, sourceType);
      if (!activity) {
        logger.error('Activity not found for update', { id, sourceType });
        return false;
      }

      if (!activity.isEditable) {
        logger.error('Cannot update non-editable activity', {
          id,
          sourceType,
          activityType: activity.type
        });
        return false;
      }

      // Check if updates contain only editable fields
      const updateKeys = Object.keys(updates);
      const invalidFields = updateKeys.filter(key => !activity.editableFields.includes(key));
      if (invalidFields.length > 0) {
        logger.error('Cannot update non-editable fields', {
          id,
          sourceType,
          invalidFields: invalidFields.join(', '),
          editableFields: activity.editableFields.join(', ')
        });
        return false;
      }

      // Route to appropriate update method based on source type
      switch (sourceType) {
        case 'manual':
          return this.updateTimeEntryFromUnified(id, updates);
        case 'automatic':
          return this.updateAppUsageFromUnified(id, updates);
        case 'pomodoro':
          return this.updatePomodoroFromUnified(id, updates);
        default:
          return false;
      }
    } catch (error) {
      logger.error('Failed to update unified activity', {
        id,
        sourceType,
        updates: JSON.stringify(updates),
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      return false;
    }
  }

  /**
   * Update time entry from unified activity updates
   */
  private updateTimeEntryFromUnified(id: number, updates: Partial<UnifiedActivity>): boolean {
    const timeEntryUpdates: Partial<TimeEntry> = {};

    if (updates.title !== undefined) timeEntryUpdates.task = updates.title;
    if (updates.startTime !== undefined) timeEntryUpdates.startTime = updates.startTime;
    if (updates.endTime !== undefined) timeEntryUpdates.endTime = updates.endTime;
    if (updates.duration !== undefined) timeEntryUpdates.duration = updates.duration;
    if (updates.categoryId !== undefined) timeEntryUpdates.categoryId = updates.categoryId;

    const success = this.dbManager.updateTimeEntry(id, timeEntryUpdates);

    // Update tags if provided
    if (success && updates.tags) {
      const tagIds = updates.tags.map(t => t.id).filter((id): id is number => id != null);
      this.dbManager.setTimeEntryTags(id, tagIds);
    }

    return success;
  }

  /**
   * Update app usage from unified activity updates
   */
  private updateAppUsageFromUnified(id: number, updates: Partial<UnifiedActivity>): boolean {
    const appUsageUpdates: Partial<AppUsage> = {};

    if (updates.categoryId !== undefined) appUsageUpdates.categoryId = updates.categoryId;

    const success = this.dbManager.updateAppUsage(id, appUsageUpdates);

    // Update tags if provided
    if (success && updates.tags) {
      const tagIds = updates.tags.map(t => t.id).filter((id): id is number => id != null);
      this.dbManager.setAppUsageTags(id, tagIds);
    }

    return success;
  }

  /**
   * Update pomodoro session from unified activity updates
   */
  private updatePomodoroFromUnified(id: number, updates: Partial<UnifiedActivity>): boolean {
    const pomodoroUpdates: Partial<PomodoroSession> = {};

    if (updates.title !== undefined) pomodoroUpdates.task = updates.title;

    const success = this.dbManager.updatePomodoroSession(id, pomodoroUpdates);

    // Update tags if provided
    if (success && updates.tags) {
      const tagIds = updates.tags.map(t => t.id).filter((id): id is number => id != null);
      this.dbManager.setPomodoroSessionTags(id, tagIds);
    }

    return success;
  }

  /**
   * Delete a unified activity
   */
  deleteUnifiedActivity(id: number, sourceType: ActivitySourceType): boolean {
    try {
      switch (sourceType) {
        case 'manual':
          return this.dbManager.deleteTimeEntry(id);
        case 'automatic':
          return this.dbManager.deleteAppUsage(id);
        case 'pomodoro':
          return this.dbManager.deletePomodoroSession(id);
        default:
          return false;
      }
    } catch (error) {
      logger.error('Failed to delete unified activity', {
        id,
        sourceType,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      return false;
    }
  }

  /**
   * Bulk update activities
   */
  bulkUpdateActivities(operation: BulkActivityOperation): { success: boolean; updated: number; failed: number } {
    const result = { success: true, updated: 0, failed: 0 };

    if (operation.operation !== 'update' || !operation.updates) {
      return { success: false, updated: 0, failed: 0 };
    }

    const transaction = this.db.transaction(() => {
      for (const { id, sourceType } of operation.activityIds) {
        try {
          const success = this.updateUnifiedActivity({
            id,
            sourceType,
            updates: operation.updates!,
            validateOverlap: false,
          });

          if (success) {
            result.updated++;
          } else {
            result.failed++;
          }
        } catch (error) {
          logger.warn('Failed to update activity in bulk operation', {
            activityId: id,
            sourceType,
            error: error instanceof Error ? error.message : String(error)
          });
          result.failed++;
        }
      }
    });

    try {
      transaction();
      result.success = true;
    } catch (error) {
      logger.error('Bulk update transaction failed', {
        operationType: operation.operation,
        activityCount: operation.activityIds.length,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      result.success = false;
    }

    return result;
  }

  /**
   * Bulk delete activities
   */
  bulkDeleteActivities(
    activityIds: Array<{ id: number; sourceType: ActivitySourceType }>
  ): { success: boolean; deleted: number; failed: number } {
    const result = { success: true, deleted: 0, failed: 0 };

    const transaction = this.db.transaction(() => {
      for (const { id, sourceType } of activityIds) {
        try {
          const success = this.deleteUnifiedActivity(id, sourceType);

          if (success) {
            result.deleted++;
          } else {
            result.failed++;
          }
        } catch (error) {
          logger.warn('Failed to delete activity in bulk operation', {
            activityId: id,
            sourceType,
            error: error instanceof Error ? error.message : String(error)
          });
          result.failed++;
        }
      }
    });

    try {
      transaction();
      result.success = true;
    } catch (error) {
      logger.error('Bulk delete transaction failed', {
        activityCount: activityIds.length,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      result.success = false;
    }

    return result;
  }

  /**
   * Get activity conflicts (overlaps, duplicates, gaps)
   */
  getActivityConflicts(startDate: string, endDate: string): ActivityConflict[] {
    const activities = this.getUnifiedActivities(startDate, endDate);
    const conflicts: ActivityConflict[] = [];

    // Check for overlaps within same source type
    for (let i = 0; i < activities.length; i++) {
      for (let j = i + 1; j < activities.length; j++) {
        const a1 = activities[i];
        const a2 = activities[j];

        // Skip if either activity is undefined
        if (!a1 || !a2) {
          continue;
        }

        // Only check overlaps within same source type
        if (a1.sourceType !== a2.sourceType) continue;

        const start1 = new Date(a1.startTime).getTime();
        const end1 = new Date(a1.endTime).getTime();
        const start2 = new Date(a2.startTime).getTime();
        const end2 = new Date(a2.endTime).getTime();

        // Check for overlap
        if (start1 < end2 && start2 < end1) {
          conflicts.push({
            conflictType: 'overlap',
            activities: [a1, a2],
            suggestedResolution: 'merge',
            message: `Activities overlap: "${a1.title}" and "${a2.title}"`,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Get unified activity statistics
   */
  getUnifiedActivityStats(startDate: string, endDate: string): UnifiedActivityStats {
    const activities = this.getUnifiedActivities(startDate, endDate);

    const stats: UnifiedActivityStats = {
      totalActivities: activities.length,
      totalDuration: activities.reduce((sum, a) => sum + a.duration, 0),
      bySourceType: {
        manual: activities.filter(a => a.sourceType === 'manual').length,
        automatic: activities.filter(a => a.sourceType === 'automatic').length,
        pomodoro: activities.filter(a => a.sourceType === 'pomodoro').length,
      },
      byCategory: [],
      editableCount: activities.filter(a => a.isEditable).length,
      conflictsCount: this.getActivityConflicts(startDate, endDate).length,
      gapsDetected: 0,
    };

    // Calculate category breakdown
    const categoryMap = new Map<number, { name: string; color: string; time: number; count: number }>();

    for (const activity of activities) {
      if (activity.categoryId && activity.categoryName) {
        const existing = categoryMap.get(activity.categoryId);
        if (existing) {
          existing.time += activity.duration;
          existing.count++;
        } else {
          categoryMap.set(activity.categoryId, {
            name: activity.categoryName,
            color: activity.categoryColor || '#3B82F6',
            time: activity.duration,
            count: 1,
          });
        }
      }
    }

    stats.byCategory = Array.from(categoryMap.entries()).map(([id, data]) => ({
      categoryId: id,
      categoryName: data.name,
      categoryColor: data.color,
      totalTime: data.time,
      percentage: stats.totalDuration > 0 ? (data.time / stats.totalDuration) * 100 : 0,
      activityCount: data.count,
    }));

    return stats;
  }

  /**
   * Search activities with full-text search across all activity types
   * Searches through titles, app names, domains, categories, and tags
   */
  searchActivities(
    query: string,
    filters?: UnifiedActivityFilters
  ): UnifiedActivity[] {
    if (!query.trim()) {
      // If no query, return filtered activities
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30); // Last 30 days by default

      return this.getUnifiedActivities(
        startDate.toISOString(),
        today.toISOString(),
        filters
      );
    }

    // Create search filter
    const dateRange = filters?.dateRange || {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // Last 90 days
      end: new Date().toISOString(),
    };

    const searchFilters: UnifiedActivityFilters = {
      ...filters,
      dateRange,
      searchQuery: query,
    };

    return this.getUnifiedActivities(
      dateRange.start,
      dateRange.end,
      searchFilters
    );
  }

  /**
   * Merge multiple activities into one
   * This is a convenience method that delegates to ActivityMergeService
   * but provides a database-level interface
   */
  async mergeActivitiesById(
    activityIds: Array<{ id: number; sourceType: ActivitySourceType }>,
    strategy: 'longest' | 'earliest' | 'latest' = 'longest'
  ): Promise<{ success: boolean; mergedActivity?: UnifiedActivity; error?: string }> {
    try {
      // Get all activities to merge
      const activitiesToMerge: UnifiedActivity[] = [];

      for (const { id, sourceType } of activityIds) {
        const activity = this.getUnifiedActivity(id, sourceType);
        if (activity) {
          activitiesToMerge.push(activity);
        }
      }

      if (activitiesToMerge.length === 0) {
        return { success: false, error: 'No activities found to merge' };
      }

      if (activitiesToMerge.length === 1) {
        return { success: true, mergedActivity: activitiesToMerge[0] };
      }

      // Check if all activities are from the same source type
      const sourceTypes = new Set(activitiesToMerge.map(a => a.sourceType));
      if (sourceTypes.size > 1) {
        return { success: false, error: 'Cannot merge activities from different source types' };
      }

      const firstActivity = activitiesToMerge[0];
      if (!firstActivity) {
        return { success: false, error: 'No activities found to merge' };
      }

      const sourceType = firstActivity.sourceType;

      // Sort activities by start time
      const sorted = [...activitiesToMerge].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      const firstSorted = sorted[0];
      if (!firstSorted) {
        return { success: false, error: 'Sorted activities array is empty' };
      }

      // Determine base activity based on strategy
      let baseActivity: UnifiedActivity;
      switch (strategy) {
        case 'longest':
          baseActivity = sorted.reduce((prev, current) =>
            current.duration > prev.duration ? current : prev
          , firstSorted);
          break;
        case 'earliest':
          baseActivity = firstSorted;
          break;
        case 'latest': {
          const lastActivity = sorted[sorted.length - 1];
          if (!lastActivity) {
            return { success: false, error: 'Cannot get last activity' };
          }
          baseActivity = lastActivity;
          break;
        }
        default:
          baseActivity = firstSorted;
      }

      // Calculate merged time range
      const earliestStart = firstSorted.startTime;
      const latestEnd = sorted.reduce((latest, activity) =>
        new Date(activity.endTime).getTime() > new Date(latest).getTime() ? activity.endTime : latest
      , firstSorted.endTime);

      // Calculate merged duration
      const mergedDuration = Math.floor(
        (new Date(latestEnd).getTime() - new Date(earliestStart).getTime()) / 1000
      );

      // Combine tags from all activities (deduplicate by tag ID)
      const allTags = this.mergeTags(activitiesToMerge);

      // Use transaction to update base activity and delete others
      const transaction = this.db.transaction(() => {
        // Update the base activity with merged data
        const updateResult = this.updateUnifiedActivity({
          id: baseActivity.id,
          sourceType: baseActivity.sourceType,
          updates: {
            startTime: earliestStart,
            endTime: latestEnd,
            duration: mergedDuration,
            tags: allTags,
          },
          validateOverlap: false,
        });

        if (!updateResult) {
          throw new Error('Failed to update base activity');
        }

        // Delete other activities
        for (const activity of sorted) {
          if (activity.id !== baseActivity.id) {
            this.deleteUnifiedActivity(activity.id, activity.sourceType);
          }
        }
      });

      transaction();

      // Get the updated merged activity
      const mergedActivity = this.getUnifiedActivity(baseActivity.id, sourceType);

      return {
        success: true,
        mergedActivity: mergedActivity || undefined,
      };
    } catch (error) {
      logger.error('Failed to merge activities', {
        activityCount: activityIds.length,
        strategy,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Helper method to merge tags from multiple activities
   * Deduplicates by tag ID
   */
  private mergeTags(activities: UnifiedActivity[]): Tag[] {
    const tagMap = new Map<number, Tag>();

    for (const activity of activities) {
      if (activity.tags) {
        for (const tag of activity.tags) {
          if (tag.id && !tagMap.has(tag.id)) {
            tagMap.set(tag.id, tag);
          }
        }
      }
    }

    return Array.from(tagMap.values());
  }
}
