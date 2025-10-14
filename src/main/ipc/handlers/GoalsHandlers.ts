import { IpcMain } from 'electron';
import { IIPCHandlerContext, IIPCHandlerGroup } from '../types';

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
    ipcMain.handle('add-goal', async (_, goal) => {
      try {
        console.log('➕ Adding goal:', goal);
        const goalId = await context.goalsService?.addGoal(goal);
        return goalId || null;
      } catch (error) {
        console.error('Failed to add goal:', error);
        return null;
      }
    });

    // Update goal
    // Extracted from main.ts:456-464
    ipcMain.handle('update-goal', async (_, id: number, updates: any) => {
      try {
        console.log('📝 Updating goal:', id, updates);
        return await context.goalsService?.updateGoal(id, updates) || false;
      } catch (error) {
        console.error('Failed to update goal:', error);
        return false;
      }
    });

    // Delete goal
    // Extracted from main.ts:466-474
    ipcMain.handle('delete-goal', async (_, id: number) => {
      try {
        console.log('🗑️  Deleting goal:', id);
        return await context.goalsService?.deleteGoal(id) || false;
      } catch (error) {
        console.error('Failed to delete goal:', error);
        return false;
      }
    });

    // Get goals
    // Extracted from main.ts:476-483
    ipcMain.handle('get-goals', async (_, activeOnly = false) => {
      try {
        return await context.goalsService?.getGoals(activeOnly) || [];
      } catch (error) {
        console.error('Failed to get goals:', error);
        return [];
      }
    });

    // Get today goals with progress
    // Extracted from main.ts:485-492
    ipcMain.handle('get-today-goals-with-progress', async () => {
      try {
        return await context.goalsService?.getTodayGoalsWithProgress() || [];
      } catch (error) {
        console.error('Failed to get today goals with progress:', error);
        return [];
      }
    });

    // Get goal progress
    // Extracted from main.ts:494-501
    ipcMain.handle('get-goal-progress', async (_, goalId: number, date: string) => {
      try {
        return await context.goalsService?.getGoalProgress(goalId, date) || null;
      } catch (error) {
        console.error('Failed to get goal progress:', error);
        return null;
      }
    });

    // Get goal achievement history
    // Extracted from main.ts:503-510
    ipcMain.handle('get-goal-achievement-history', async (_, goalId: number, days = 30) => {
      try {
        return await context.goalsService?.getGoalAchievementHistory(goalId, days) || [];
      } catch (error) {
        console.error('Failed to get goal achievement history:', error);
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
        console.error('Failed to get goal stats:', error);
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
