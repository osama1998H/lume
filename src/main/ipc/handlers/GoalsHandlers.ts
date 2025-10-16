import { IpcMain } from 'electron';
import { IIPCHandlerContext, IIPCHandlerGroup } from '../types';
import type { ProductivityGoal } from '@/types';
import { logger } from '@/services/logging/Logger';

/**
 * Args interfaces for type-safe IPC communication
 */
interface AddGoalArgs {
  goal: ProductivityGoal;
}

interface UpdateGoalArgs {
  id: number;
  updates: Partial<ProductivityGoal>;
}

interface DeleteGoalArgs {
  id: number;
}

interface GetGoalProgressArgs {
  goalId: number;
  date: string;
}

interface GetGoalAchievementHistoryArgs {
  goalId: number;
  days?: number;
}

/**
 * GoalsHandlers - IPC handlers for productivity goals management
 *
 * Handles:
 * - add-goal: Create a new productivity goal
 * - update-goal: Update an existing goal
 * - delete-goal: Delete a goal
 * - get-goals: Get all goals (optionally active only)
 * - get-today-goals-with-progress: Get today's goals with progress
 * - get-goal-progress: Get progress for a specific goal on a date
 * - get-goal-achievement-history: Get achievement history for a goal
 * - get-goal-stats: Get overall goal statistics
 *
 * Dependencies: GoalsService
 */
export class GoalsHandlers implements IIPCHandlerGroup {
  register(ipcMain: IpcMain, context: IIPCHandlerContext): void {
    // Add goal
    // Extracted from main.ts:445-454
    ipcMain.handle('add-goal', async (_, args: AddGoalArgs) => {
      try {
        const { goal } = args;
        const goalId = await context.goalsService?.addGoal(goal);
        return goalId || null;
      } catch (error) {
        logger.error('Failed to add goal:', {}, error instanceof Error ? error : undefined);
        return null;
      }
    });

    // Update goal
    // Extracted from main.ts:456-464
    ipcMain.handle('update-goal', async (_, args: UpdateGoalArgs) => {
      try {
        const { id, updates } = args;
        return await context.goalsService?.updateGoal(id, updates) || false;
      } catch (error) {
        logger.error('Failed to update goal:', {}, error instanceof Error ? error : undefined);
        return false;
      }
    });

    // Delete goal
    // Extracted from main.ts:466-474
    ipcMain.handle('delete-goal', async (_, args: DeleteGoalArgs) => {
      try {
        const { id } = args;
        return await context.goalsService?.deleteGoal(id) || false;
      } catch (error) {
        logger.error('Failed to delete goal:', {}, error instanceof Error ? error : undefined);
        return false;
      }
    });

    // Get goals
    // Extracted from main.ts:476-483
    ipcMain.handle('get-goals', async (_, activeOnly = false) => {
      try {
        return await context.goalsService?.getGoals(activeOnly) || [];
      } catch (error) {
        logger.error('Failed to get goals:', {}, error instanceof Error ? error : undefined);
        return [];
      }
    });

    // Get today goals with progress
    // Extracted from main.ts:485-492
    ipcMain.handle('get-today-goals-with-progress', async () => {
      try {
        return await context.goalsService?.getTodayGoalsWithProgress() || [];
      } catch (error) {
        logger.error('Failed to get today goals with progress:', {}, error instanceof Error ? error : undefined);
        return [];
      }
    });

    // Get goal progress
    // Extracted from main.ts:494-501
    ipcMain.handle('get-goal-progress', async (_, args: GetGoalProgressArgs) => {
      try {
        const { goalId, date } = args;
        return await context.goalsService?.getGoalProgress(goalId, date) || null;
      } catch (error) {
        logger.error('Failed to get goal progress:', {}, error instanceof Error ? error : undefined);
        return null;
      }
    });

    // Get goal achievement history
    // Extracted from main.ts:503-510
    ipcMain.handle('get-goal-achievement-history', async (_, args: GetGoalAchievementHistoryArgs) => {
      try {
        const { goalId, days = 30 } = args;
        return await context.goalsService?.getGoalAchievementHistory(goalId, days) || [];
      } catch (error) {
        logger.error('Failed to get goal achievement history:', {}, error instanceof Error ? error : undefined);
        return [];
      }
    });

    // Get goal stats
    // Extracted from main.ts:512-533
    ipcMain.handle('get-goal-stats', async () => {
      try {
        return await context.goalsService?.getGoalStats() || {
          totalGoals: 0,
          activeGoals: 0,
          achievedToday: 0,
          currentStreak: 0,
          longestStreak: 0,
          achievementRate: 0,
        };
      } catch (error) {
        logger.error('Failed to get goal stats:', {}, error instanceof Error ? error : undefined);
        return {
          totalGoals: 0,
          activeGoals: 0,
          achievedToday: 0,
          currentStreak: 0,
          longestStreak: 0,
          achievementRate: 0,
        };
      }
    });
  }
}
