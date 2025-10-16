import Database from 'better-sqlite3';
import { BaseRepository } from '../base/BaseRepository';
import { QueryOptions } from '../base/RepositoryTypes';
import { Tag } from '@/types';
import { QueryParameters } from '@/types/database';

/**
 * Repository for tags table
 * Handles all tag CRUD operations
 */
export class TagRepository extends BaseRepository<Tag> {
  constructor(db: Database.Database) {
    super(db, 'tags', {
      createdAt: 'created_at',
    });
  }

  /**
   * Get all tags ordered by name
   */
  getAll(options?: QueryOptions): Tag[] {
    const queryOptions: QueryOptions = {
      orderBy: 'name',
      orderDirection: 'ASC',
      ...options,
    };
    return super.getAll(queryOptions);
  }

  /**
   * Insert a new tag
   */
  insert(tag: Partial<Tag>): number {
    const tagToInsert = {
      name: tag.name,
      color: tag.color || '#8B5CF6',
    };
    return super.insert(tagToInsert);
  }

  /**
   * Update a tag
   */
  update(id: number, updates: Partial<Tag>): boolean {
    const allowedUpdates: Partial<Tag> = {};

    if (updates.name !== undefined) allowedUpdates.name = updates.name;
    if (updates.color !== undefined) allowedUpdates.color = updates.color;

    if (Object.keys(allowedUpdates).length === 0) {
      return false;
    }

    return super.update(id, allowedUpdates);
  }

  /**
   * Get tag by name
   */
  getByName(name: string): Tag | null {
    const conditions = [
      { field: 'name', operator: '=' as const, value: name }
    ];

    return this.findOneWhere(conditions);
  }

  /**
   * Check if a tag name already exists (for validation)
   */
  nameExists(name: string, excludeId?: number): boolean {
    let query = 'SELECT 1 FROM tags WHERE name = ?';
    const params: QueryParameters = [name];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    query += ' LIMIT 1';

    const stmt = this.db.prepare(query);
    return stmt.get(...params) !== undefined;
  }

  /**
   * Get tags used by time entries
   */
  getUsedByTimeEntries(): Tag[] {
    const query = `
      SELECT DISTINCT
        t.id,
        t.name,
        t.color,
        t.created_at AS createdAt
      FROM tags t
      JOIN time_entry_tags tet ON t.id = tet.tag_id
      ORDER BY t.name ASC
    `;

    return this.executeQuery<Tag>(query);
  }

  /**
   * Get tags used by app usage
   */
  getUsedByAppUsage(): Tag[] {
    const query = `
      SELECT DISTINCT
        t.id,
        t.name,
        t.color,
        t.created_at AS createdAt
      FROM tags t
      JOIN app_usage_tags aut ON t.id = aut.tag_id
      ORDER BY t.name ASC
    `;

    return this.executeQuery<Tag>(query);
  }

  /**
   * Get tags used by pomodoro sessions
   */
  getUsedByPomodoroSessions(): Tag[] {
    const query = `
      SELECT DISTINCT
        t.id,
        t.name,
        t.color,
        t.created_at AS createdAt
      FROM tags t
      JOIN pomodoro_session_tags pst ON t.id = pst.tag_id
      ORDER BY t.name ASC
    `;

    return this.executeQuery<Tag>(query);
  }

  /**
   * Get tags used by productivity goals
   */
  getUsedByGoals(): Tag[] {
    const query = `
      SELECT DISTINCT
        t.id,
        t.name,
        t.color,
        t.created_at AS createdAt
      FROM tags t
      JOIN productivity_goal_tags pgt ON t.id = pgt.tag_id
      ORDER BY t.name ASC
    `;

    return this.executeQuery<Tag>(query);
  }
}
