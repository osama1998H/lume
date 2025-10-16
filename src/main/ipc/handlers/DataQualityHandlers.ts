import { IpcMain } from 'electron';
import { IIPCHandlerContext, IIPCHandlerGroup } from '../types';
import { logger } from '@/services/logging/Logger';

/**
 * DataQualityHandlers - IPC handlers for data quality analysis and validation
 *
 * Handles:
 * - detect-activity-gaps: Detect time gaps between activities
 * - get-gap-statistics: Get statistics about activity gaps
 * - detect-duplicate-activities: Find duplicate activities
 * - find-mergeable-groups: Find activities that can be merged
 * - find-orphaned-activities: Find activities with invalid category references
 * - validate-activities-batch: Validate multiple activities
 * - recalculate-activity-durations: Recalculate durations based on timestamps
 * - find-zero-duration-activities: Find activities with zero or negative duration
 * - get-data-quality-report: Generate comprehensive data quality report
 *
 * Dependencies: DatabaseManager, ActivityValidationService, ActivityMergeService, CategoriesService
 */
export class DataQualityHandlers implements IIPCHandlerGroup {
  register(ipcMain: IpcMain, context: IIPCHandlerContext): void {
    // Detect activity gaps
    // Extracted from main.ts:642-667
    ipcMain.handle('detect-activity-gaps', async (_, startDate: string, endDate: string, minGapMinutes = 5) => {
      try {
        if (!context.dbManager || !context.activityMergeService) {
          logger.error('❌ Services not initialized');
          return [];
        }


        // Get all activities in the range
        const activities = context.dbManager.getUnifiedActivities(startDate, endDate, undefined);

        // Detect gaps using merge service
        const allGaps = context.activityMergeService.detectGaps(activities);

        // Filter by minimum gap size (convert minutes to seconds)
        const minGapSeconds = minGapMinutes * 60;
        const filteredGaps = allGaps.filter(gap => gap.duration >= minGapSeconds);

        return filteredGaps;
      } catch (error) {
        logger.error('Failed to detect activity gaps:', {}, error instanceof Error ? error : undefined);
        return [];
      }
    });

    // Get gap statistics
    // Extracted from main.ts:670-700
    ipcMain.handle('get-gap-statistics', async (_, startDate: string, endDate: string, minGapMinutes = 5) => {
      try {
        if (!context.dbManager || !context.activityMergeService) {
          logger.error('❌ Services not initialized');
          return { totalGaps: 0, totalUntrackedSeconds: 0, averageGapSeconds: 0, longestGapSeconds: 0 };
        }

        const activities = context.dbManager.getUnifiedActivities(startDate, endDate, undefined);
        const allGaps = context.activityMergeService.detectGaps(activities);

        const minGapSeconds = minGapMinutes * 60;
        const gaps = allGaps.filter(gap => gap.duration >= minGapSeconds);

        const totalUntrackedSeconds = gaps.reduce((sum, gap) => sum + gap.duration, 0);
        const averageGapSeconds = gaps.length > 0 ? totalUntrackedSeconds / gaps.length : 0;
        const longestGapSeconds = gaps.length > 0 ? Math.max(...gaps.map(g => g.duration)) : 0;

        const stats = {
          totalGaps: gaps.length,
          totalUntrackedSeconds,
          averageGapSeconds,
          longestGapSeconds,
        };

        return stats;
      } catch (error) {
        logger.error('Failed to get gap statistics:', {}, error instanceof Error ? error : undefined);
        return { totalGaps: 0, totalUntrackedSeconds: 0, averageGapSeconds: 0, longestGapSeconds: 0 };
      }
    });

    // Detect duplicate activities
    // Extracted from main.ts:703-748
    ipcMain.handle('detect-duplicate-activities', async (_, startDate: string, endDate: string, similarityThreshold = 80) => {
      try {
        if (!context.dbManager || !context.activityValidationService) {
          logger.error('❌ Services not initialized');
          return [];
        }


        const activities = context.dbManager.getUnifiedActivities(startDate, endDate, undefined);
        const duplicateGroups: any[] = [];
        const processedIds = new Set<string>();

        // Check each activity against all others
        for (const activity of activities) {
          const activityKey = `${activity.id}-${activity.sourceType}`;
          if (processedIds.has(activityKey)) continue;

          const duplicateResult = await context.activityValidationService.detectDuplicates(
            activity,
            activities
          );

          if (duplicateResult.isDuplicate && duplicateResult.similarity >= similarityThreshold) {
            // Create a group with this activity and its duplicates
            const group = {
              activities: [activity, ...duplicateResult.duplicateActivities],
              avgSimilarity: duplicateResult.similarity,
            };

            duplicateGroups.push(group);

            // Mark all activities in this group as processed
            group.activities.forEach(a => {
              processedIds.add(`${a.id}-${a.sourceType}`);
            });
          }
        }

        return duplicateGroups;
      } catch (error) {
        logger.error('Failed to detect duplicate activities:', {}, error instanceof Error ? error : undefined);
        return [];
      }
    });

    // Find mergeable groups
    // Extracted from main.ts:751-769
    ipcMain.handle('find-mergeable-groups', async (_, startDate: string, endDate: string, maxGapSeconds = 300) => {
      try {
        if (!context.dbManager || !context.activityMergeService) {
          logger.error('❌ Services not initialized');
          return [];
        }


        const activities = context.dbManager.getUnifiedActivities(startDate, endDate, undefined);
        const mergeableGroups = await context.activityMergeService.findMergeableGroups(activities, maxGapSeconds);

        return mergeableGroups;
      } catch (error) {
        logger.error('Failed to find mergeable groups:', {}, error instanceof Error ? error : undefined);
        return [];
      }
    });

    // Find orphaned activities
    // Extracted from main.ts:772-799
    ipcMain.handle('find-orphaned-activities', async (_, startDate: string, endDate: string) => {
      try {
        if (!context.dbManager) {
          logger.error('❌ Database manager not initialized');
          return [];
        }


        const activities = context.dbManager.getUnifiedActivities(startDate, endDate, undefined);
        const categories = await context.categoriesService?.getCategories() || [];
        const categoryIds = new Set(categories.map(c => c.id));

        // Find activities with invalid category references
        const orphaned = activities.filter(activity => {
          if (activity.categoryId && !categoryIds.has(activity.categoryId)) {
            return true;
          }
          return false;
        });

        return orphaned;
      } catch (error) {
        logger.error('Failed to find orphaned activities:', {}, error instanceof Error ? error : undefined);
        return [];
      }
    });

    // Validate activities batch
    // Extracted from main.ts:802-836
    ipcMain.handle('validate-activities-batch', async (_, startDate: string, endDate: string) => {
      try {
        if (!context.dbManager || !context.activityValidationService) {
          logger.error('❌ Services not initialized');
          return { valid: [], invalid: [] };
        }


        const activities = context.dbManager.getUnifiedActivities(startDate, endDate, undefined);
        const validationResults = await context.activityValidationService.validateBatch(activities);

        const valid: any[] = [];
        const invalid: any[] = [];

        Object.entries(validationResults).forEach(([id, result]) => {
          const activity = activities.find(a => a.id === parseInt(id));
          if (!activity) return;

          if (result.isValid) {
            if (result.warnings.length > 0) {
              valid.push({ activity, warnings: result.warnings });
            }
          } else {
            invalid.push({ activity, errors: result.errors, warnings: result.warnings });
          }
        });

        return { valid, invalid };
      } catch (error) {
        logger.error('Failed to validate activities batch:', {}, error instanceof Error ? error : undefined);
        return { valid: [], invalid: [] };
      }
    });

    // Recalculate activity durations
    // Extracted from main.ts:839-887
    ipcMain.handle('recalculate-activity-durations', async (_, startDate: string, endDate: string) => {
      try {
        if (!context.dbManager) {
          logger.error('❌ Database manager not initialized');
          return { success: false, recalculated: 0, errors: [] };
        }


        const activities = context.dbManager.getUnifiedActivities(startDate, endDate, undefined);
        let recalculated = 0;
        const errors: string[] = [];

        for (const activity of activities) {
          try {
            const start = new Date(activity.startTime).getTime();
            const end = new Date(activity.endTime).getTime();
            const calculatedDuration = Math.floor((end - start) / 1000);

            // Only update if there's a mismatch (more than 1 second tolerance)
            if (Math.abs(calculatedDuration - activity.duration) > 1) {
              const success = context.dbManager.updateUnifiedActivity({
                id: activity.id,
                sourceType: activity.sourceType,
                updates: { duration: calculatedDuration },
              });

              if (success) {
                recalculated++;
              } else {
                errors.push(`Failed to update activity ${activity.id} (${activity.sourceType})`);
              }
            }
          } catch (error) {
            errors.push(`Error processing activity ${activity.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        return { success: true, recalculated, errors };
      } catch (error) {
        logger.error('Failed to recalculate activity durations:', {}, error instanceof Error ? error : undefined);
        return {
          success: false,
          recalculated: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        };
      }
    });

    // Find zero-duration activities
    // Extracted from main.ts:890-917
    ipcMain.handle('find-zero-duration-activities', async (_, startDate: string, endDate: string, removeIfConfirmed = false) => {
      try {
        if (!context.dbManager) {
          logger.error('❌ Database manager not initialized');
          return { activities: [], removed: 0 };
        }


        const activities = context.dbManager.getUnifiedActivities(startDate, endDate, undefined);
        const zeroDuration = activities.filter(a => a.duration === 0 || a.duration < 1);

        if (removeIfConfirmed && zeroDuration.length > 0) {

          const activityIds = zeroDuration.map(a => ({ id: a.id, sourceType: a.sourceType }));
          const result = context.dbManager.bulkDeleteActivities(activityIds);

          return { activities: zeroDuration, removed: result.deleted };
        }

        return { activities: zeroDuration, removed: 0 };
      } catch (error) {
        logger.error('Failed to find zero-duration activities:', {}, error instanceof Error ? error : undefined);
        return { activities: [], removed: 0 };
      }
    });

    // Get comprehensive data quality report
    // Extracted from main.ts:920-1020
    ipcMain.handle('get-data-quality-report', async (_, startDate: string, endDate: string) => {
      try {
        if (!context.dbManager || !context.activityValidationService || !context.activityMergeService) {
          logger.error('❌ Services not initialized');
          return {
            totalActivities: 0,
            validActivities: 0,
            invalidActivities: 0,
            warningsCount: 0,
            orphanedCount: 0,
            zeroDurationCount: 0,
            gapsCount: 0,
            duplicateGroupsCount: 0,
            qualityScore: 0,
          };
        }


        const activities = context.dbManager.getUnifiedActivities(startDate, endDate, undefined);
        const validationResults = await context.activityValidationService.validateBatch(activities);

        let validCount = 0;
        let invalidCount = 0;
        let warningsCount = 0;

        Object.values(validationResults).forEach(result => {
          if (result.isValid) {
            validCount++;
            warningsCount += result.warnings.length;
          } else {
            invalidCount++;
          }
        });

        // Find orphaned activities
        const categories = await context.categoriesService?.getCategories() || [];
        const categoryIds = new Set(categories.map(c => c.id));
        const orphanedCount = activities.filter(a =>
          a.categoryId && !categoryIds.has(a.categoryId)
        ).length;

        // Find zero-duration activities
        const zeroDurationCount = activities.filter(a => a.duration === 0 || a.duration < 1).length;

        // Find gaps
        const gaps = context.activityMergeService.detectGaps(activities);
        const gapsCount = gaps.filter(g => g.duration >= 300).length; // 5 minutes minimum

        // Find duplicates
        const processedIds = new Set<string>();
        let duplicateGroupsCount = 0;

        for (const activity of activities) {
          const activityKey = `${activity.id}-${activity.sourceType}`;
          if (processedIds.has(activityKey)) continue;

          const duplicateResult = await context.activityValidationService.detectDuplicates(activity, activities);
          if (duplicateResult.isDuplicate && duplicateResult.similarity >= 80) {
            duplicateGroupsCount++;
            [activity, ...duplicateResult.duplicateActivities].forEach(a => {
              processedIds.add(`${a.id}-${a.sourceType}`);
            });
          }
        }

        // Calculate quality score (0-100)
        const totalIssues = invalidCount + orphanedCount + zeroDurationCount;
        const qualityScore = activities.length > 0
          ? Math.max(0, Math.round(100 - (totalIssues / activities.length) * 100))
          : 100;

        const report = {
          totalActivities: activities.length,
          validActivities: validCount,
          invalidActivities: invalidCount,
          warningsCount,
          orphanedCount,
          zeroDurationCount,
          gapsCount,
          duplicateGroupsCount,
          qualityScore,
        };

        return report;
      } catch (error) {
        logger.error('Failed to generate data quality report:', {}, error instanceof Error ? error : undefined);
        return {
          totalActivities: 0,
          validActivities: 0,
          invalidActivities: 0,
          warningsCount: 0,
          orphanedCount: 0,
          zeroDurationCount: 0,
          gapsCount: 0,
          duplicateGroupsCount: 0,
          qualityScore: 0,
        };
      }
    });
  }
}
