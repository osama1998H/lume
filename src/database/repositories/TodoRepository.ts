import Database from 'better-sqlite3';
import { BaseRepository } from '../base/BaseRepository';
import { QueryOptions, WhereClause } from '../base/RepositoryTypes';
import { Todo, TodoStatus, TodoPriority, TodoWithCategory, TodoStats, Tag } from '../../types';
import { DatabaseRow } from '../../types/database';

/**
 * Repository for todos table
 * Handles all todo CRUD operations, statistics, and tag/category relationships
 */
export class TodoRepository extends BaseRepository<Todo> {
  constructor(db: Database.Database) {
    super(db, 'todos', {
      categoryId: 'category_id',
      dueDate: 'due_date',
      dueTime: 'due_time',
      completedAt: 'completed_at',
      estimatedMinutes: 'estimated_minutes',
      actualMinutes: 'actual_minutes',
      timeEntryId: 'time_entry_id',
      pomodoroCount: 'pomodoro_count',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    });
  }

  /**
   * Get all todos with optional filters
   */
  getAll(options?: QueryOptions & { status?: TodoStatus; priority?: TodoPriority }): Todo[] {
    const conditions: WhereClause[] = [];

    if (options?.status) {
      conditions.push({ field: 'status', operator: '=', value: options.status });
    }

    if (options?.priority) {
      conditions.push({ field: 'priority', operator: '=', value: options.priority });
    }

    const queryOptions: QueryOptions = {
      orderBy: 'created_at',
      orderDirection: 'DESC',
      ...options,
    };

    return conditions.length > 0
      ? this.findWhere(conditions, queryOptions)
      : super.getAll(queryOptions);
  }

  /**
   * Get a single todo by ID
   */
  getById(id: number): Todo | null {
    return super.getById(id);
  }

  /**
   * Insert a new todo
   */
  insert(todo: Partial<Todo>): number {
    const snakeEntity = this.toSnakeCase({
      title: todo.title,
      description: todo.description ?? undefined,
      status: todo.status ?? 'todo',
      priority: todo.priority ?? 'medium',
      categoryId: todo.categoryId ?? undefined,
      dueDate: todo.dueDate ?? undefined,
      dueTime: todo.dueTime ?? undefined,
      completedAt: todo.completedAt ?? undefined,
      estimatedMinutes: todo.estimatedMinutes ?? undefined,
      actualMinutes: todo.actualMinutes ?? undefined,
      timeEntryId: todo.timeEntryId ?? undefined,
      pomodoroCount: todo.pomodoroCount ?? 0,
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
   * Update a todo
   */
  update(id: number, updates: Partial<Todo>): boolean {
    const allowedUpdates: Partial<Todo> = {};

    if (updates.title !== undefined) allowedUpdates.title = updates.title;
    if (updates.description !== undefined) allowedUpdates.description = updates.description;
    if (updates.status !== undefined) allowedUpdates.status = updates.status;
    if (updates.priority !== undefined) allowedUpdates.priority = updates.priority;
    if (updates.categoryId !== undefined) allowedUpdates.categoryId = updates.categoryId;
    if (updates.dueDate !== undefined) allowedUpdates.dueDate = updates.dueDate;
    if (updates.dueTime !== undefined) allowedUpdates.dueTime = updates.dueTime;
    if (updates.completedAt !== undefined) allowedUpdates.completedAt = updates.completedAt;
    if (updates.estimatedMinutes !== undefined) allowedUpdates.estimatedMinutes = updates.estimatedMinutes;
    if (updates.actualMinutes !== undefined) allowedUpdates.actualMinutes = updates.actualMinutes;
    if (updates.timeEntryId !== undefined) allowedUpdates.timeEntryId = updates.timeEntryId;
    if (updates.pomodoroCount !== undefined) allowedUpdates.pomodoroCount = updates.pomodoroCount;

    if (Object.keys(allowedUpdates).length === 0) {
      return false;
    }

    // Auto-set completedAt when status changes to completed
    if (updates.status === 'completed' && !updates.completedAt) {
      allowedUpdates.completedAt = new Date().toISOString();
    }

    const snakeUpdates = this.toSnakeCase(allowedUpdates as unknown as DatabaseRow);
    const setClause = Object.keys(snakeUpdates)
      .map(column => `${column} = ?`)
      .join(', ');

    const query = `
      UPDATE ${this.tableName}
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
   * Get todos with category information
   */
  getAllWithCategory(): TodoWithCategory[] {
    const query = `
      SELECT
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.category_id AS categoryId,
        t.due_date AS dueDate,
        t.due_time AS dueTime,
        t.completed_at AS completedAt,
        t.estimated_minutes AS estimatedMinutes,
        t.actual_minutes AS actualMinutes,
        t.time_entry_id AS timeEntryId,
        t.pomodoro_count AS pomodoroCount,
        t.created_at AS createdAt,
        t.updated_at AS updatedAt,
        c.id AS categoryIdFull,
        c.name AS categoryName,
        c.color AS categoryColor,
        c.icon AS categoryIcon,
        c.description AS categoryDescription
      FROM ${this.tableName} t
      LEFT JOIN categories c ON t.category_id = c.id
      ORDER BY t.created_at DESC
    `;

    const results = this.executeQuery<DatabaseRow>(query);

    return results.map(row => {
      const todo: TodoWithCategory = {
        id: row.id as number,
        title: row.title as string,
        description: row.description as string | undefined,
        status: row.status as TodoStatus,
        priority: row.priority as TodoPriority,
        categoryId: row.categoryId as number | undefined,
        dueDate: row.dueDate as string | undefined,
        dueTime: row.dueTime as string | undefined,
        completedAt: row.completedAt as string | undefined,
        estimatedMinutes: row.estimatedMinutes as number | undefined,
        actualMinutes: row.actualMinutes as number | undefined,
        timeEntryId: row.timeEntryId as number | undefined,
        pomodoroCount: row.pomodoroCount as number | undefined,
        createdAt: row.createdAt as string,
        updatedAt: row.updatedAt as string,
      };

      if (row.categoryIdFull) {
        todo.category = {
          id: row.categoryIdFull as number,
          name: row.categoryName as string,
          color: row.categoryColor as string,
          icon: row.categoryIcon as string | undefined,
          description: row.categoryDescription as string | undefined,
        };
      }

      return todo;
    });
  }

  /**
   * Get overall todo statistics
   */
  getStats(): TodoStats {
    // Get counts by status
    const countQuery = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as inProgress
      FROM ${this.tableName}
    `;
    const counts = this.executeQuerySingle<{ total: number; completed: number; inProgress: number }>(countQuery);

    if (!counts) {
      return {
        totalTodos: 0,
        completedTodos: 0,
        inProgressTodos: 0,
        overdueTodos: 0,
        completionRate: 0,
        avgCompletionTime: 0,
      };
    }

    // Get overdue count (todos with due_date before today and status not completed)
    const today = new Date().toISOString().split('T')[0];
    const overdueQuery = `
      SELECT COUNT(*) as overdue
      FROM ${this.tableName}
      WHERE due_date < ? AND status != 'completed' AND status != 'cancelled'
    `;
    const overdueResult = this.executeQuerySingle<{ overdue: number }>(overdueQuery, [today]);
    const overdueTodos = overdueResult?.overdue || 0;

    // Calculate completion rate
    const completionRate = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;

    // Calculate average completion time (from creation to completion)
    const avgTimeQuery = `
      SELECT AVG(
        (julianday(completed_at) - julianday(created_at)) * 24 * 60
      ) as avgMinutes
      FROM ${this.tableName}
      WHERE status = 'completed' AND completed_at IS NOT NULL
    `;
    const avgTimeResult = this.executeQuerySingle<{ avgMinutes: number | null }>(avgTimeQuery);
    const avgCompletionTime = Math.round(avgTimeResult?.avgMinutes || 0);

    return {
      totalTodos: counts.total || 0,
      completedTodos: counts.completed || 0,
      inProgressTodos: counts.inProgress || 0,
      overdueTodos,
      completionRate,
      avgCompletionTime,
    };
  }

  /**
   * Get overdue todos
   */
  getOverdue(): Todo[] {
    const today = new Date().toISOString().split('T')[0];

    const query = `
      SELECT
        id,
        title,
        description,
        status,
        priority,
        category_id AS categoryId,
        due_date AS dueDate,
        due_time AS dueTime,
        completed_at AS completedAt,
        estimated_minutes AS estimatedMinutes,
        actual_minutes AS actualMinutes,
        time_entry_id AS timeEntryId,
        pomodoro_count AS pomodoroCount,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM ${this.tableName}
      WHERE due_date < ? AND status != 'completed' AND status != 'cancelled'
      ORDER BY due_date ASC, due_time ASC
    `;

    return this.executeQuery<Todo>(query, [today]);
  }

  /**
   * Link a todo to a time entry
   * Updates both todos.time_entry_id and time_entries.todo_id for bidirectional consistency
   * Clears any existing stale links before establishing the new association
   */
  linkTimeEntry(todoId: number, timeEntryId: number): boolean {
    // Prepare statements to clear existing links
    const clearTodoStmt = this.db.prepare(`
      UPDATE ${this.tableName}
      SET time_entry_id = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE time_entry_id = ?
    `);
    const clearTimeEntryStmt = this.db.prepare(`
      UPDATE time_entries
      SET todo_id = NULL
      WHERE todo_id = ?
    `);

    // Prepare statements to establish new links
    const updateTodoStmt = this.db.prepare(`
      UPDATE ${this.tableName}
      SET time_entry_id = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    const updateTimeEntryStmt = this.db.prepare(`
      UPDATE time_entries
      SET todo_id = ?
      WHERE id = ?
    `);

    return this.transaction(() => {
      // Clear any existing links to prevent stale references
      clearTodoStmt.run(timeEntryId);
      clearTimeEntryStmt.run(todoId);

      // Establish new bidirectional link
      const todoRes = updateTodoStmt.run(timeEntryId, todoId);
      const timeRes = updateTimeEntryStmt.run(todoId, timeEntryId);
      return (todoRes?.changes || 0) > 0 && (timeRes?.changes || 0) > 0;
    });
  }

  /**
   * Increment pomodoro count for a todo
   */
  incrementPomodoroCount(todoId: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE ${this.tableName}
      SET pomodoro_count = pomodoro_count + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const result = stmt.run(todoId);
    return result.changes > 0;
  }

  /**
   * Get tags associated with a todo
   */
  getTags(todoId: number): Tag[] {
    const query = `
      SELECT
        t.id,
        t.name,
        t.color,
        t.created_at AS createdAt
      FROM tags t
      JOIN todo_tags tt ON t.id = tt.tag_id
      WHERE tt.todo_id = ?
      ORDER BY t.name ASC
    `;

    return this.executeQuery<Tag>(query, [todoId]);
  }

  /**
   * Add tags to a todo (additive)
   */
  addTags(todoId: number, tagIds: number[]): void {
    if (tagIds.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO todo_tags (todo_id, tag_id)
      VALUES (?, ?)
    `);

    for (const tagId of tagIds) {
      stmt.run(todoId, tagId);
    }
  }

  /**
   * Set tags for a todo (replace all existing tags)
   */
  setTags(todoId: number, tagIds: number[]): void {
    this.transaction(() => {
      // Delete existing tags
      const deleteStmt = this.db.prepare(`
        DELETE FROM todo_tags
        WHERE todo_id = ?
      `);
      deleteStmt.run(todoId);

      // Insert new tags if any
      if (tagIds.length > 0) {
        const insertStmt = this.db.prepare(`
          INSERT OR IGNORE INTO todo_tags (todo_id, tag_id)
          VALUES (?, ?)
        `);

        for (const tagId of tagIds) {
          insertStmt.run(todoId, tagId);
        }
      }
    });
  }

  /**
   * Get todos with their tags populated
   */
  getAllWithTags(options?: QueryOptions & { status?: TodoStatus; priority?: TodoPriority }): (Todo & { tags: Tag[] })[] {
    const todos = this.getAll(options);
    return todos.map(todo => ({
      ...todo,
      tags: todo.id ? this.getTags(todo.id) : [],
    }));
  }
}
