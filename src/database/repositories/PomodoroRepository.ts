import Database from 'better-sqlite3';
import { BaseRepository } from '../base/BaseRepository';
import { QueryOptions } from '../base/RepositoryTypes';
import { PomodoroSession, PomodoroStats, Tag } from '../../types';

/**
 * Repository for pomodoro_sessions table
 * Handles all Pomodoro session CRUD operations and statistics
 */
export class PomodoroRepository extends BaseRepository<PomodoroSession> {
  constructor(db: Database.Database) {
    super(db, 'pomodoro_sessions', {
      sessionType: 'session_type',
      startTime: 'start_time',
      endTime: 'end_time',
      todoId: 'todo_id',
      createdAt: 'created_at',
    });
  }

  /**
   * Get all sessions with optional limit
   */
  getAll(options?: QueryOptions & { limit?: number }): PomodoroSession[] {
    const queryOptions: QueryOptions = {
      orderBy: options?.orderBy ?? 'created_at',
      orderDirection: options?.orderDirection ?? 'DESC',
      limit: options?.limit ?? 100,
      offset: options?.offset,
    };

    const sessions = super.getAll(queryOptions);
    // Convert integers to booleans
    return sessions.map(session => ({
      ...session,
      completed: Boolean(session.completed),
      interrupted: Boolean(session.interrupted),
    }));
  }

  /**
   * Insert a new Pomodoro session
   */
  insert(session: Partial<PomodoroSession>): number {
    console.log(`💾 DB: Inserting pomodoro session - ${session.task} (${session.sessionType})`);

    // Convert booleans to integers for SQLite
    const snakeEntity = this.toSnakeCase({
      task: session.task,
      sessionType: session.sessionType,
      duration: session.duration,
      startTime: session.startTime,
      endTime: session.endTime ?? undefined,
      completed: session.completed ? 1 : 0,
      interrupted: session.interrupted ? 1 : 0,
      todoId: session.todoId ?? undefined,
    } as any);

    const columns = Object.keys(snakeEntity);
    const placeholders = columns.map(() => '?').join(', ');
    const values = Object.values(snakeEntity);

    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders})
    `;

    const stmt = this.db.prepare(query);
    const result = stmt.run(...values);
    const id = result.lastInsertRowid as number;

    console.log(`✅ DB: Pomodoro session saved with ID: ${id}`);
    return id;
  }

  /**
   * Update a Pomodoro session
   */
  update(id: number, updates: Partial<PomodoroSession>): boolean {
    const allowedUpdates: any = {};

    if (updates.task !== undefined) allowedUpdates.task = updates.task;
    if (updates.endTime !== undefined) allowedUpdates.endTime = updates.endTime;
    if (updates.completed !== undefined) allowedUpdates.completed = updates.completed ? 1 : 0;
    if (updates.interrupted !== undefined) allowedUpdates.interrupted = updates.interrupted ? 1 : 0;
    if (updates.todoId !== undefined) allowedUpdates.todoId = updates.todoId;

    if (Object.keys(allowedUpdates).length === 0) {
      return false;
    }

    return super.update(id, allowedUpdates);
  }

  /**
   * Get sessions by date range
   */
  getByDateRange(startDate: string, endDate: string): PomodoroSession[] {
    const query = `
      SELECT
        id,
        task,
        session_type AS sessionType,
        duration,
        start_time AS startTime,
        end_time AS endTime,
        completed,
        interrupted,
        todo_id AS todoId,
        created_at AS createdAt
      FROM pomodoro_sessions
      WHERE DATE(start_time) BETWEEN ? AND ?
      ORDER BY start_time DESC
    `;

    const results = this.executeQuery<any>(query, [startDate, endDate]);
    return results.map(row => ({
      ...row,
      completed: Boolean(row.completed),
      interrupted: Boolean(row.interrupted),
    }));
  }

  /**
   * Get completed focus sessions
   */
  getCompletedFocusSessions(limit = 100): PomodoroSession[] {
    const conditions = [
      { field: 'session_type', operator: '=' as const, value: 'focus' },
      { field: 'completed', operator: '=' as const, value: 1 },
    ];

    const sessions = this.findWhere(conditions, {
      orderBy: 'start_time',
      orderDirection: 'DESC',
      limit,
    });

    return sessions.map(session => ({
      ...session,
      completed: Boolean(session.completed),
      interrupted: Boolean(session.interrupted),
    }));
  }

  /**
   * Get Pomodoro statistics
   */
  getStats(startDate?: string, endDate?: string): PomodoroStats {
    let whereClause = '';
    const params: any[] = [];

    if (startDate && endDate) {
      whereClause = 'WHERE DATE(start_time) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // Total and completed sessions
    const statsQuery = `
      SELECT
        COUNT(*) as totalSessions,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completedSessions,
        SUM(CASE WHEN session_type = 'focus' AND completed = 1 THEN duration ELSE 0 END) as totalFocusTime,
        SUM(CASE WHEN session_type IN ('shortBreak', 'longBreak') AND completed = 1 THEN duration ELSE 0 END) as totalBreakTime
      FROM pomodoro_sessions
      ${whereClause}
    `;

    const stats = this.executeQuerySingle<any>(statsQuery, params);

    if (!stats) {
      return {
        totalSessions: 0,
        completedSessions: 0,
        totalFocusTime: 0,
        totalBreakTime: 0,
        completionRate: 0,
        currentStreak: 0,
      };
    }

    // Calculate completion rate
    const completionRate =
      stats.totalSessions > 0 ? (stats.completedSessions / stats.totalSessions) * 100 : 0;

    // Calculate current streak
    const currentStreak = this.calculateCurrentStreak();

    return {
      totalSessions: stats.totalSessions || 0,
      completedSessions: stats.completedSessions || 0,
      totalFocusTime: stats.totalFocusTime || 0,
      totalBreakTime: stats.totalBreakTime || 0,
      completionRate,
      currentStreak,
    };
  }

  /**
   * Calculate current streak (consecutive days with completed sessions)
   */
  private calculateCurrentStreak(): number {
    const streakQuery = `
      SELECT DATE(start_time) as date
      FROM pomodoro_sessions
      WHERE completed = 1
      GROUP BY DATE(start_time)
      ORDER BY date DESC
    `;

    const dates = this.executeQuery<{ date: string }>(streakQuery);

    if (dates.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < dates.length; i++) {
      const sessionDate = new Date(dates[i].date);
      sessionDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);

      if (sessionDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Get tags associated with a Pomodoro session
   */
  getTags(pomodoroSessionId: number): Tag[] {
    const query = `
      SELECT
        t.id,
        t.name,
        t.color,
        t.created_at AS createdAt
      FROM tags t
      JOIN pomodoro_session_tags pst ON t.id = pst.tag_id
      WHERE pst.pomodoro_session_id = ?
      ORDER BY t.name ASC
    `;

    return this.executeQuery<Tag>(query, [pomodoroSessionId]);
  }

  /**
   * Add tags to a Pomodoro session (additive)
   */
  addTags(pomodoroSessionId: number, tagIds: number[]): void {
    if (tagIds.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO pomodoro_session_tags (pomodoro_session_id, tag_id)
      VALUES (?, ?)
    `);

    for (const tagId of tagIds) {
      stmt.run(pomodoroSessionId, tagId);
    }
  }

  /**
   * Set tags for a Pomodoro session (replace all existing tags)
   */
  setTags(pomodoroSessionId: number, tagIds: number[]): void {
    this.transaction(() => {
      // Delete existing tags
      const deleteStmt = this.db.prepare(`
        DELETE FROM pomodoro_session_tags
        WHERE pomodoro_session_id = ?
      `);
      deleteStmt.run(pomodoroSessionId);

      // Insert new tags if any
      if (tagIds.length > 0) {
        const insertStmt = this.db.prepare(`
          INSERT OR IGNORE INTO pomodoro_session_tags (pomodoro_session_id, tag_id)
          VALUES (?, ?)
        `);

        for (const tagId of tagIds) {
          insertStmt.run(pomodoroSessionId, tagId);
        }
      }
    });
  }

  /**
   * Get sessions with their tags populated
   */
  getAllWithTags(options?: QueryOptions): (PomodoroSession & { tags: Tag[] })[] {
    const sessions = this.getAll(options);
    return sessions.map(session => ({
      ...session,
      tags: session.id ? this.getTags(session.id) : [],
    }));
  }
}
