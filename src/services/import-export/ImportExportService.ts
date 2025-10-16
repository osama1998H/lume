import type Database from 'better-sqlite3';
import type { DatabaseManager } from '@/database/DatabaseManager';
import { logger } from '@/services/logging/Logger';
import type {
  ExportData,
  ImportOptions,
  ImportResult,
  TimeEntry,
  AppUsage,
  PomodoroSession,
  ProductivityGoal,
  GoalProgress,
  Category,
  Tag,
  AppCategoryMapping,
  DomainCategoryMapping,
} from '@/types';

/**
 * ImportExportService - Handles database import and export operations
 * Extracts all import/export logic from DatabaseManager for better separation of concerns
 */
export class ImportExportService {
  private db: Database.Database;
  private dbManager: DatabaseManager;

  constructor(db: Database.Database, dbManager: DatabaseManager) {
    this.db = db;
    this.dbManager = dbManager;
  }

  /**
   * Export all data from the database
   * @returns ExportData object containing all tables and metadata
   */
  exportAllData(): ExportData {
    try {
      const exportData: ExportData = {
        version: '2.5.4', // App version from package.json
        schemaVersion: 1, // Current schema version
        exportDate: new Date().toISOString(),
        tables: {
          timeEntries: this.dbManager.getTimeEntries(),
          appUsage: this.dbManager.getAppUsage(),
          categories: this.dbManager.getCategories(),
          tags: this.dbManager.getTags(),
          pomodoroSessions: this.dbManager.getPomodoroSessions(),
          productivityGoals: this.dbManager.getGoals(false), // Get all goals, not just active
          goalProgress: this.getAllGoalProgress(),
          appCategoryMappings: this.dbManager.getAppCategoryMappings(),
          domainCategoryMappings: this.dbManager.getDomainCategoryMappings(),
          timeEntryTags: this.getTimeEntryTagsRelations(),
          appUsageTags: this.getAppUsageTagsRelations(),
          pomodoroSessionTags: this.getPomodoroSessionTagsRelations(),
          productivityGoalTags: this.getProductivityGoalTagsRelations(),
        },
      };

      return exportData;
    } catch (error) {
      logger.error('Failed to export database', {
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Import data into the database
   * @param data - ExportData object to import
   * @param options - Import options (strategy, validateOnly)
   * @returns ImportResult with statistics and errors
   */
  importAllData(data: ExportData, options: ImportOptions = { strategy: 'merge' }): ImportResult {
    const result: ImportResult = {
      success: false,
      recordsImported: 0,
      recordsSkipped: 0,
      recordsUpdated: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Validate data structure
      if (!this.validateExportData(data)) {
        result.errors.push('Invalid export data structure');
        return result;
      }

      // Check version compatibility
      if (data.schemaVersion > 1) {
        result.errors.push(`Incompatible schema version: ${data.schemaVersion}. Current version: 1`);
        return result;
      }

      if (data.schemaVersion < 1) {
        result.warnings.push(`Importing from older schema version: ${data.schemaVersion}`);
      }

      // If validateOnly mode, return here
      if (options.validateOnly) {
        result.success = true;
        return result;
      }

      // Use a transaction to ensure atomicity
      const importTransaction = this.db.transaction(() => {
        // If replace strategy, clear all data first (skip compaction to avoid VACUUM in transaction)
        if (options.strategy === 'replace') {
          if (!this.dbManager.clearAllData({ compact: false })) {
            throw new Error('Failed to clear existing data');
          }
        }

        // Import categories first (they're referenced by other tables)
        result.recordsImported += this.importCategories(data.tables.categories, options.strategy);

        // Import tags
        result.recordsImported += this.importTags(data.tables.tags, options.strategy);

        // Import mappings
        result.recordsImported += this.importAppCategoryMappings(data.tables.appCategoryMappings, options.strategy);
        result.recordsImported += this.importDomainCategoryMappings(data.tables.domainCategoryMappings, options.strategy);

        // Import time entries
        result.recordsImported += this.importTimeEntries(data.tables.timeEntries, options.strategy);

        // Import app usage
        result.recordsImported += this.importAppUsage(data.tables.appUsage, options.strategy);

        // Import pomodoro sessions
        result.recordsImported += this.importPomodoroSessions(data.tables.pomodoroSessions, options.strategy);

        // Import productivity goals
        result.recordsImported += this.importProductivityGoals(data.tables.productivityGoals, options.strategy);

        // Import goal progress
        result.recordsImported += this.importGoalProgress(data.tables.goalProgress, options.strategy);

        // Import tag relations
        result.recordsImported += this.importTagRelations(data.tables, options.strategy);
      });

      // Execute the transaction
      importTransaction();

      // Compact database after transaction if replace strategy was used
      if (options.strategy === 'replace') {
        this.db.pragma('wal_checkpoint(TRUNCATE)');
        this.db.prepare('VACUUM').run();
      }

      result.success = true;

      return result;
    } catch (error) {
      logger.error('Failed to import database', {
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  // ==================== EXPORT HELPER METHODS ====================

  private getAllGoalProgress(): GoalProgress[] {
    const stmt = this.db.prepare(`
      SELECT
        id,
        goal_id as goalId,
        date,
        progress_minutes as progressMinutes,
        achieved,
        notified,
        created_at as createdAt,
        updated_at as updatedAt
      FROM goal_progress
      ORDER BY date DESC
    `);

    return stmt.all() as GoalProgress[];
  }

  private getTimeEntryTagsRelations(): Array<{ timeEntryId: number; tagId: number }> {
    const stmt = this.db.prepare(`
      SELECT time_entry_id as timeEntryId, tag_id as tagId
      FROM time_entry_tags
    `);

    return stmt.all() as Array<{ timeEntryId: number; tagId: number }>;
  }

  private getAppUsageTagsRelations(): Array<{ appUsageId: number; tagId: number }> {
    const stmt = this.db.prepare(`
      SELECT app_usage_id as appUsageId, tag_id as tagId
      FROM app_usage_tags
    `);

    return stmt.all() as Array<{ appUsageId: number; tagId: number }>;
  }

  private getPomodoroSessionTagsRelations(): Array<{ pomodoroSessionId: number; tagId: number }> {
    const stmt = this.db.prepare(`
      SELECT pomodoro_session_id as pomodoroSessionId, tag_id as tagId
      FROM pomodoro_session_tags
    `);

    return stmt.all() as Array<{ pomodoroSessionId: number; tagId: number }>;
  }

  private getProductivityGoalTagsRelations(): Array<{ productivityGoalId: number; tagId: number }> {
    const stmt = this.db.prepare(`
      SELECT productivity_goal_id as productivityGoalId, tag_id as tagId
      FROM productivity_goal_tags
    `);

    return stmt.all() as Array<{ productivityGoalId: number; tagId: number }>;
  }

  // ==================== IMPORT HELPER METHODS ====================

  private validateExportData(data: ExportData): boolean {
    if (!data || typeof data !== 'object') return false;
    if (!data.version || !data.schemaVersion || !data.exportDate) return false;
    if (!data.tables || typeof data.tables !== 'object') return false;

    // Check if all required tables exist
    const requiredTables = [
      'timeEntries', 'appUsage', 'categories', 'tags',
      'pomodoroSessions', 'productivityGoals', 'goalProgress',
      'appCategoryMappings', 'domainCategoryMappings',
      'timeEntryTags', 'appUsageTags', 'pomodoroSessionTags', 'productivityGoalTags'
    ];

    return requiredTables.every(table => Array.isArray(data.tables[table as keyof typeof data.tables]));
  }

  private importCategories(categories: Category[], strategy: string): number {
    let count = 0;
    for (const category of categories) {
      try {
        if (strategy === 'skip_duplicates') {
          const existing = this.dbManager.getCategoryByName(category.name);
          if (existing) continue;
        }
        this.dbManager.addCategory(category);
        count++;
      } catch (error) {
        logger.warn(`Failed to import category: ${category.name}`, {
          categoryName: category.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    return count;
  }

  private importTags(tags: Tag[], strategy: string): number {
    let count = 0;
    for (const tag of tags) {
      try {
        if (strategy === 'skip_duplicates') {
          const existing = this.dbManager.getTagByName(tag.name);
          if (existing) continue;
        }
        this.dbManager.addTag(tag);
        count++;
      } catch (error) {
        logger.warn(`Failed to import tag: ${tag.name}`, {
          tagName: tag.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    return count;
  }

  private importAppCategoryMappings(mappings: AppCategoryMapping[], strategy: string): number {
    let count = 0;
    for (const mapping of mappings) {
      try {
        if (strategy === 'skip_duplicates') {
          const existing = this.dbManager.getCategoryIdForApp(mapping.appName);
          if (existing) continue;
        }
        this.dbManager.addAppCategoryMapping(mapping.appName, mapping.categoryId);
        count++;
      } catch (error) {
        logger.warn(`Failed to import app mapping: ${mapping.appName}`, {
          appName: mapping.appName,
          categoryId: mapping.categoryId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    return count;
  }

  private importDomainCategoryMappings(mappings: DomainCategoryMapping[], strategy: string): number {
    let count = 0;
    for (const mapping of mappings) {
      try {
        if (strategy === 'skip_duplicates') {
          const existing = this.dbManager.getCategoryIdForDomain(mapping.domain);
          if (existing) continue;
        }
        this.dbManager.addDomainCategoryMapping(mapping.domain, mapping.categoryId);
        count++;
      } catch (error) {
        logger.warn(`Failed to import domain mapping: ${mapping.domain}`, {
          domain: mapping.domain,
          categoryId: mapping.categoryId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    return count;
  }

  private importTimeEntries(entries: TimeEntry[], _strategy: string): number {
    let count = 0;
    for (const entry of entries) {
      try {
        const entryWithoutId = { ...entry };
        delete entryWithoutId.id;
        delete entryWithoutId.tags; // Tags are imported separately
        this.dbManager.addTimeEntry(entryWithoutId);
        count++;
      } catch (error) {
        logger.warn(`Failed to import time entry: ${entry.task}`, {
          task: entry.task,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    return count;
  }

  private importAppUsage(usages: AppUsage[], _strategy: string): number {
    let count = 0;
    for (const usage of usages) {
      try {
        const usageWithoutId = { ...usage };
        delete usageWithoutId.id;
        delete usageWithoutId.tags; // Tags are imported separately
        this.dbManager.addAppUsage(usageWithoutId);
        count++;
      } catch (error) {
        logger.warn(`Failed to import app usage: ${usage.appName}`, {
          appName: usage.appName,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    return count;
  }

  private importPomodoroSessions(sessions: PomodoroSession[], _strategy: string): number {
    let count = 0;
    for (const session of sessions) {
      try {
        const sessionWithoutId = { ...session };
        delete sessionWithoutId.id;
        delete sessionWithoutId.tags; // Tags are imported separately
        this.dbManager.addPomodoroSession(sessionWithoutId);
        count++;
      } catch (error) {
        logger.warn(`Failed to import pomodoro session: ${session.task}`, {
          task: session.task,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    return count;
  }

  private importProductivityGoals(goals: ProductivityGoal[], _strategy: string): number {
    let count = 0;
    for (const goal of goals) {
      try {
        const goalWithoutId = { ...goal };
        delete goalWithoutId.id;
        delete goalWithoutId.tags; // Tags are imported separately
        this.dbManager.addGoal(goalWithoutId);
        count++;
      } catch (error) {
        logger.warn(`Failed to import productivity goal: ${goal.name}`, {
          goalName: goal.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    return count;
  }

  private importGoalProgress(progress: GoalProgress[], _strategy: string): number {
    let count = 0;
    for (const prog of progress) {
      try {
        this.dbManager.updateGoalProgress(prog.goalId, prog.date, prog.progressMinutes);
        count++;
      } catch (error) {
        logger.warn(`Failed to import goal progress for goal ${prog.goalId}`, {
          goalId: prog.goalId,
          date: prog.date,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    return count;
  }

  private importTagRelations(tables: ExportData['tables'], _strategy: string): number {
    let count = 0;

    // Import time entry tags
    for (const relation of tables.timeEntryTags) {
      try {
        this.db.prepare(`
          INSERT OR IGNORE INTO time_entry_tags (time_entry_id, tag_id)
          VALUES (?, ?)
        `).run(relation.timeEntryId, relation.tagId);
        count++;
      } catch (error) {
        logger.warn('Failed to import time entry tag relation', {
          timeEntryId: relation.timeEntryId,
          tagId: relation.tagId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Import app usage tags
    for (const relation of tables.appUsageTags) {
      try {
        this.db.prepare(`
          INSERT OR IGNORE INTO app_usage_tags (app_usage_id, tag_id)
          VALUES (?, ?)
        `).run(relation.appUsageId, relation.tagId);
        count++;
      } catch (error) {
        logger.warn('Failed to import app usage tag relation', {
          appUsageId: relation.appUsageId,
          tagId: relation.tagId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Import pomodoro session tags
    for (const relation of tables.pomodoroSessionTags) {
      try {
        this.db.prepare(`
          INSERT OR IGNORE INTO pomodoro_session_tags (pomodoro_session_id, tag_id)
          VALUES (?, ?)
        `).run(relation.pomodoroSessionId, relation.tagId);
        count++;
      } catch (error) {
        logger.warn('Failed to import pomodoro session tag relation', {
          pomodoroSessionId: relation.pomodoroSessionId,
          tagId: relation.tagId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Import productivity goal tags
    for (const relation of tables.productivityGoalTags) {
      try {
        this.db.prepare(`
          INSERT OR IGNORE INTO productivity_goal_tags (productivity_goal_id, tag_id)
          VALUES (?, ?)
        `).run(relation.productivityGoalId, relation.tagId);
        count++;
      } catch (error) {
        logger.warn('Failed to import productivity goal tag relation', {
          productivityGoalId: relation.productivityGoalId,
          tagId: relation.tagId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return count;
  }
}
