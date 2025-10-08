import Database from 'better-sqlite3';
import { BaseRepository } from '../base/BaseRepository';
import { QueryOptions } from '../base/RepositoryTypes';
import { AppUsage, Tag } from '../../types';

/**
 * Repository for app_usage table
 * Handles all app usage tracking CRUD operations and tag associations
 */
export class AppUsageRepository extends BaseRepository<AppUsage> {
  constructor(db: Database.Database) {
    super(db, 'app_usage', {
      appName: 'app_name',
      windowTitle: 'window_title',
      startTime: 'start_time',
      endTime: 'end_time',
      categoryId: 'category_id',
      isBrowser: 'is_browser',
      isIdle: 'is_idle',
      createdAt: 'created_at',
    });
  }

  /**
   * Get all app usage records with optional limit
   */
  getAll(options?: QueryOptions & { limit?: number }): AppUsage[] {
    const queryOptions: QueryOptions = {
      orderBy: 'created_at',
      orderDirection: 'DESC',
      limit: options?.limit || 100,
    };
    return super.getAll(queryOptions);
  }

  /**
   * Insert a new app usage record
   */
  insert(usage: Partial<AppUsage>): number {
    const usageToInsert = {
      appName: usage.appName,
      windowTitle: usage.windowTitle || null,
      startTime: usage.startTime,
      endTime: usage.endTime || null,
      duration: usage.duration || null,
      category: usage.category || null,
      categoryId: usage.categoryId || null,
      domain: usage.domain || null,
      url: usage.url || null,
      isBrowser: usage.isBrowser ? 1 : 0,
      isIdle: usage.isIdle ? 1 : 0,
    };
    return super.insert(usageToInsert);
  }

  /**
   * Update an app usage record
   */
  update(id: number, updates: Partial<AppUsage>): boolean {
    const allowedUpdates: any = {};

    if (updates.endTime !== undefined) allowedUpdates.endTime = updates.endTime;
    if (updates.duration !== undefined) allowedUpdates.duration = updates.duration;
    if (updates.category !== undefined) allowedUpdates.category = updates.category;
    if (updates.categoryId !== undefined) allowedUpdates.categoryId = updates.categoryId;
    if (updates.isIdle !== undefined) allowedUpdates.isIdle = updates.isIdle ? 1 : 0;

    if (Object.keys(allowedUpdates).length === 0) {
      return false;
    }

    return super.update(id, allowedUpdates);
  }

  /**
   * Get app usage records by date range
   */
  getByDateRange(startDate: string, endDate: string): AppUsage[] {
    const query = `
      SELECT
        id,
        app_name AS appName,
        window_title AS windowTitle,
        category,
        category_id AS categoryId,
        domain,
        url,
        start_time AS startTime,
        end_time AS endTime,
        duration,
        is_browser AS isBrowser,
        is_idle AS isIdle,
        created_at AS createdAt
      FROM app_usage
      WHERE DATE(start_time) BETWEEN ? AND ?
      ORDER BY start_time DESC
    `;

    return this.executeQuery<AppUsage>(query, [startDate, endDate]);
  }

  /**
   * Get active app usage records (no end_time)
   */
  getActive(): AppUsage[] {
    const conditions = [
      { field: 'end_time', operator: 'IS NULL' as const }
    ];

    return this.findWhere(conditions, {
      orderBy: 'start_time',
      orderDirection: 'DESC',
    });
  }

  /**
   * Get app usage by app name
   */
  getByAppName(appName: string, limit = 50): AppUsage[] {
    const conditions = [
      { field: 'app_name', operator: '=' as const, value: appName }
    ];

    return this.findWhere(conditions, {
      orderBy: 'start_time',
      orderDirection: 'DESC',
      limit,
    });
  }

  /**
   * Get browser usage (is_browser = 1)
   */
  getBrowserUsage(limit = 100): AppUsage[] {
    const conditions = [
      { field: 'is_browser', operator: '=' as const, value: 1 }
    ];

    return this.findWhere(conditions, {
      orderBy: 'start_time',
      orderDirection: 'DESC',
      limit,
    });
  }

  /**
   * Get non-idle usage
   */
  getActiveUsage(limit = 100): AppUsage[] {
    const conditions = [
      { field: 'is_idle', operator: '=' as const, value: 0 }
    ];

    return this.findWhere(conditions, {
      orderBy: 'start_time',
      orderDirection: 'DESC',
      limit,
    });
  }

  /**
   * Get tags associated with an app usage record
   */
  getTags(appUsageId: number): Tag[] {
    const query = `
      SELECT
        t.id,
        t.name,
        t.color,
        t.created_at AS createdAt
      FROM tags t
      JOIN app_usage_tags aut ON t.id = aut.tag_id
      WHERE aut.app_usage_id = ?
      ORDER BY t.name ASC
    `;

    return this.executeQuery<Tag>(query, [appUsageId]);
  }

  /**
   * Add tags to an app usage record (additive)
   */
  addTags(appUsageId: number, tagIds: number[]): void {
    if (tagIds.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO app_usage_tags (app_usage_id, tag_id)
      VALUES (?, ?)
    `);

    for (const tagId of tagIds) {
      stmt.run(appUsageId, tagId);
    }
  }

  /**
   * Set tags for an app usage record (replace all existing tags)
   */
  setTags(appUsageId: number, tagIds: number[]): void {
    this.transaction(() => {
      // Delete existing tags
      const deleteStmt = this.db.prepare(`
        DELETE FROM app_usage_tags
        WHERE app_usage_id = ?
      `);
      deleteStmt.run(appUsageId);

      // Insert new tags if any
      if (tagIds.length > 0) {
        const insertStmt = this.db.prepare(`
          INSERT OR IGNORE INTO app_usage_tags (app_usage_id, tag_id)
          VALUES (?, ?)
        `);

        for (const tagId of tagIds) {
          insertStmt.run(appUsageId, tagId);
        }
      }
    });
  }

  /**
   * Get usage records with their tags populated
   */
  getAllWithTags(options?: QueryOptions): (AppUsage & { tags: Tag[] })[] {
    const usageRecords = this.getAll(options);
    return usageRecords.map(usage => ({
      ...usage,
      tags: usage.id ? this.getTags(usage.id) : [],
    }));
  }
}
