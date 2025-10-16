import type { UnifiedActivity } from './unified-activity';

// Activity Validation & Merge Types
/**
 * Result of activity validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Result of overlap detection
 */
export interface OverlapResult {
  hasOverlap: boolean;
  overlappingActivities: UnifiedActivity[];
  overlapDuration: number; // in seconds
}

/**
 * Result of duplicate detection
 */
export interface DuplicateResult {
  isDuplicate: boolean;
  duplicateActivities: UnifiedActivity[];
  similarity: number; // 0-100%
}

/**
 * Activity with its resolution action
 */
export interface ResolvedActivity {
  activity: UnifiedActivity;
  action: 'keep' | 'delete' | 'update';
}

/**
 * Suggestion for merging activities
 */
export interface MergeSuggestion {
  canMerge: boolean;
  reason: string;
  confidence: number; // 0-100%
  mergedActivity?: UnifiedActivity;
}

/**
 * Time gap between activities
 */
export interface TimeGap {
  startTime: string; // ISO string
  endTime: string; // ISO string
  duration: number; // in seconds
  beforeActivity?: UnifiedActivity;
  afterActivity?: UnifiedActivity;
}
