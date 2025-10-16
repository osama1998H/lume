import type { Tag } from './categories';

export interface TimeEntry {
  id?: number;
  task: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  category?: string; // Kept for backward compatibility
  categoryId?: number; // New category ID reference
  todoId?: number; // Link to todo item
  tags?: Tag[]; // Tags associated with this entry
  createdAt?: string;
}

export interface AppUsage {
  id?: number;
  appName: string;
  windowTitle?: string;
  category?: string; // Kept for backward compatibility
  categoryId?: number; // New category ID reference
  domain?: string;
  url?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  isBrowser?: boolean;
  isIdle?: boolean;
  tags?: Tag[]; // Tags associated with this usage
  createdAt?: string;
}

// Unified Activity Types (for Activity Log feature)
export type ActivitySourceType = 'manual' | 'automatic' | 'pomodoro';
export type UnifiedActivityType = 'time_entry' | 'app' | 'browser' | 'pomodoro_focus' | 'pomodoro_break';
export type ConflictType = 'overlap' | 'duplicate' | 'gap';

/**
 * Unified Activity - Combines TimeEntry, AppUsage, and PomodoroSession
 * into a single interface for the unified activity log
 */
export interface UnifiedActivity {
  // Core fields
  id: number;
  sourceType: ActivitySourceType; // Where did this activity come from
  type: UnifiedActivityType; // Specific activity type
  title: string; // Task name, app name, or "Focus Session"
  startTime: string; // ISO string
  endTime: string; // ISO string
  duration: number; // in seconds

  // Categorization
  categoryId?: number;
  categoryName?: string;
  categoryColor?: string;
  tags?: Tag[];

  // Source-specific metadata
  metadata?: UnifiedActivityMetadata;

  // Editability flags
  isEditable: boolean; // Can this activity be edited
  editableFields: string[]; // Which fields can be edited (e.g., ['title', 'categoryId', 'tags'])

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Metadata specific to each activity type
 */
export interface UnifiedActivityMetadata {
  // For automatic app/browser activities
  appName?: string;
  windowTitle?: string;
  domain?: string;
  url?: string;
  isBrowser?: boolean;
  isIdle?: boolean;

  // For pomodoro sessions
  sessionType?: 'focus' | 'shortBreak' | 'longBreak';
  completed?: boolean;
  interrupted?: boolean;

  // Original IDs for referencing source tables
  originalId?: number;
  originalTable?: 'time_entries' | 'app_usage' | 'pomodoro_sessions';
}

/**
 * Filters for querying unified activities
 */
export interface UnifiedActivityFilters {
  dateRange?: {
    start: string; // ISO string
    end: string; // ISO string
  };
  sourceTypes?: ActivitySourceType[]; // Filter by source
  activityTypes?: UnifiedActivityType[]; // Filter by type
  categories?: number[]; // Category IDs
  tags?: number[]; // Tag IDs
  searchQuery?: string; // Full-text search
  minDuration?: number; // Min duration in seconds
  maxDuration?: number; // Max duration in seconds
  isEditable?: boolean; // Only editable/non-editable activities
}

/**
 * Options for updating unified activities
 */
export interface UnifiedActivityUpdateOptions {
  id: number;
  sourceType: ActivitySourceType;
  updates: Partial<UnifiedActivity>;
  validateOverlap?: boolean; // Check for time overlaps
  resolveConflicts?: 'merge' | 'split' | 'cancel'; // How to handle conflicts
}

/**
 * Bulk operation options
 */
export interface BulkActivityOperation {
  activityIds: Array<{ id: number; sourceType: ActivitySourceType }>;
  operation: 'update' | 'delete' | 'merge';
  updates?: Partial<UnifiedActivity>; // For bulk updates
  mergeStrategy?: 'longest' | 'earliest' | 'latest'; // For merge operations
  addTagIds?: number[]; // Tag IDs to add to activities
  removeTagIds?: number[]; // Tag IDs to remove from activities
}

/**
 * Activity conflict detection result
 */
export interface ActivityConflict {
  conflictType: 'overlap' | 'duplicate' | 'gap';
  activities: UnifiedActivity[];
  suggestedResolution?: 'merge' | 'split' | 'delete_one' | 'adjust_time';
  message: string;
}

/**
 * Statistics for unified activities
 */
export interface UnifiedActivityStats {
  totalActivities: number;
  totalDuration: number; // in seconds
  bySourceType: {
    manual: number;
    automatic: number;
    pomodoro: number;
  };
  byCategory: import('./categories').CategoryStats[];
  editableCount: number;
  conflictsCount: number;
  gapsDetected: number;
}
