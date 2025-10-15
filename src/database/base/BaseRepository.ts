import Database from 'better-sqlite3';
import {
  BaseEntity,
  IRepository,
  QueryOptions,
  WhereClause,
  ColumnMapping,
  TransactionFn,
} from './RepositoryTypes';
import { DatabaseRow, QueryParameters, QueryParameter } from '../../types/database';

/**
 * Base repository class providing generic CRUD operations
 * All entity-specific repositories should extend this class
 */
export abstract class BaseRepository<T extends BaseEntity> implements IRepository<T> {
  protected db: Database.Database;
  protected tableName: string;
  protected columnMapping: ColumnMapping;

  constructor(db: Database.Database, tableName: string, columnMapping: ColumnMapping = {}) {
    this.db = db;
    this.tableName = tableName;
    this.columnMapping = columnMapping;
  }

  /**
   * Execute a transaction
   */
  protected transaction<R>(fn: TransactionFn<R>): R {
    const transaction = this.db.transaction(fn);
    return transaction(this.db);
  }

  /**
   * Convert camelCase keys to snake_case for database
   * Skips undefined values to prevent SQLite binding errors
   */
  protected toSnakeCase(obj: DatabaseRow): DatabaseRow {
    const result: DatabaseRow = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) continue;
      const snakeKey = this.columnMapping[key] || this.camelToSnake(key);
      result[snakeKey] = value;
    }
    return result;
  }

  /**
   * Convert snake_case keys to camelCase for application
   */
  protected toCamelCase(obj: DatabaseRow): DatabaseRow {
    const result: DatabaseRow = {};
    const reverseMapping: Record<string, string> = {};

    // Build reverse mapping
    for (const [camel, snake] of Object.entries(this.columnMapping)) {
      reverseMapping[snake] = camel;
    }

    for (const [key, value] of Object.entries(obj)) {
      const camelKey = reverseMapping[key] || this.snakeToCamel(key);
      result[camelKey] = value;
    }
    return result;
  }

  /**
   * Convert camelCase to snake_case
   */
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Convert snake_case to camelCase
   */
  private snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Build WHERE clause from conditions
   */
  protected buildWhereClause(conditions: WhereClause[]): { clause: string; values: QueryParameters } {
    if (conditions.length === 0) {
      return { clause: '', values: [] };
    }

    const parts: string[] = [];
    const values: QueryParameters = [];

    for (const condition of conditions) {
      if (condition.operator === 'IS NULL' || condition.operator === 'IS NOT NULL') {
        parts.push(`${condition.field} ${condition.operator}`);
      } else if (condition.operator === 'IN') {
        const valueArray = Array.isArray(condition.value) ? (condition.value as QueryParameter[]) : [];
        if (valueArray.length === 0) {
          // Empty IN array produces invalid SQL - use always-false condition
          parts.push('1 = 0');
        } else {
          const placeholders = valueArray.map(() => '?').join(', ');
          parts.push(`${condition.field} IN (${placeholders})`);
          values.push(...valueArray);
        }
      } else {
        parts.push(`${condition.field} ${condition.operator} ?`);
        values.push(condition.value as QueryParameter);
      }
    }

    return {
      clause: 'WHERE ' + parts.join(' AND '),
      values,
    };
  }

  /**
   * Get all entities
   */
  getAll(options?: QueryOptions): T[] {
    let query = `SELECT * FROM ${this.tableName}`;

    if (options?.orderBy) {
      query += ` ORDER BY ${options.orderBy} ${options.orderDirection || 'ASC'}`;
    }

    if (options?.limit) {
      query += ` LIMIT ${options.limit}`;
      if (options?.offset) {
        query += ` OFFSET ${options.offset}`;
      }
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all() as DatabaseRow[];
    return rows.map(row => this.toCamelCase(row) as unknown as T);
  }

  /**
   * Get entity by ID
   */
  getById(id: number): T | null {
    const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`);
    const row = stmt.get(id) as DatabaseRow | undefined;
    return row ? (this.toCamelCase(row) as unknown as T) : null;
  }

  /**
   * Insert a new entity
   */
  insert(entity: Partial<T>): number {
    const snakeEntity = this.toSnakeCase(entity as unknown as DatabaseRow);
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
   * Update an existing entity
   */
  update(id: number, updates: Partial<T>): boolean {
    const snakeUpdates = this.toSnakeCase(updates as unknown as DatabaseRow);
    const columns = Object.keys(snakeUpdates);
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = [...Object.values(snakeUpdates), id];

    const query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    const stmt = this.db.prepare(query);
    const result = stmt.run(...values);
    return result.changes > 0;
  }

  /**
   * Delete an entity
   */
  delete(id: number): boolean {
    const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Count all entities
   */
  count(): number {
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${this.tableName}`);
    const result = stmt.get() as { count: number };
    return result.count;
  }

  /**
   * Check if an entity exists
   */
  exists(id: number): boolean {
    const stmt = this.db.prepare(`SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`);
    return stmt.get(id) !== undefined;
  }

  /**
   * Find entities by custom WHERE conditions
   */
  protected findWhere(conditions: WhereClause[], options?: QueryOptions): T[] {
    const { clause, values } = this.buildWhereClause(conditions);
    let query = `SELECT * FROM ${this.tableName} ${clause}`;

    if (options?.orderBy) {
      query += ` ORDER BY ${options.orderBy} ${options.orderDirection || 'ASC'}`;
    }

    if (options?.limit) {
      query += ` LIMIT ${options.limit}`;
      if (options?.offset) {
        query += ` OFFSET ${options.offset}`;
      }
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...values) as DatabaseRow[];
    return rows.map(row => this.toCamelCase(row) as unknown as T);
  }

  /**
   * Find a single entity by custom WHERE conditions
   */
  protected findOneWhere(conditions: WhereClause[]): T | null {
    const { clause, values } = this.buildWhereClause(conditions);
    const query = `SELECT * FROM ${this.tableName} ${clause} LIMIT 1`;
    const stmt = this.db.prepare(query);
    const row = stmt.get(...values) as DatabaseRow | undefined;
    return row ? (this.toCamelCase(row) as unknown as T) : null;
  }

  /**
   * Execute custom query and return results
   */
  protected executeQuery<R>(query: string, params: QueryParameters = []): R[] {
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as DatabaseRow[];
    return rows.map(row => this.toCamelCase(row)) as R[];
  }

  /**
   * Execute custom query and return a single result
   */
  protected executeQuerySingle<R>(query: string, params: QueryParameters = []): R | null {
    const stmt = this.db.prepare(query);
    const row = stmt.get(...params) as DatabaseRow | undefined;
    return row ? (this.toCamelCase(row) as R) : null;
  }
}
