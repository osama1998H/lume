import Database from 'better-sqlite3';
import { BaseRepository } from '../base/BaseRepository';
import { QueryOptions } from '../base/RepositoryTypes';
import { ProductivityGoal, GoalProgress, GoalWithProgress, GoalStats, Tag, GoalStatus } from '../../types';
import { DatabaseRow } from '../../types/database';

/**
 * Repository for productivity_goals and goal_progress tables
 * Handles all productivity goal CRUD operations, progress tracking, and statistics
 */
export class GoalRepository extends BaseRepository<ProductivityGoal> {
  constructor(db: Database.Database) {
    super(db, 'productivity_goals', {
      goalType: 'goal_type',
      appName: 'app_name',
      targetMinutes: 'target_minutes',
      notificationsEnabled: 'notifications_enabled',
      notifyAtPercentage: 'notify_at_percentage',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    });
  }

  /**
   * Get all goals with optional active filter
   */
  getAll(options?: QueryOptions & { activeOnly?: boolean }): ProductivityGoal[] {
    let conditions = undefined;

    if (options?.activeOnly) {
      conditions = [{ field: 'active', operator: '=' as const, value: 1 }];
    }

    const queryOptions: QueryOptions = {
      orderBy: 'created_at',
      orderDirection: 'DESC',
      ...options,
    };

    const goals = conditions
      ? this.findWhere(conditions, queryOptions)
      : super.getAll(queryOptions);

    // Convert integers to booleans
    return goals.map(goal => ({
      ...goal,
      active: Boolean(goal.active),
      notificationsEnabled: Boolean(goal.notificationsEnabled),
    }));
  }

  /**
   * Get only active goals
   */
  getActive(): ProductivityGoal[] {
    return this.getAll({ activeOnly: true });
  }

  /**
   * Insert a new goal
   */
  insert(goal: Partial<ProductivityGoal>): number {
    // Convert booleans to integers for SQLite
    const snakeEntity = this.toSnakeCase({
      name: goal.name,
      description: goal.description ?? undefined,
      goalType: goal.goalType,
      category: goal.category ?? undefined,
      appName: goal.appName ?? undefined,
      targetMinutes: goal.targetMinutes,
      operator: goal.operator,
      period: goal.period,
      active: goal.active ? 1 : 0,
      notificationsEnabled: goal.notificationsEnabled ? 1 : 0,
      notifyAtPercentage: goal.notifyAtPercentage,
    } as DatabaseRow);

    const columns = Object.keys(snakeEntity);
    const placeholders = columns.map(() => '?').join(', ');
    const values = Object.values(snakeEntity);

    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders})
    `;

    const stmt = this.db.prepare(query);
    const result = stmt.run(...values);
    return result.lastInsertRowid as number;
  }

  /**
   * Update a goal
   */
  update(id: number, updates: Partial<ProductivityGoal>): boolean {
    const allowedUpdates: Partial<ProductivityGoal> = {};

    if (updates.name !== undefined) allowedUpdates.name = updates.name;
    if (updates.description !== undefined) allowedUpdates.description = updates.description;
    if (updates.goalType !== undefined) allowedUpdates.goalType = updates.goalType;
    if (updates.category !== undefined) allowedUpdates.category = updates.category;
    if (updates.appName !== undefined) allowedUpdates.appName = updates.appName;
    if (updates.targetMinutes !== undefined) allowedUpdates.targetMinutes = updates.targetMinutes;
    if (updates.operator !== undefined) allowedUpdates.operator = updates.operator;
    if (updates.period !== undefined) allowedUpdates.period = updates.period;
    if (updates.active !== undefined) allowedUpdates.active = updates.active;
    if (updates.notificationsEnabled !== undefined) allowedUpdates.notificationsEnabled = updates.notificationsEnabled;
    if (updates.notifyAtPercentage !== undefined) allowedUpdates.notifyAtPercentage = updates.notifyAtPercentage;

    if (Object.keys(allowedUpdates).length === 0) {
      return false;
    }

    // Add updated_at timestamp
    const snakeUpdates = this.toSnakeCase(allowedUpdates as unknown as DatabaseRow);
    const setClause = Object.keys(snakeUpdates)
      .map(column => `${column} = ?`)
      .join(', ');

    const query = `
      UPDATE productivity_goals
      SET ${setClause},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const values = [...Object.values(snakeUpdates), id];
    const stmt = this.db.prepare(query);
    const result = stmt.run(...values);
    return result.changes > 0;
  }

  /**
   * Get goal progress for a specific date
   */
  getProgress(goalId: number, date: string): GoalProgress | null {
    const query = `
      SELECT
        id,
        goal_id AS goalId,
        date,
        progress_minutes AS progressMinutes,
        achieved,
        notified,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM goal_progress
      WHERE goal_id = ? AND date = ?
    `;

    const result = this.executeQuerySingle<DatabaseRow>(query, [goalId, date]);

    if (!result) return null;

    return {
      ...result,
      achieved: Boolean(result.achieved),
      notified: Boolean(result.notified),
    } as GoalProgress;
  }

  /**
   * Update goal progress (upsert with achievement calculation)
   */
  updateProgress(goalId: number, date: string, minutes: number): void {
    // Get goal details to calculate achievement
    const goalStmt = this.db.prepare('SELECT target_minutes, operator FROM productivity_goals WHERE id = ?');
    const goal = goalStmt.get(goalId) as { target_minutes: number; operator: string } | undefined;

    if (!goal) return;

    // Calculate if goal is achieved based on operator
    let achieved = false;
    switch (goal.operator) {
      case 'gte':
        achieved = minutes >= goal.target_minutes;
        break;
      case 'lte':
        achieved = minutes <= goal.target_minutes;
        break;
      case 'eq':
        achieved = minutes === goal.target_minutes;
        break;
    }

    // Upsert progress
    const stmt = this.db.prepare(`
      INSERT INTO goal_progress (goal_id, date, progress_minutes, achieved, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(goal_id, date)
      DO UPDATE SET
        progress_minutes = excluded.progress_minutes,
        achieved = excluded.achieved,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(goalId, date, minutes, achieved ? 1 : 0);
  }

  /**
   * Get today's goals with their progress
   */
  getTodayGoalsWithProgress(): GoalWithProgress[] {
    const todayValue = new Date().toISOString().split('T')[0];
    if (!todayValue) {
      throw new Error('Failed to get today\'s date');
    }
    const today = todayValue;

    const query = `
      SELECT
        g.id,
        g.name,
        g.description,
        g.goal_type AS goalType,
        g.category,
        g.app_name AS appName,
        g.target_minutes AS targetMinutes,
        g.operator,
        g.period,
        g.active,
        g.notifications_enabled AS notificationsEnabled,
        g.notify_at_percentage AS notifyAtPercentage,
        g.created_at AS createdAt,
        g.updated_at AS updatedAt,
        gp.id AS progressId,
        gp.progress_minutes AS progressMinutes,
        gp.achieved,
        gp.notified
      FROM productivity_goals g
      LEFT JOIN goal_progress gp ON g.id = gp.goal_id AND gp.date = ?
      WHERE g.active = 1 AND g.period = 'daily'
      ORDER BY g.created_at DESC
    `;

    const results = this.executeQuery<DatabaseRow>(query, [today]);

    return results.map(row => {
      const progressMinutes = (row.progressMinutes as number) || 0;
      const targetMinutes = (row.targetMinutes as number) || 0;
      const progressPercentage = targetMinutes > 0 ? (progressMinutes / targetMinutes) * 100 : 0;
      const timeRemaining = Math.max(0, targetMinutes - progressMinutes);

      // Calculate status
      let status: GoalStatus;
      if (progressMinutes === 0) {
        status = 'not_started';
      } else if (row.achieved) {
        status = row.operator === 'lte' ? 'achieved' : (progressMinutes > targetMinutes ? 'exceeded' : 'achieved');
      } else {
        status = 'in_progress';
      }

      return {
        id: row.id as number,
        name: row.name as string,
        description: row.description as string | undefined,
        goalType: row.goalType as string,
        category: row.category as string | undefined,
        appName: row.appName as string | undefined,
        targetMinutes: targetMinutes,
        operator: row.operator as string,
        period: row.period as string,
        active: Boolean(row.active),
        notificationsEnabled: Boolean(row.notificationsEnabled),
        notifyAtPercentage: row.notifyAtPercentage as number,
        createdAt: row.createdAt as string,
        updatedAt: row.updatedAt as string,
        todayProgress: row.progressId ? {
          id: row.progressId as number,
          goalId: row.id as number,
          date: today,
          progressMinutes,
          achieved: Boolean(row.achieved),
          notified: Boolean(row.notified)
        } : undefined,
        progressPercentage: Math.min(100, Math.round(progressPercentage)),
        timeRemaining,
        status
      } as GoalWithProgress;
    });
  }

  /**
   * Get achievement history for a goal
   */
  getAchievementHistory(goalId: number, days: number): GoalProgress[] {
    const endDateValue = new Date().toISOString().split('T')[0];
    if (!endDateValue) {
      throw new Error('Failed to get end date');
    }
    const endDate = endDateValue;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateValue = startDate.toISOString().split('T')[0];
    if (!startDateValue) {
      throw new Error('Failed to get start date');
    }
    const startDateStr = startDateValue;

    const query = `
      SELECT
        id,
        goal_id AS goalId,
        date,
        progress_minutes AS progressMinutes,
        achieved,
        notified,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM goal_progress
      WHERE goal_id = ? AND date BETWEEN ? AND ?
      ORDER BY date DESC
    `;

    const results = this.executeQuery<DatabaseRow>(query, [goalId, startDateStr, endDate]);

    return results.map(row => ({
      ...row,
      achieved: Boolean(row.achieved),
      notified: Boolean(row.notified),
    } as GoalProgress));
  }

  /**
   * Get overall goal statistics
   */
  getStats(): GoalStats {
    const todayValue = new Date().toISOString().split('T')[0];
    if (!todayValue) {
      throw new Error('Failed to get today\'s date');
    }
    const today = todayValue;

    // Get total and active goals
    const countQuery = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active
      FROM productivity_goals
    `;
    const counts = this.executeQuerySingle<{ total: number; active: number }>(countQuery);

    if (!counts) {
      return {
        totalGoals: 0,
        activeGoals: 0,
        achievedToday: 0,
        currentStreak: 0,
        longestStreak: 0,
        achievementRate: 0,
      };
    }

    // Get achieved today
    const achievedTodayQuery = `
      SELECT COUNT(*) as achieved
      FROM goal_progress
      WHERE date = ? AND achieved = 1
    `;
    const achievedTodayResult = this.executeQuerySingle<{ achieved: number }>(achievedTodayQuery, [today]);
    const achievedToday = achievedTodayResult?.achieved || 0;

    // Calculate current streak (consecutive days with at least one achieved goal)
    const streakQuery = `
      SELECT date
      FROM goal_progress
      WHERE achieved = 1
      GROUP BY date
      HAVING COUNT(*) > 0
      ORDER BY date DESC
    `;
    const dates = this.executeQuery<{ date: string }>(streakQuery);

    let currentStreak = 0;
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < dates.length; i++) {
      const dateEntry = dates[i];
      if (!dateEntry) {
        break;
      }

      const streakDate = new Date(dateEntry.date);
      streakDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(todayDate);
      expectedDate.setDate(todayDate.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);

      if (streakDate.getTime() === expectedDate.getTime()) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < dates.length; i++) {
      tempStreak = 1;
      for (let j = i; j < dates.length - 1; j++) {
        const currentEntry = dates[j];
        const nextEntry = dates[j + 1];

        if (!currentEntry || !nextEntry) {
          break;
        }

        const currentDate = new Date(currentEntry.date);
        const nextDate = new Date(nextEntry.date);
        const diffTime = currentDate.getTime() - nextDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
        } else {
          break;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    // Calculate achievement rate (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoValue = thirtyDaysAgo.toISOString().split('T')[0];
    if (!thirtyDaysAgoValue) {
      throw new Error('Failed to get thirty days ago date');
    }
    const thirtyDaysAgoStr = thirtyDaysAgoValue;

    const achievementRateQuery = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN achieved = 1 THEN 1 ELSE 0 END) as achieved
      FROM goal_progress
      WHERE date >= ?
    `;
    const achievementData = this.executeQuerySingle<{ total: number; achieved: number }>(
      achievementRateQuery,
      [thirtyDaysAgoStr]
    );
    const achievementRate =
      achievementData && achievementData.total > 0
        ? Math.round((achievementData.achieved / achievementData.total) * 100)
        : 0;

    return {
      totalGoals: counts.total || 0,
      activeGoals: counts.active || 0,
      achievedToday,
      currentStreak,
      longestStreak,
      achievementRate,
    };
  }

  /**
   * Get tags associated with a goal
   */
  getTags(goalId: number): Tag[] {
    const query = `
      SELECT
        t.id,
        t.name,
        t.color,
        t.created_at AS createdAt
      FROM tags t
      JOIN productivity_goal_tags pgt ON t.id = pgt.tag_id
      WHERE pgt.productivity_goal_id = ?
      ORDER BY t.name ASC
    `;

    return this.executeQuery<Tag>(query, [goalId]);
  }

  /**
   * Add tags to a goal (additive)
   */
  addTags(goalId: number, tagIds: number[]): void {
    if (tagIds.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO productivity_goal_tags (productivity_goal_id, tag_id)
      VALUES (?, ?)
    `);

    for (const tagId of tagIds) {
      stmt.run(goalId, tagId);
    }
  }

  /**
   * Set tags for a goal (replace all existing tags)
   */
  setTags(goalId: number, tagIds: number[]): void {
    this.transaction(() => {
      // Delete existing tags
      const deleteStmt = this.db.prepare(`
        DELETE FROM productivity_goal_tags
        WHERE productivity_goal_id = ?
      `);
      deleteStmt.run(goalId);

      // Insert new tags if any
      if (tagIds.length > 0) {
        const insertStmt = this.db.prepare(`
          INSERT OR IGNORE INTO productivity_goal_tags (productivity_goal_id, tag_id)
          VALUES (?, ?)
        `);

        for (const tagId of tagIds) {
          insertStmt.run(goalId, tagId);
        }
      }
    });
  }

  /**
   * Get goals with their tags populated
   */
  getAllWithTags(options?: QueryOptions & { activeOnly?: boolean }): (ProductivityGoal & { tags: Tag[] })[] {
    const goals = this.getAll(options);
    return goals.map(goal => ({
      ...goal,
      tags: goal.id ? this.getTags(goal.id) : [],
    }));
  }
}
