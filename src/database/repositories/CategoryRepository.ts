import Database from 'better-sqlite3';
import { BaseRepository } from '../base/BaseRepository';
import { QueryOptions } from '../base/RepositoryTypes';
import { Category } from '../../types';

/**
 * Repository for categories table
 * Handles all category CRUD operations
 */
export class CategoryRepository extends BaseRepository<Category> {
  constructor(db: Database.Database) {
    super(db, 'categories', {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    });
  }

  /**
   * Get all categories ordered by name
   */
  getAll(options?: QueryOptions): Category[] {
    const queryOptions: QueryOptions = {
      orderBy: 'name',
      orderDirection: 'ASC',
      ...options,
    };
    return super.getAll(queryOptions);
  }

  /**
   * Insert a new category
   */
  insert(category: Partial<Category>): number {
    const categoryToInsert = {
      name: category.name,
      color: category.color || '#3B82F6',
      icon: category.icon ?? undefined,
      description: category.description ?? undefined,
    };
    return super.insert(categoryToInsert);
  }

  /**
   * Update a category
   */
  update(id: number, updates: Partial<Category>): boolean {
    const allowedUpdates: any = {};

    if (updates.name !== undefined) allowedUpdates.name = updates.name;
    if (updates.color !== undefined) allowedUpdates.color = updates.color;
    if (updates.icon !== undefined) allowedUpdates.icon = updates.icon;
    if (updates.description !== undefined) allowedUpdates.description = updates.description;

    if (Object.keys(allowedUpdates).length === 0) {
      return false;
    }

    // Add updated_at timestamp
    const snakeUpdates = this.toSnakeCase(allowedUpdates);
    const setClause = Object.keys(snakeUpdates)
      .map(column => `${column} = ?`)
      .join(', ');

    const query = `
      UPDATE categories
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
   * Delete a category
   * Note: This also clears foreign key references
   */
  delete(id: number): boolean {
    return this.transaction(() => {
      // Clear foreign key references before deletion to avoid constraint violations
      this.db.prepare('UPDATE time_entries SET category_id = NULL WHERE category_id = ?').run(id);
      this.db.prepare('UPDATE app_usage SET category_id = NULL WHERE category_id = ?').run(id);
      this.db.prepare('DELETE FROM app_category_mappings WHERE category_id = ?').run(id);
      this.db.prepare('DELETE FROM domain_category_mappings WHERE category_id = ?').run(id);

      // Now safe to delete the category
      const stmt = this.db.prepare('DELETE FROM categories WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    });
  }

  /**
   * Get category by name
   */
  getByName(name: string): Category | null {
    const conditions = [
      { field: 'name', operator: '=' as const, value: name }
    ];

    return this.findOneWhere(conditions);
  }

  /**
   * Check if a category name already exists (for validation)
   */
  nameExists(name: string, excludeId?: number): boolean {
    let query = 'SELECT 1 FROM categories WHERE name = ?';
    const params: any[] = [name];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    query += ' LIMIT 1';

    const stmt = this.db.prepare(query);
    return stmt.get(...params) !== undefined;
  }
}
