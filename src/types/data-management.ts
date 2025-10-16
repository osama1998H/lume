import type { TimeEntry, AppUsage } from './unified-activity';
import type { Category, Tag, AppCategoryMapping, DomainCategoryMapping } from './categories';
import type { PomodoroSession } from './pomodoro';
import type { ProductivityGoal, GoalProgress } from './goals';

// Data Export/Import Types
export interface ExportData {
  version: string; // App version
  schemaVersion: number; // Database schema version
  exportDate: string; // ISO timestamp
  tables: {
    timeEntries: TimeEntry[];
    appUsage: AppUsage[];
    categories: Category[];
    tags: Tag[];
    pomodoroSessions: PomodoroSession[];
    productivityGoals: ProductivityGoal[];
    goalProgress: GoalProgress[];
    appCategoryMappings: AppCategoryMapping[];
    domainCategoryMappings: DomainCategoryMapping[];
    timeEntryTags: Array<{ timeEntryId: number; tagId: number }>;
    appUsageTags: Array<{ appUsageId: number; tagId: number }>;
    pomodoroSessionTags: Array<{ pomodoroSessionId: number; tagId: number }>;
    productivityGoalTags: Array<{ productivityGoalId: number; tagId: number }>;
  };
}

export type ImportStrategy = 'merge' | 'replace' | 'skip_duplicates';

export interface ImportOptions {
  strategy: ImportStrategy;
  validateOnly?: boolean; // If true, only validate without importing
}

export interface ImportResult {
  success: boolean;
  recordsImported: number;
  recordsSkipped: number;
  recordsUpdated: number;
  errors: string[];
  warnings: string[];
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
}
