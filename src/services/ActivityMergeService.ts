import { DatabaseManager } from '../database/DatabaseManager';
import { ActivityValidationService } from './ActivityValidationService';
import {
  UnifiedActivity,
  ActivityConflict,
  ResolvedActivity,
  MergeSuggestion,
  TimeGap,
  Tag,
} from '../types';

/**
 * ActivityMergeService
 * Handles merging, splitting, and conflict resolution for unified activities
 */
export class ActivityMergeService {
  private validationService: ActivityValidationService;

  constructor(_db: DatabaseManager, validationService: ActivityValidationService) {
    // db parameter reserved for future database operations
    this.validationService = validationService;
  }

  /**
   * Merge multiple activities into one based on strategy
   * @param activities - Activities to merge
   * @param strategy - Which activity's data to prefer
   */
  async mergeActivities(
    activities: UnifiedActivity[],
    strategy: 'longest' | 'earliest' | 'latest'
  ): Promise<UnifiedActivity> {
    if (activities.length === 0) {
      throw new Error('Cannot merge empty activity list');
    }

    if (activities.length === 1) {
      return activities[0];
    }

    // Sort activities by start time
    const sortedActivities = [...activities].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    // Determine base activity based on strategy
    let baseActivity: UnifiedActivity;

    switch (strategy) {
      case 'longest':
        baseActivity = sortedActivities.reduce((prev, current) =>
          current.duration > prev.duration ? current : prev
        );
        break;

      case 'earliest':
        baseActivity = sortedActivities[0];
        break;

      case 'latest':
        baseActivity = sortedActivities[sortedActivities.length - 1];
        break;

      default:
        baseActivity = sortedActivities[0];
    }

    // Calculate merged time range
    const earliestStart = sortedActivities[0].startTime;
    const latestEnd = sortedActivities.reduce((latest, activity) =>
      new Date(activity.endTime).getTime() > new Date(latest).getTime() ? activity.endTime : latest
    , sortedActivities[0].endTime);

    // Calculate merged duration
    const mergedDuration = Math.floor(
      (new Date(latestEnd).getTime() - new Date(earliestStart).getTime()) / 1000
    );

    // Combine tags from all activities (deduplicate by tag ID)
    const allTags: Tag[] = [];
    const tagIds = new Set<number>();

    for (const activity of sortedActivities) {
      if (activity.tags) {
        for (const tag of activity.tags) {
          if (tag.id && !tagIds.has(tag.id)) {
            tagIds.add(tag.id);
            allTags.push(tag);
          }
        }
      }
    }

    // Create merged activity
    const mergedActivity: UnifiedActivity = {
      ...baseActivity,
      startTime: earliestStart,
      endTime: latestEnd,
      duration: mergedDuration,
      tags: allTags.length > 0 ? allTags : undefined,
      updatedAt: new Date().toISOString(),
    };

    // Validate merged activity
    const validation = this.validationService.validateActivity(mergedActivity);
    if (!validation.isValid) {
      throw new Error(`Merged activity validation failed: ${validation.errors.join(', ')}`);
    }

    return mergedActivity;
  }

  /**
   * Split an activity into multiple activities at specified time points
   * @param activity - Activity to split
   * @param splitPoints - Array of ISO timestamp strings where splits should occur
   */
  async splitActivity(activity: UnifiedActivity, splitPoints: string[]): Promise<UnifiedActivity[]> {
    if (splitPoints.length === 0) {
      return [activity];
    }

    // Sort split points chronologically
    const sortedSplits = [...splitPoints]
      .map(sp => new Date(sp).getTime())
      .filter(time => {
        const actStart = new Date(activity.startTime).getTime();
        const actEnd = new Date(activity.endTime).getTime();
        return time > actStart && time < actEnd;
      })
      .sort((a, b) => a - b);

    if (sortedSplits.length === 0) {
      console.warn('No valid split points within activity time range');
      return [activity];
    }

    // Create time boundaries: [start, split1, split2, ..., end]
    const boundaries = [
      new Date(activity.startTime).getTime(),
      ...sortedSplits,
      new Date(activity.endTime).getTime(),
    ];

    // Create split activities
    const splitActivities: UnifiedActivity[] = [];

    for (let i = 0; i < boundaries.length - 1; i++) {
      const start = new Date(boundaries[i]).toISOString();
      const end = new Date(boundaries[i + 1]).toISOString();
      const duration = Math.floor((boundaries[i + 1] - boundaries[i]) / 1000);

      splitActivities.push({
        ...activity,
        id: i === 0 ? activity.id : activity.id + i * 10000, // Generate new IDs for splits
        startTime: start,
        endTime: end,
        duration,
        title: `${activity.title} (Part ${i + 1})`,
        updatedAt: new Date().toISOString(),
      });
    }

    return splitActivities;
  }

  /**
   * Resolve a conflict between activities
   * @param conflict - The conflict to resolve
   * @param resolution - Resolution strategy
   */
  async resolveConflict(
    conflict: ActivityConflict,
    resolution: 'merge' | 'split' | 'delete_one' | 'adjust_time'
  ): Promise<ResolvedActivity[]> {
    switch (conflict.conflictType) {
      case 'overlap':
        return this.resolveOverlapConflict(conflict.activities, resolution);

      case 'duplicate':
        return this.resolveDuplicateConflict(conflict.activities, resolution);

      case 'gap':
        console.warn('Gap conflicts do not require resolution');
        return conflict.activities.map(activity => ({
          activity,
          action: 'keep' as const,
        }));

      default:
        throw new Error(`Unknown conflict type: ${conflict.conflictType}`);
    }
  }

  /**
   * Resolve overlap conflicts between activities
   */
  private async resolveOverlapConflict(
    activities: UnifiedActivity[],
    resolution: 'merge' | 'split' | 'delete_one' | 'adjust_time'
  ): Promise<ResolvedActivity[]> {
    const resolved: ResolvedActivity[] = [];

    switch (resolution) {
      case 'merge':
        // Merge all overlapping activities into one
        const merged = await this.mergeActivities(activities, 'longest');
        resolved.push({ activity: merged, action: 'update' });

        // Mark others for deletion
        for (const activity of activities.slice(1)) {
          resolved.push({ activity, action: 'delete' });
        }
        break;

      case 'delete_one':
        // Keep first, delete rest
        resolved.push({ activity: activities[0], action: 'keep' });
        for (const activity of activities.slice(1)) {
          resolved.push({ activity, action: 'delete' });
        }
        break;

      case 'adjust_time':
        // Adjust times to remove overlap
        const adjusted = this.adjustTimesToRemoveOverlap(activities);
        for (const activity of adjusted) {
          resolved.push({ activity, action: 'update' });
        }
        break;

      case 'split':
        // Split overlapping activities at overlap points
        console.warn('Split resolution not implemented for overlaps');
        for (const activity of activities) {
          resolved.push({ activity, action: 'keep' });
        }
        break;
    }

    return resolved;
  }

  /**
   * Resolve duplicate conflicts
   */
  private async resolveDuplicateConflict(
    activities: UnifiedActivity[],
    resolution: 'merge' | 'split' | 'delete_one' | 'adjust_time'
  ): Promise<ResolvedActivity[]> {
    const resolved: ResolvedActivity[] = [];

    switch (resolution) {
      case 'merge':
        const merged = await this.mergeActivities(activities, 'earliest');
        resolved.push({ activity: merged, action: 'update' });
        for (const activity of activities.slice(1)) {
          resolved.push({ activity, action: 'delete' });
        }
        break;

      case 'delete_one':
        // Keep first duplicate, delete rest
        resolved.push({ activity: activities[0], action: 'keep' });
        for (const activity of activities.slice(1)) {
          resolved.push({ activity, action: 'delete' });
        }
        break;

      default:
        // For duplicates, just keep all
        for (const activity of activities) {
          resolved.push({ activity, action: 'keep' });
        }
    }

    return resolved;
  }

  /**
   * Adjust activity times to remove overlaps
   */
  private adjustTimesToRemoveOverlap(activities: UnifiedActivity[]): UnifiedActivity[] {
    // Sort by start time
    const sorted = [...activities].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const adjusted: UnifiedActivity[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const current = { ...sorted[i] };

      // Check if there's a next activity
      if (i < sorted.length - 1) {
        const next = sorted[i + 1];
        const currentEnd = new Date(current.endTime).getTime();
        const nextStart = new Date(next.startTime).getTime();

        // If current overlaps with next, adjust current's end time
        if (currentEnd > nextStart) {
          current.endTime = next.startTime;
          current.duration = Math.floor((nextStart - new Date(current.startTime).getTime()) / 1000);
        }
      }

      adjusted.push(current);
    }

    return adjusted;
  }

  /**
   * Suggest if activities should be merged
   */
  async suggestMerge(activities: UnifiedActivity[]): Promise<MergeSuggestion> {
    if (activities.length < 2) {
      return {
        canMerge: false,
        reason: 'Need at least 2 activities to merge',
        confidence: 0,
      };
    }

    // Check if all activities are of same source type
    const sourceTypes = new Set(activities.map(a => a.sourceType));
    if (sourceTypes.size > 1) {
      return {
        canMerge: false,
        reason: 'Cannot merge activities from different sources',
        confidence: 0,
      };
    }

    // Sort by start time
    const sorted = [...activities].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    // Check time gaps between consecutive activities
    let maxGapSeconds = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      const end = new Date(sorted[i].endTime).getTime();
      const nextStart = new Date(sorted[i + 1].startTime).getTime();
      const gapSeconds = (nextStart - end) / 1000;
      maxGapSeconds = Math.max(maxGapSeconds, gapSeconds);
    }

    // Calculate confidence based on gap size
    let confidence = 0;
    let reason = '';

    if (maxGapSeconds === 0) {
      // No gaps - perfect for merging
      confidence = 100;
      reason = 'Activities are consecutive with no gaps';
    } else if (maxGapSeconds <= 60) {
      // Less than 1 minute gap
      confidence = 90;
      reason = `Small gaps (max ${maxGapSeconds}s) between activities`;
    } else if (maxGapSeconds <= 300) {
      // Less than 5 minutes gap
      confidence = 70;
      reason = `Moderate gaps (max ${Math.round(maxGapSeconds / 60)}min) between activities`;
    } else if (maxGapSeconds <= 900) {
      // Less than 15 minutes gap
      confidence = 50;
      reason = `Large gaps (max ${Math.round(maxGapSeconds / 60)}min) between activities`;
    } else {
      // More than 15 minutes
      confidence = 20;
      reason = `Very large gaps (max ${Math.round(maxGapSeconds / 60)}min) - not recommended`;
    }

    // Check title similarity
    const titles = activities.map(a => a.title.toLowerCase());
    const uniqueTitles = new Set(titles);
    if (uniqueTitles.size === 1) {
      confidence += 10; // Bonus for same titles
      reason += ' and identical titles';
    }

    const canMerge = confidence >= 50;

    if (canMerge) {
      const mergedActivity = await this.mergeActivities(activities, 'longest');
      return {
        canMerge: true,
        reason,
        confidence: Math.min(confidence, 100),
        mergedActivity,
      };
    }

    return {
      canMerge: false,
      reason,
      confidence,
    };
  }

  /**
   * Auto-merge activities with small gaps
   * @param activities - Activities to consider for merging
   * @param thresholdSeconds - Maximum gap size to auto-merge (default 60s)
   */
  async applyAutoMerge(activities: UnifiedActivity[], thresholdSeconds = 60): Promise<UnifiedActivity[]> {
    if (activities.length === 0) {
      return [];
    }

    // Sort by start time
    const sorted = [...activities].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const result: UnifiedActivity[] = [];
    let currentGroup: UnifiedActivity[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prevEnd = new Date(sorted[i - 1].endTime).getTime();
      const currentStart = new Date(sorted[i].startTime).getTime();
      const gap = (currentStart - prevEnd) / 1000;

      // Check if can merge with current group
      const canMergeWithGroup =
        gap <= thresholdSeconds &&
        sorted[i].sourceType === currentGroup[0].sourceType;

      if (canMergeWithGroup) {
        currentGroup.push(sorted[i]);
      } else {
        // Merge current group and start new group
        if (currentGroup.length > 1) {
          const merged = await this.mergeActivities(currentGroup, 'longest');
          result.push(merged);
        } else {
          result.push(currentGroup[0]);
        }
        currentGroup = [sorted[i]];
      }
    }

    // Handle last group
    if (currentGroup.length > 1) {
      const merged = await this.mergeActivities(currentGroup, 'longest');
      result.push(merged);
    } else {
      result.push(currentGroup[0]);
    }

    return result;
  }

  /**
   * Detect gaps in activity timeline
   * @param activities - Activities to analyze
   * @returns Array of gaps between activities
   */
  detectGaps(activities: UnifiedActivity[]): TimeGap[] {
    if (activities.length < 2) {
      return [];
    }

    // Sort by start time
    const sorted = [...activities].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const gaps: TimeGap[] = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      const currentEnd = new Date(current.endTime);
      const nextStart = new Date(next.startTime);

      // Gap exists if there's time between current end and next start
      if (currentEnd.getTime() < nextStart.getTime()) {
        const gapDuration = Math.floor((nextStart.getTime() - currentEnd.getTime()) / 1000);

        gaps.push({
          startTime: current.endTime,
          endTime: next.startTime,
          duration: gapDuration,
          beforeActivity: current,
          afterActivity: next,
        });
      }
    }

    return gaps;
  }

  /**
   * Find activities that can be merged together
   * Groups activities that are close in time and have similar properties
   */
  async findMergeableGroups(activities: UnifiedActivity[], maxGapSeconds = 300): Promise<UnifiedActivity[][]> {
    if (activities.length === 0) {
      return [];
    }

    // Sort by start time
    const sorted = [...activities].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const groups: UnifiedActivity[][] = [];
    let currentGroup: UnifiedActivity[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prevEnd = new Date(sorted[i - 1].endTime).getTime();
      const currentStart = new Date(sorted[i].startTime).getTime();
      const gap = (currentStart - prevEnd) / 1000;

      const canGroup =
        gap <= maxGapSeconds &&
        sorted[i].sourceType === currentGroup[0].sourceType &&
        sorted[i].type === currentGroup[0].type;

      if (canGroup) {
        currentGroup.push(sorted[i]);
      } else {
        if (currentGroup.length > 1) {
          groups.push(currentGroup);
        }
        currentGroup = [sorted[i]];
      }
    }

    // Handle last group
    if (currentGroup.length > 1) {
      groups.push(currentGroup);
    }

    return groups;
  }
}
