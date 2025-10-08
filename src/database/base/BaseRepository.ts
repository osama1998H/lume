import Database from 'better-sqlite3';
import {
  BaseEntity,
  IRepository,
  QueryOptions,
  WhereClause,
  ColumnMapping,
  TransactionFn,
} from './RepositoryTypes';

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
  protected toSnakeCase(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
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
  protected toCamelCase(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
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
  protected buildWhereClause(conditions: WhereClause[]): { clause: string; values: any[] } {
    if (conditions.length === 0) {
      return { clause: '', values: [] };
    }

    const parts: string[] = [];
    const values: any[] = [];

    for (const condition of conditions) {
      if (condition.operator === 'IS NULL' || condition.operator === 'IS NOT NULL') {
        parts.push(`${condition.field} ${condition.operator}`);
      } else if (condition.operator === 'IN') {
        const placeholders = condition.value.map(() => '?').join(', ');
        parts.push(`${condition.field} IN (${placeholders})`);
        values.push(...condition.value);
      } else {
        parts.push(`${condition.field} ${condition.operator} ?`);
        values.push(condition.value);
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
    const rows = stmt.all() as any[];
    return rows.map(row => this.toCamelCase(row) as T);
  }

  /**
   * Get entity by ID
   */
  getById(id: number): T | null {
    const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`);
    const row = stmt.get(id) as any;
    return row ? (this.toCamelCase(row) as T) : null;
  }

  /**
   * Insert a new entity
   */
  insert(entity: Partial<T>): number {
    const snakeEntity = this.toSnakeCase(entity as Record<string, any>);
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
    const snakeUpdates = this.toSnakeCase(updates as Record<string, any>);
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
    const rows = stmt.all(...values) as any[];
    return rows.map(row => this.toCamelCase(row) as T);
  }

  /**
   * Find a single entity by custom WHERE conditions
   */
  protected findOneWhere(conditions: WhereClause[]): T | null {
    const { clause, values } = this.buildWhereClause(conditions);
    const query = `SELECT * FROM ${this.tableName} ${clause} LIMIT 1`;
    const stmt = this.db.prepare(query);
    const row = stmt.get(...values) as any;
    return row ? (this.toCamelCase(row) as T) : null;
  }

  /**
   * Execute custom query and return results
   */
  protected executeQuery<R>(query: string, params: any[] = []): R[] {
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    return rows.map(row => this.toCamelCase(row)) as R[];
  }

  /**
   * Execute custom query and return a single result
   */
  protected executeQuerySingle<R>(query: string, params: any[] = []): R | null {
    const stmt = this.db.prepare(query);
    const row = stmt.get(...params) as any;
    return row ? (this.toCamelCase(row) as R) : null;
  }
}
