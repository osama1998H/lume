import Database from 'better-sqlite3';
import { BaseRepository } from '../base/BaseRepository';
import { QueryOptions } from '../base/RepositoryTypes';
import { TimeEntry, Tag } from '../../types';

/**
 * Repository for time_entries table
 * Handles all time entry CRUD operations and tag associations
 */
export class TimeEntryRepository extends BaseRepository<TimeEntry> {
  constructor(db: Database.Database) {
    super(db, 'time_entries', {
      startTime: 'start_time',
      endTime: 'end_time',
      categoryId: 'category_id',
      createdAt: 'created_at',
    });
  }

  /**
   * Get all time entries with optional limit
   */
  getAll(options?: QueryOptions & { limit?: number }): TimeEntry[] {
    const queryOptions: QueryOptions = {
      orderBy: 'created_at',
      orderDirection: 'DESC',
      limit: options?.limit || 100,
    };
    return super.getAll(queryOptions);
  }

  /**
   * Insert a new time entry
   */
  insert(entry: Partial<TimeEntry>): number {
    const entryToInsert = {
      task: entry.task,
      startTime: entry.startTime,
      endTime: entry.endTime || null,
      duration: entry.duration || null,
      category: entry.category || null,
      categoryId: entry.categoryId || null,
    };
    return super.insert(entryToInsert);
  }

  /**
   * Update a time entry
   */
  update(id: number, updates: Partial<TimeEntry>): boolean {
    const allowedUpdates: Partial<TimeEntry> = {};

    if (updates.task !== undefined) allowedUpdates.task = updates.task;
    if (updates.endTime !== undefined) allowedUpdates.endTime = updates.endTime;
    if (updates.duration !== undefined) allowedUpdates.duration = updates.duration;
    if (updates.category !== undefined) allowedUpdates.category = updates.category;
    if (updates.categoryId !== undefined) allowedUpdates.categoryId = updates.categoryId;

    if (Object.keys(allowedUpdates).length === 0) {
      return false;
    }

    return super.update(id, allowedUpdates);
  }

  /**
   * Get the currently active time entry (no end_time)
   */
  getActive(): TimeEntry | null {
    const conditions = [
      { field: 'end_time', operator: 'IS NULL' as const }
    ];

    const entries = this.findWhere(conditions, {
      orderBy: 'created_at',
      orderDirection: 'DESC',
      limit: 1,
    });

    return entries[0] || null;
  }

  /**
   * Get time entries by date range
   */
  getByDateRange(startDate: string, endDate: string): TimeEntry[] {
    const query = `
      SELECT
        id,
        task,
        start_time AS startTime,
        end_time AS endTime,
        duration,
        category,
        category_id AS categoryId,
        created_at AS createdAt
      FROM time_entries
      WHERE DATE(start_time) BETWEEN ? AND ?
      ORDER BY start_time DESC
    `;

    return this.executeQuery<TimeEntry>(query, [startDate, endDate]);
  }

  /**
   * Get tags associated with a time entry
   */
  getTags(timeEntryId: number): Tag[] {
    const query = `
      SELECT
        t.id,
        t.name,
        t.color,
        t.created_at AS createdAt
      FROM tags t
      JOIN time_entry_tags tet ON t.id = tet.tag_id
      WHERE tet.time_entry_id = ?
      ORDER BY t.name ASC
    `;

    return this.executeQuery<Tag>(query, [timeEntryId]);
  }

  /**
   * Add tags to a time entry (additive)
   */
  addTags(timeEntryId: number, tagIds: number[]): void {
    if (tagIds.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO time_entry_tags (time_entry_id, tag_id)
      VALUES (?, ?)
    `);

    for (const tagId of tagIds) {
      stmt.run(timeEntryId, tagId);
    }
  }

  /**
   * Set tags for a time entry (replace all existing tags)
   */
  setTags(timeEntryId: number, tagIds: number[]): void {
    this.transaction(() => {
      // Delete existing tags
      const deleteStmt = this.db.prepare(`
        DELETE FROM time_entry_tags
        WHERE time_entry_id = ?
      `);
      deleteStmt.run(timeEntryId);

      // Insert new tags if any
      if (tagIds.length > 0) {
        const insertStmt = this.db.prepare(`
          INSERT OR IGNORE INTO time_entry_tags (time_entry_id, tag_id)
          VALUES (?, ?)
        `);

        for (const tagId of tagIds) {
          insertStmt.run(timeEntryId, tagId);
        }
      }
    });
  }

  /**
   * Get entries with their tags populated
   */
  getAllWithTags(options?: QueryOptions): (TimeEntry & { tags: Tag[] })[] {
    const entries = this.getAll(options);
    return entries.map(entry => ({
      ...entry,
      tags: entry.id ? this.getTags(entry.id) : [],
    }));
  }
}
