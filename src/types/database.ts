/**
 * Database Type Infrastructure
 *
 * Core types for database operations, query results, and type-safe database access.
 * This file provides the foundational types for strongly-typed database interactions.
 */

/**
 * Base interface for database row representations
 * All database rows should conform to this structure
 */
export interface DatabaseRow {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Generic query result wrapper
 * Provides type safety for database query results
 */
export type QueryResult<T extends DatabaseRow> = T[];

/**
 * Single query result
 * For queries expected to return a single row
 */
export type SingleQueryResult<T extends DatabaseRow> = T | null;

/**
 * Database operation result
 * Used for INSERT, UPDATE, DELETE operations
 */
export interface DatabaseOperationResult {
  changes: number;
  lastInsertRowid?: number;
}

/**
 * Type-safe parameter binding for SQL queries
 * Prevents SQL injection by enforcing parameterized queries
 */
export type QueryParameter = string | number | boolean | null;
export type QueryParameters = QueryParameter[];

/**
 * Type guard to check if a value is a valid QueryParameter
 */
export function isQueryParameter(value: unknown): value is QueryParameter {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

/**
 * Column mapping type for converting between camelCase and snake_case
 */
export type ColumnMapping = Record<string, string>;

/**
 * Type-safe record converter
 * Ensures proper type conversion between database and application layers
 */
export interface RecordConverter<TApp, TDb extends DatabaseRow> {
  toDatabase(appRecord: TApp): TDb;
  fromDatabase(dbRecord: TDb): TApp;
}

/**
 * Transaction function type
 * Ensures type safety within database transactions
 */
export type TransactionFn<T> = (db: unknown) => T;

/**
 * Query builder helper types
 */
export type OrderDirection = 'ASC' | 'DESC';
export type ComparisonOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'IS NULL' | 'IS NOT NULL';

export interface WhereCondition {
  field: string;
  operator: ComparisonOperator;
  value?: QueryParameter | QueryParameter[];
}

export interface QueryOptions {
  orderBy?: string;
  orderDirection?: OrderDirection;
  limit?: number;
  offset?: number;
}

/**
 * Type-safe WHERE clause builder result
 */
export interface WhereClauseResult {
  clause: string;
  values: QueryParameters;
}
