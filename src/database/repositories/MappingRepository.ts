import Database from 'better-sqlite3';
import { AppCategoryMapping, DomainCategoryMapping } from '../../types';

/**
 * Repository for app_category_mappings and domain_category_mappings tables
 * Handles automatic category assignment based on app names and domains
 */
export class MappingRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  // ==================== APP CATEGORY MAPPINGS ====================

  /**
   * Add a new app category mapping
   */
  addAppMapping(appName: string, categoryId: number): number {
    const stmt = this.db.prepare(`
      INSERT INTO app_category_mappings (app_name, category_id)
      VALUES (?, ?)
    `);

    const result = stmt.run(appName, categoryId);
    return result.lastInsertRowid as number;
  }

  /**
   * Delete an app category mapping
   */
  deleteAppMapping(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM app_category_mappings WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Get all app category mappings with category details
   */
  getAppMappings(): AppCategoryMapping[] {
    const stmt = this.db.prepare(`
      SELECT
        acm.id,
        acm.app_name AS appName,
        acm.category_id AS categoryId,
        c.name AS categoryName,
        c.color AS categoryColor,
        acm.created_at AS createdAt
      FROM app_category_mappings acm
      JOIN categories c ON acm.category_id = c.id
      ORDER BY acm.app_name ASC
    `);

    return stmt.all() as AppCategoryMapping[];
  }

  /**
   * Get category ID for a specific app name
   */
  getCategoryIdForApp(appName: string): number | null {
    const stmt = this.db.prepare(`
      SELECT category_id
      FROM app_category_mappings
      WHERE app_name = ?
    `);

    const result = stmt.get(appName) as { category_id: number } | undefined;
    return result ? result.category_id : null;
  }

  /**
   * Check if an app mapping exists
   */
  appMappingExists(appName: string): boolean {
    const stmt = this.db.prepare(`
      SELECT 1
      FROM app_category_mappings
      WHERE app_name = ?
      LIMIT 1
    `);

    return stmt.get(appName) !== undefined;
  }

  /**
   * Update an app mapping's category
   */
  updateAppMapping(id: number, categoryId: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE app_category_mappings
      SET category_id = ?
      WHERE id = ?
    `);

    const result = stmt.run(categoryId, id);
    return result.changes > 0;
  }

  // ==================== DOMAIN CATEGORY MAPPINGS ====================

  /**
   * Add a new domain category mapping
   */
  addDomainMapping(domain: string, categoryId: number): number {
    const stmt = this.db.prepare(`
      INSERT INTO domain_category_mappings (domain, category_id)
      VALUES (?, ?)
    `);

    const result = stmt.run(domain, categoryId);
    return result.lastInsertRowid as number;
  }

  /**
   * Delete a domain category mapping
   */
  deleteDomainMapping(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM domain_category_mappings WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Get all domain category mappings with category details
   */
  getDomainMappings(): DomainCategoryMapping[] {
    const stmt = this.db.prepare(`
      SELECT
        dcm.id,
        dcm.domain,
        dcm.category_id AS categoryId,
        c.name AS categoryName,
        c.color AS categoryColor,
        dcm.created_at AS createdAt
      FROM domain_category_mappings dcm
      JOIN categories c ON dcm.category_id = c.id
      ORDER BY dcm.domain ASC
    `);

    return stmt.all() as DomainCategoryMapping[];
  }

  /**
   * Get category ID for a specific domain
   */
  getCategoryIdForDomain(domain: string): number | null {
    const stmt = this.db.prepare(`
      SELECT category_id
      FROM domain_category_mappings
      WHERE domain = ?
    `);

    const result = stmt.get(domain) as { category_id: number } | undefined;
    return result ? result.category_id : null;
  }

  /**
   * Check if a domain mapping exists
   */
  domainMappingExists(domain: string): boolean {
    const stmt = this.db.prepare(`
      SELECT 1
      FROM domain_category_mappings
      WHERE domain = ?
      LIMIT 1
    `);

    return stmt.get(domain) !== undefined;
  }

  /**
   * Update a domain mapping's category
   */
  updateDomainMapping(id: number, categoryId: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE domain_category_mappings
      SET category_id = ?
      WHERE id = ?
    `);

    const result = stmt.run(categoryId, id);
    return result.changes > 0;
  }

  /**
   * Delete all mappings for a category
   * Used when deleting a category to clean up orphaned mappings
   */
  deleteMappingsForCategory(categoryId: number): void {
    const deleteAppStmt = this.db.prepare('DELETE FROM app_category_mappings WHERE category_id = ?');
    const deleteDomainStmt = this.db.prepare('DELETE FROM domain_category_mappings WHERE category_id = ?');

    deleteAppStmt.run(categoryId);
    deleteDomainStmt.run(categoryId);
  }
}
