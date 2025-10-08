import Database from 'better-sqlite3';

/**
 * Base entity interface - all entities should have an optional id
 */
export interface BaseEntity {
  id?: number;
  createdAt?: string;
}

/**
 * Generic query builder options
 */
export interface QueryOptions {
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

/**
 * Where clause builder
 */
export interface WhereClause {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'IS NULL' | 'IS NOT NULL';
  value?: any;
}

/**
 * Repository interface that all repositories should implement
 */
export interface IRepository<T extends BaseEntity> {
  /**
   * Get all entities
   */
  getAll(options?: QueryOptions): T[];

  /**
   * Get entity by ID
   */
  getById(id: number): T | null;

  /**
   * Insert a new entity
   * @returns The ID of the newly created entity
   */
  insert(entity: Partial<T>): number;

  /**
   * Update an existing entity
   * @returns True if the entity was updated, false otherwise
   */
  update(id: number, updates: Partial<T>): boolean;

  /**
   * Delete an entity
   * @returns True if the entity was deleted, false otherwise
   */
  delete(id: number): boolean;

  /**
   * Count all entities
   */
  count(): number;

  /**
   * Check if an entity exists
   */
  exists(id: number): boolean;
}

/**
 * Column mapping for snake_case to camelCase conversion
 */
export interface ColumnMapping {
  [key: string]: string;
}

/**
 * Transaction function type
 */
export type TransactionFn<R> = (db: Database.Database) => R;
