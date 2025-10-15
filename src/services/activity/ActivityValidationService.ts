import { DatabaseManager } from '../../database/DatabaseManager';
import {
  UnifiedActivity,
  ValidationResult,
  OverlapResult,
  DuplicateResult,
} from '../../types';

/**
 * ActivityValidationService
 * Validates unified activities before database operations to ensure data integrity
 */
export class ActivityValidationService {
  constructor(_db: DatabaseManager) {
    // db parameter reserved for future database operations
  }

  /**
   * Validate a complete activity
   * Checks all aspects: time range, field values, and required fields
   */
  validateActivity(activity: UnifiedActivity): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!activity.id) {
      errors.push('Activity ID is required');
    }

    if (!activity.title || activity.title.trim() === '') {
      errors.push('Activity title is required');
    }

    if (!activity.sourceType) {
      errors.push('Activity source type is required');
    }

    if (!activity.type) {
      errors.push('Activity type is required');
    }

    // Validate time range
    const timeValidation = this.validateTimeRange(activity.startTime, activity.endTime);
    errors.push(...timeValidation.errors);
    warnings.push(...timeValidation.warnings);

    // Validate field values
    const fieldValidation = this.validateFieldValues(activity);
    errors.push(...fieldValidation.errors);
    warnings.push(...fieldValidation.warnings);

    // Validate editability flags
    if (activity.isEditable && (!activity.editableFields || activity.editableFields.length === 0)) {
      warnings.push('Activity marked as editable but no editable fields specified');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate time range
   * Ensures start time is before end time and no future dates
   */
  validateTimeRange(startTime: string, endTime: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check date format (ISO 8601)
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime())) {
      errors.push(`Invalid start time format: ${startTime}`);
    }

    if (isNaN(end.getTime())) {
      errors.push(`Invalid end time format: ${endTime}`);
    }

    // If both dates are valid, check logical consistency
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      // Start time must be before end time
      if (start.getTime() >= end.getTime()) {
        errors.push('Start time must be before end time');
      }

      // Check for future dates
      const now = new Date();
      if (start.getTime() > now.getTime()) {
        warnings.push('Activity has a future start time');
      }

      if (end.getTime() > now.getTime()) {
        warnings.push('Activity has a future end time');
      }

      // Check for very long durations (more than 24 hours)
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (durationHours > 24) {
        warnings.push(`Activity duration is very long: ${durationHours.toFixed(1)} hours`);
      }

      // Check for very short durations (less than 1 second)
      const durationSeconds = (end.getTime() - start.getTime()) / 1000;
      if (durationSeconds < 1) {
        warnings.push('Activity duration is less than 1 second');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if an activity overlaps with existing activities
   */
  async checkOverlap(activity: UnifiedActivity, existingActivities: UnifiedActivity[]): Promise<OverlapResult> {
    const overlappingActivities: UnifiedActivity[] = [];
    let totalOverlapDuration = 0;

    const actStart = new Date(activity.startTime).getTime();
    const actEnd = new Date(activity.endTime).getTime();

    for (const existing of existingActivities) {
      // Skip checking against itself
      if (existing.id === activity.id && existing.sourceType === activity.sourceType) {
        continue;
      }

      const exStart = new Date(existing.startTime).getTime();
      const exEnd = new Date(existing.endTime).getTime();

      // Check for overlap: activity starts before existing ends AND activity ends after existing starts
      if (actStart < exEnd && actEnd > exStart) {
        overlappingActivities.push(existing);

        // Calculate overlap duration
        const overlapStart = Math.max(actStart, exStart);
        const overlapEnd = Math.min(actEnd, exEnd);
        const overlapSeconds = (overlapEnd - overlapStart) / 1000;
        totalOverlapDuration += overlapSeconds;
      }
    }

    return {
      hasOverlap: overlappingActivities.length > 0,
      overlappingActivities,
      overlapDuration: totalOverlapDuration,
    };
  }

  /**
   * Validate edit permissions
   * Checks if the updates only modify fields that are marked as editable
   */
  validateEditPermissions(activity: UnifiedActivity, updates: Partial<UnifiedActivity>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if activity is editable at all
    if (!activity.isEditable) {
      errors.push('Activity is not editable');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Get keys being updated (excluding undefined values)
    const updateKeys = Object.keys(updates).filter(key => updates[key as keyof UnifiedActivity] !== undefined);

    // Check if all update keys are in editable fields
    const nonEditableFields = updateKeys.filter(key => !activity.editableFields.includes(key));

    if (nonEditableFields.length > 0) {
      errors.push(`Cannot edit non-editable fields: ${nonEditableFields.join(', ')}`);
      errors.push(`Editable fields for this activity: ${activity.editableFields.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate field values
   * Ensures all field values are within acceptable ranges and formats
   */
  validateFieldValues(activity: UnifiedActivity): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate duration
    if (activity.duration !== undefined) {
      if (activity.duration < 0) {
        errors.push('Duration cannot be negative');
      }

      if (activity.duration === 0) {
        warnings.push('Activity has zero duration');
      }

      // Check if duration matches time range
      const start = new Date(activity.startTime);
      const end = new Date(activity.endTime);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const calculatedDuration = Math.floor((end.getTime() - start.getTime()) / 1000);
        const diff = Math.abs(calculatedDuration - activity.duration);

        // Allow 1 second tolerance for rounding
        if (diff > 1) {
          warnings.push(
            `Duration mismatch: stored ${activity.duration}s, calculated ${calculatedDuration}s (diff: ${diff}s)`
          );
        }
      }
    }

    // Validate category ID if present
    if (activity.categoryId !== undefined && activity.categoryId <= 0) {
      errors.push('Category ID must be a positive number');
    }

    // Validate tags
    if (activity.tags && activity.tags.length > 0) {
      for (const tag of activity.tags) {
        if (!tag.id || tag.id <= 0) {
          errors.push(`Invalid tag ID: ${tag.id}`);
        }
        if (!tag.name || tag.name.trim() === '') {
          errors.push('Tag name cannot be empty');
        }
      }
    }

    // Validate source-specific fields
    if (activity.sourceType === 'automatic' && activity.metadata) {
      if (!activity.metadata.appName && !activity.metadata.domain) {
        warnings.push('Automatic activity should have app name or domain');
      }
    }

    if (activity.sourceType === 'pomodoro' && activity.metadata) {
      if (!activity.metadata.sessionType) {
        errors.push('Pomodoro activity must have session type');
      }

      if (activity.metadata.completed === undefined) {
        warnings.push('Pomodoro activity missing completed status');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Detect duplicate activities
   * Finds similar activities based on time, title, and source
   */
  async detectDuplicates(activity: UnifiedActivity, existingActivities: UnifiedActivity[]): Promise<DuplicateResult> {
    const duplicates: UnifiedActivity[] = [];
    const similarityThreshold = 80; // 80% similarity to consider duplicate

    for (const existing of existingActivities) {
      // Skip checking against itself
      if (existing.id === activity.id && existing.sourceType === activity.sourceType) {
        continue;
      }

      const similarity = this.calculateSimilarity(activity, existing);

      if (similarity >= similarityThreshold) {
        duplicates.push(existing);
      }
    }

    // Calculate average similarity
    const avgSimilarity =
      duplicates.length > 0
        ? duplicates.reduce((sum, dup) => sum + this.calculateSimilarity(activity, dup), 0) / duplicates.length
        : 0;

    return {
      isDuplicate: duplicates.length > 0,
      duplicateActivities: duplicates,
      similarity: avgSimilarity,
    };
  }

  /**
   * Calculate similarity between two activities (0-100%)
   * Uses multiple factors: time overlap, title similarity, source type
   */
  private calculateSimilarity(activity1: UnifiedActivity, activity2: UnifiedActivity): number {
    let score = 0;
    const weights = {
      timeOverlap: 40,
      titleMatch: 30,
      sourceMatch: 20,
      categoryMatch: 10,
    };

    // Time overlap score (40%)
    const timeOverlap = this.calculateTimeOverlapPercentage(activity1, activity2);
    score += (timeOverlap / 100) * weights.timeOverlap;

    // Title similarity score (30%)
    const titleSimilarity = this.calculateStringSimilarity(activity1.title, activity2.title);
    score += (titleSimilarity / 100) * weights.titleMatch;

    // Source type match (20%)
    if (activity1.sourceType === activity2.sourceType) {
      score += weights.sourceMatch;
    }

    // Category match (10%)
    if (activity1.categoryId && activity2.categoryId && activity1.categoryId === activity2.categoryId) {
      score += weights.categoryMatch;
    }

    return Math.round(score);
  }

  /**
   * Calculate time overlap percentage between two activities
   */
  private calculateTimeOverlapPercentage(activity1: UnifiedActivity, activity2: UnifiedActivity): number {
    const start1 = new Date(activity1.startTime).getTime();
    const end1 = new Date(activity1.endTime).getTime();
    const start2 = new Date(activity2.startTime).getTime();
    const end2 = new Date(activity2.endTime).getTime();

    // Calculate overlap
    const overlapStart = Math.max(start1, start2);
    const overlapEnd = Math.min(end1, end2);

    if (overlapStart >= overlapEnd) {
      return 0; // No overlap
    }

    const overlapDuration = overlapEnd - overlapStart;
    const duration1 = end1 - start1;
    const duration2 = end2 - start2;
    const averageDuration = (duration1 + duration2) / 2;

    // Guard against division by zero when both activities have zero duration
    if (averageDuration === 0) {
      return 0;
    }

    return Math.round((overlapDuration / averageDuration) * 100);
  }

  /**
   * Calculate string similarity using Levenshtein distance
   * Returns percentage (0-100%)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 100;
    if (s1.length === 0 || s2.length === 0) return 0;

    // Levenshtein distance algorithm
    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }

    const firstRow = matrix[0];
    if (!firstRow) {
      throw new Error('Matrix initialization failed');
    }

    for (let j = 0; j <= s1.length; j++) {
      firstRow[j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= s2.length; i++) {
      const currentRow = matrix[i];
      if (!currentRow) {
        continue;
      }

      for (let j = 1; j <= s1.length; j++) {
        const prevRow = matrix[i - 1];
        if (!prevRow) {
          continue;
        }

        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          const prevDiag = prevRow[j - 1];
          if (prevDiag !== undefined) {
            currentRow[j] = prevDiag;
          }
        } else {
          const prevDiag = prevRow[j - 1];
          const prevLeft = currentRow[j - 1];
          const prevUp = prevRow[j];

          if (prevDiag !== undefined && prevLeft !== undefined && prevUp !== undefined) {
            currentRow[j] = Math.min(
              prevDiag + 1, // substitution
              prevLeft + 1, // insertion
              prevUp + 1 // deletion
            );
          }
        }
      }
    }

    const lastRow = matrix[s2.length];
    if (!lastRow) {
      throw new Error('Matrix calculation failed');
    }

    const distance = lastRow[s1.length];
    if (distance === undefined) {
      throw new Error('Distance calculation failed');
    }

    const maxLength = Math.max(s1.length, s2.length);
    const similarity = ((maxLength - distance) / maxLength) * 100;

    return Math.round(similarity);
  }

  /**
   * Validate batch of activities
   * Returns validation results for each activity
   */
  async validateBatch(activities: UnifiedActivity[]): Promise<{ [id: number]: ValidationResult }> {
    const results: { [id: number]: ValidationResult } = {};

    for (const activity of activities) {
      results[activity.id] = this.validateActivity(activity);
    }

    return results;
  }
}
