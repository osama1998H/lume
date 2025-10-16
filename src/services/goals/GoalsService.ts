import { DatabaseManager } from '@/database/DatabaseManager';
import { NotificationService } from '../notifications/NotificationService';
import { logger } from '@/services/logging/Logger';
import {
  ProductivityGoal,
  GoalProgress,
  GoalWithProgress,
  GoalStats,
  GoalStatus,
  GoalOperator,
} from '@/types';

export interface GoalNotificationInfo {
  goalId: number;
  goalName: string;
  percentage: number;
  progressMinutes: number;
  targetMinutes: number;
}

export class GoalsService {
  private db: DatabaseManager;
  private notificationService: NotificationService | null = null;
  private notificationHistory: Map<string, Set<number>> = new Map(); // goalId+date -> Set<percentages notified>

  constructor(db: DatabaseManager, notificationService?: NotificationService) {
    this.db = db;
    this.notificationService = notificationService || null;
  }

  /**
   * Set or update notification service
   */
  setNotificationService(notificationService: NotificationService): void {
    this.notificationService = notificationService;
  }

  /**
   * Add a new productivity goal
   */
  async addGoal(goal: ProductivityGoal): Promise<number> {
    try {
      const goalId = await this.db.addGoal(goal);
      return goalId;
    } catch (error) {
      logger.error('Failed to add goal', {
        goalName: goal.name,
        goalType: goal.goalType,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Update an existing goal
   */
  async updateGoal(id: number, updates: Partial<ProductivityGoal>): Promise<boolean> {
    try {
      const success = await this.db.updateGoal(id, updates);
      return success;
    } catch (error) {
      logger.error('Failed to update goal', {
        goalId: id,
        updates: JSON.stringify(updates),
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Delete a goal
   */
  async deleteGoal(id: number): Promise<boolean> {
    try {
      const success = await this.db.deleteGoal(id);
      if (success) {
        // Clear notification history for this goal
        const keysToDelete: string[] = [];
        this.notificationHistory.forEach((_, key) => {
          if (key.startsWith(`${id}_`)) {
            keysToDelete.push(key);
          }
        });
        keysToDelete.forEach(key => this.notificationHistory.delete(key));
      }
      return success;
    } catch (error) {
      logger.error('Failed to delete goal', {
        goalId: id,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Get all goals or only active goals
   */
  async getGoals(activeOnly: boolean = false): Promise<ProductivityGoal[]> {
    try {
      return await this.db.getGoals(activeOnly);
    } catch (error) {
      logger.error('Failed to get goals', {
        activeOnly,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Get a specific goal by ID
   */
  async getGoalById(id: number): Promise<ProductivityGoal | null> {
    try {
      const goals = await this.db.getGoals();
      return goals.find((g: ProductivityGoal) => g.id === id) || null;
    } catch (error) {
      logger.error('Failed to get goal by id', {
        goalId: id,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      return null;
    }
  }

  /**
   * Get today's goals with calculated progress
   */
  async getTodayGoalsWithProgress(): Promise<GoalWithProgress[]> {
    try {
      return await this.db.getTodayGoalsWithProgress();
    } catch (error) {
      logger.error('Failed to get goals with progress', {
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Get progress for a specific goal and date
   */
  async getGoalProgress(goalId: number, date: string): Promise<GoalProgress | null> {
    try {
      return await this.db.getGoalProgress(goalId, date);
    } catch (error) {
      logger.error('Failed to get goal progress', {
        goalId,
        date,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Get achievement history for a goal
   */
  async getGoalAchievementHistory(goalId: number, days: number = 30): Promise<GoalProgress[]> {
    try {
      return await this.db.getGoalAchievementHistory(goalId, days);
    } catch (error) {
      logger.error('Failed to get achievement history', {
        goalId,
        days,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Get comprehensive goal statistics
   */
  async getGoalStats(): Promise<GoalStats> {
    try {
      return await this.db.getGoalStats();
    } catch (error) {
      logger.error('Failed to get goal stats', {
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Update progress for a specific goal
   * This should be called when activity tracking data changes
   */
  async updateGoalProgress(goalId: number, date: string, progressMinutes: number): Promise<void> {
    try {
      await this.db.updateGoalProgress(goalId, date, progressMinutes);

      // Check if we need to send notifications
      await this.checkAndNotifyGoalProgress(goalId, date, progressMinutes);
    } catch (error) {
      logger.error('Failed to update goal progress', {
        goalId,
        date,
        progressMinutes,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Calculate progress for all active goals based on current activity data
   * This should be called periodically by ActivityTrackingService
   */
  async recalculateAllGoalProgress(): Promise<void> {
    let activeGoalCount = 0;
    try {
      const todayValue = new Date().toISOString().split('T')[0];
      if (!todayValue) {
        throw new Error('Failed to get today\'s date');
      }
      const today = todayValue;
      const activeGoals = await this.getGoals(true);
      activeGoalCount = activeGoals.length;

      for (const goal of activeGoals) {
        if (!goal.id) continue;

        const progressMinutes = await this.calculateGoalProgress(goal, today);
        await this.updateGoalProgress(goal.id, today, progressMinutes);
      }
    } catch (error) {
      logger.error('Failed to recalculate goal progress', {
        activeGoalCount,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Calculate progress minutes for a specific goal based on activity data
   */
  private async calculateGoalProgress(goal: ProductivityGoal, date: string): Promise<number> {
    try {
      const startOfDay = `${date} 00:00:00`;
      const endOfDay = `${date} 23:59:59`;

      switch (goal.goalType) {
        case 'daily_time':
          // Total active time for the day
          return await this.calculateTotalActiveTime(startOfDay, endOfDay);

        case 'category':
          // Time spent in specific category
          if (!goal.category) return 0;
          return await this.calculateCategoryTime(goal.category, startOfDay, endOfDay);

        case 'app_limit':
          // Time spent on specific app
          if (!goal.appName) return 0;
          return await this.calculateAppTime(goal.appName, startOfDay, endOfDay);

        case 'weekly_time': {
          // For weekly goals, calculate from start of week
          const startOfWeek = this.getStartOfWeek(date);
          return await this.calculateTotalActiveTime(startOfWeek, endOfDay);
        }

        default:
          logger.warn('Unknown goal type encountered', {
            goalId: goal.id,
            goalType: goal.goalType
          });
          return 0;
      }
    } catch (error) {
      logger.error('Failed to calculate goal progress', {
        goalId: goal.id,
        goalType: goal.goalType,
        date,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      return 0;
    }
  }

  /**
   * Calculate total active time between two timestamps
   */
  private async calculateTotalActiveTime(startTime: string, endTime: string): Promise<number> {
    try {
      return this.db.queryTotalActiveTime(startTime, endTime);
    } catch (error) {
      logger.error('Failed to calculate total active time', {
        startTime,
        endTime,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      return 0;
    }
  }

  /**
   * Calculate time spent in a specific category
   */
  private async calculateCategoryTime(category: string, startTime: string, endTime: string): Promise<number> {
    try {
      return this.db.queryCategoryTime(category, startTime, endTime);
    } catch (error) {
      logger.error('Failed to calculate category time', {
        category,
        startTime,
        endTime,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      return 0;
    }
  }

  /**
   * Calculate time spent on a specific app
   */
  private async calculateAppTime(appName: string, startTime: string, endTime: string): Promise<number> {
    try {
      return this.db.queryAppTime(appName, startTime, endTime);
    } catch (error) {
      logger.error('Failed to calculate app time', {
        appName,
        startTime,
        endTime,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      return 0;
    }
  }

  /**
   * Get start of week (Monday) for a given date
   */
  private getStartOfWeek(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(date.setDate(diff));
    const mondayDateValue = monday.toISOString().split('T')[0];
    if (!mondayDateValue) {
      throw new Error('Failed to get Monday date');
    }
    return `${mondayDateValue} 00:00:00`;
  }

  /**
   * Check if goal progress warrants a notification and send it
   */
  private async checkAndNotifyGoalProgress(goalId: number, date: string, progressMinutes: number): Promise<void> {
    try {
      const goal = await this.getGoalById(goalId);

      if (!goal || !goal.active || !goal.notificationsEnabled || !this.notificationService) {
        return;
      }

      const percentage = Math.round((progressMinutes / goal.targetMinutes) * 100);
      const notificationKey = `${goalId}_${date}`;

      // Get or create notification history for this goal+date
      if (!this.notificationHistory.has(notificationKey)) {
        this.notificationHistory.set(notificationKey, new Set());
      }
      const notifiedPercentages = this.notificationHistory.get(notificationKey)!;

      // Check if we should notify at the configured percentage
      const shouldNotify = this.shouldSendNotification(
        goal.notifyAtPercentage,
        percentage,
        notifiedPercentages
      );

      if (shouldNotify) {
        this.sendGoalNotification(goal, percentage, progressMinutes);
        notifiedPercentages.add(goal.notifyAtPercentage);
      }

      // Check for achievement (100%)
      if (percentage >= 100 && !notifiedPercentages.has(100)) {
        this.sendGoalAchievementNotification(goal, progressMinutes);
        notifiedPercentages.add(100);
      }

      // Check for goal exceeded (for limits with 'lte' operator)
      if (goal.operator === 'lte' && percentage > 100 && !notifiedPercentages.has(150)) {
        this.sendGoalExceededNotification(goal, progressMinutes);
        notifiedPercentages.add(150); // Use 150 as a marker for "exceeded" notification
      }
    } catch (error) {
      logger.error('Failed to check and notify goal progress', {
        goalId,
        date,
        progressMinutes,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
    }
  }

  /**
   * Determine if a notification should be sent based on percentage thresholds
   */
  private shouldSendNotification(
    targetPercentage: number,
    currentPercentage: number,
    notifiedPercentages: Set<number>
  ): boolean {
    // If already notified at this threshold, skip
    if (notifiedPercentages.has(targetPercentage)) {
      return false;
    }

    // If current percentage meets or exceeds target, notify
    return currentPercentage >= targetPercentage;
  }

  /**
   * Send goal progress notification
   */
  private sendGoalNotification(goal: ProductivityGoal, percentage: number, progressMinutes: number): void {
    if (!this.notificationService) return;

    const remaining = goal.targetMinutes - progressMinutes;
    const isLimit = goal.operator === 'lte';

    let title = '';
    let body = '';

    if (isLimit) {
      // For limits (e.g., "Spend ≤ 2 hours on social media")
      title = `⚠️ Goal Alert: ${goal.name}`;
      body = `You've used ${progressMinutes} of ${goal.targetMinutes} minutes (${percentage}%). ${remaining > 0 ? `${remaining} minutes remaining.` : 'Limit reached!'}`;
    } else {
      // For targets (e.g., "Spend ≥ 4 hours coding")
      title = `🎯 Goal Progress: ${goal.name}`;
      body = `You've completed ${progressMinutes} of ${goal.targetMinutes} minutes (${percentage}%). ${remaining > 0 ? `${remaining} minutes to go!` : 'Goal achieved!'}`;
    }

    this.notificationService.showNotification('sessionComplete', { title, body });
  }

  /**
   * Send goal achievement notification
   */
  private sendGoalAchievementNotification(goal: ProductivityGoal, progressMinutes: number): void {
    if (!this.notificationService) return;

    const isLimit = goal.operator === 'lte';

    if (isLimit) {
      // Reaching a limit goal exactly
      this.notificationService.showNotification('sessionComplete', {
        title: `✅ Limit Reached: ${goal.name}`,
        body: `You've reached your ${goal.targetMinutes} minute limit. Consider taking a break!`,
      });
    } else {
      // Achieving a target goal
      this.notificationService.showNotification('sessionComplete', {
        title: `🎉 Goal Achieved: ${goal.name}`,
        body: `Congratulations! You've completed ${progressMinutes} minutes. Keep up the great work!`,
      });
    }

  }

  /**
   * Send notification when a limit goal is exceeded
   */
  private sendGoalExceededNotification(goal: ProductivityGoal, progressMinutes: number): void {
    if (!this.notificationService) return;

    const excess = progressMinutes - goal.targetMinutes;

    this.notificationService.showNotification('sessionComplete', {
      title: `🚨 Limit Exceeded: ${goal.name}`,
      body: `You've exceeded your limit by ${excess} minutes. Time to switch activities!`,
    });

  }

  /**
   * Clear notification history (useful for testing or daily reset)
   */
  clearNotificationHistory(): void {
    this.notificationHistory.clear();
  }

  /**
   * Get notification info for all goals (useful for UI display)
   */
  async getGoalsNeedingAttention(): Promise<GoalNotificationInfo[]> {
    try {
      const goalsWithProgress = await this.getTodayGoalsWithProgress();
      const needsAttention: GoalNotificationInfo[] = [];

      for (const goal of goalsWithProgress) {
        if (!goal.notificationsEnabled || !goal.id) continue;

        const percentage = goal.progressPercentage;

        // Check if goal is at or near notification threshold
        if (
          percentage >= goal.notifyAtPercentage ||
          (goal.operator === 'lte' && percentage > 100)
        ) {
          needsAttention.push({
            goalId: goal.id,
            goalName: goal.name,
            percentage,
            progressMinutes: goal.todayProgress?.progressMinutes || 0,
            targetMinutes: goal.targetMinutes,
          });
        }
      }

      return needsAttention;
    } catch (error) {
      logger.error('Failed to get goals needing attention', {
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      return [];
    }
  }

  /**
   * Determine goal status based on operator and progress
   */
  determineGoalStatus(
    operator: GoalOperator,
    progressMinutes: number,
    targetMinutes: number
  ): GoalStatus {
    if (progressMinutes === 0) {
      return 'not_started';
    }

    const percentage = (progressMinutes / targetMinutes) * 100;

    switch (operator) {
      case 'gte':
        // Target goal (e.g., "Spend ≥ 4 hours")
        if (percentage >= 100) return 'achieved';
        if (percentage > 0) return 'in_progress';
        return 'not_started';

      case 'lte':
        // Limit goal (e.g., "Spend ≤ 2 hours")
        if (percentage > 100) return 'exceeded';
        if (percentage === 100) return 'achieved';
        if (percentage > 0) return 'in_progress';
        return 'not_started';

      case 'eq':
        // Exact goal (e.g., "Spend = 30 minutes")
        if (percentage === 100) return 'achieved';
        if (percentage > 100) return 'exceeded';
        if (percentage > 0) return 'in_progress';
        return 'not_started';

      default:
        return 'not_started';
    }
  }
}
