import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { callIPC } from '../utils/httpClient.js';

/**
 * Register goal management tools with the MCP server
 */
export function registerGoalTools(server: McpServer) {
  // Add a new goal
  server.registerTool(
    'goals_add',
    {
      description: 'Add a new productivity goal with target minutes, period, and optional notifications',
      inputSchema: {
        name: z.string().describe('Goal name'),
        description: z.string().optional().describe('Optional goal description'),
        goalType: z.enum(['daily_time', 'weekly_time', 'category', 'app_limit']).describe('Type of goal'),
        category: z.string().optional().describe('Category name (for category goals)'),
        appName: z.string().optional().describe('App name (for app_limit goals)'),
        targetMinutes: z.number().describe('Target time in minutes'),
        operator: z.enum(['gte', 'lte', 'eq']).describe('Comparison operator (gte: at least, lte: at most, eq: exactly)'),
        period: z.enum(['daily', 'weekly']).describe('Goal period'),
        active: z.boolean().optional().describe('Whether goal is active (default: true)'),
        notificationsEnabled: z.boolean().optional().describe('Enable notifications (default: true)'),
        notifyAtPercentage: z.number().optional().describe('Notify at percentage (50, 75, 90, or 100)'),
      }
    },
    async ({ name, description, goalType, category, appName, targetMinutes, operator, period, active, notificationsEnabled, notifyAtPercentage }) => {
      try {
        const goalId = await callIPC<number>('add-goal', {
          goal: {
            name,
            description: description || null,
            goalType,
            category: category || null,
            appName: appName || null,
            targetMinutes,
            operator,
            period,
            active: active !== false, // Default to true
            notificationsEnabled: notificationsEnabled !== false, // Default to true
            notifyAtPercentage: notifyAtPercentage || 100,
          }
        });

        if (!goalId) {
          throw new Error('Failed to create goal - no ID returned');
        }

        return {
          content: [{
            type: 'text',
            text: `✅ Created goal: "${name}" (ID: ${goalId})`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to create goal: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // List goals with optional filters
  server.registerTool(
    'goals_list',
    {
      description: 'List productivity goals with optional filter for active goals only',
      inputSchema: {
        activeOnly: z.boolean().optional().describe('Filter to show only active goals (default: false)'),
      }
    },
    async ({ activeOnly }) => {
      try {
        const goals = await callIPC<any[]>('get-goals', {
          activeOnly: activeOnly || false,
        });

        if (goals.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No goals found.',
            }],
          };
        }

        const formatted = JSON.stringify(goals, null, 2);
        return {
          content: [{
            type: 'text',
            text: `Found ${goals.length} goal(s):\n\n${formatted}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to list goals: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Update a goal
  server.registerTool(
    'goals_update',
    {
      description: 'Update an existing productivity goal by ID',
      inputSchema: {
        id: z.number().describe('Goal ID to update'),
        name: z.string().optional().describe('New goal name'),
        description: z.string().optional().describe('New description'),
        goalType: z.enum(['daily_time', 'weekly_time', 'category', 'app_limit']).optional().describe('New goal type'),
        category: z.string().optional().describe('New category name'),
        appName: z.string().optional().describe('New app name'),
        targetMinutes: z.number().optional().describe('New target minutes'),
        operator: z.enum(['gte', 'lte', 'eq']).optional().describe('New operator'),
        period: z.enum(['daily', 'weekly']).optional().describe('New period'),
        active: z.boolean().optional().describe('New active status'),
        notificationsEnabled: z.boolean().optional().describe('New notifications enabled status'),
        notifyAtPercentage: z.number().optional().describe('New notify at percentage'),
      }
    },
    async ({ id, name, description, goalType, category, appName, targetMinutes, operator, period, active, notificationsEnabled, notifyAtPercentage }) => {
      try {
        // Check if at least one field is provided
        if (name === undefined && description === undefined && goalType === undefined &&
            category === undefined && appName === undefined && targetMinutes === undefined &&
            operator === undefined && period === undefined && active === undefined &&
            notificationsEnabled === undefined && notifyAtPercentage === undefined) {
          return {
            content: [{
              type: 'text',
              text: 'No updates provided. Please specify at least one field to update.',
            }],
          };
        }

        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (goalType !== undefined) updates.goalType = goalType;
        if (category !== undefined) updates.category = category;
        if (appName !== undefined) updates.appName = appName;
        if (targetMinutes !== undefined) updates.targetMinutes = targetMinutes;
        if (operator !== undefined) updates.operator = operator;
        if (period !== undefined) updates.period = period;
        if (active !== undefined) updates.active = active;
        if (notificationsEnabled !== undefined) updates.notificationsEnabled = notificationsEnabled;
        if (notifyAtPercentage !== undefined) updates.notifyAtPercentage = notifyAtPercentage;

        const success = await callIPC<boolean>('update-goal', {
          id,
          updates
        });

        if (!success) {
          return {
            content: [{
              type: 'text',
              text: `❌ Goal with ID ${id} not found.`,
            }],
            isError: true,
          };
        }

        return {
          content: [{
            type: 'text',
            text: `✅ Updated goal ID ${id} successfully.`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to update goal: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Delete a goal
  server.registerTool(
    'goals_delete',
    {
      description: 'Delete a productivity goal by ID',
      inputSchema: {
        id: z.number().describe('Goal ID to delete'),
      }
    },
    async ({ id }) => {
      try {
        const success = await callIPC<boolean>('delete-goal', { id });

        if (!success) {
          return {
            content: [{
              type: 'text',
              text: `❌ Goal with ID ${id} not found.`,
            }],
            isError: true,
          };
        }

        return {
          content: [{
            type: 'text',
            text: `✅ Deleted goal ID ${id} successfully.`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to delete goal: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Get goal progress for a specific date
  server.registerTool(
    'goals_get_progress',
    {
      description: 'Get progress for a specific goal on a specific date',
      inputSchema: {
        goalId: z.number().describe('Goal ID'),
        date: z.string().describe('Date in ISO format (YYYY-MM-DD)'),
      }
    },
    async ({ goalId, date }) => {
      try {
        const progress = await callIPC<any>('get-goal-progress', {
          goalId,
          date,
        });

        if (!progress) {
          return {
            content: [{
              type: 'text',
              text: `No progress found for goal ${goalId} on ${date}.`,
            }],
          };
        }

        const formatted = JSON.stringify(progress, null, 2);
        return {
          content: [{
            type: 'text',
            text: `Progress for goal ${goalId} on ${date}:\n\n${formatted}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to get goal progress: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Get today's goals with progress
  server.registerTool(
    'goals_get_today_with_progress',
    {
      description: 'Get today\'s goals with their current progress, percentage, and status',
      inputSchema: {}
    },
    async () => {
      try {
        const goalsWithProgress = await callIPC<any[]>('get-today-goals-with-progress', {});

        if (goalsWithProgress.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No active goals for today.',
            }],
          };
        }

        const formatted = JSON.stringify(goalsWithProgress, null, 2);
        return {
          content: [{
            type: 'text',
            text: `Today's goals with progress (${goalsWithProgress.length}):\n\n${formatted}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to get today's goals: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Get goal achievement history
  server.registerTool(
    'goals_get_achievement_history',
    {
      description: 'Get achievement history for a goal over the past N days',
      inputSchema: {
        goalId: z.number().describe('Goal ID'),
        days: z.number().optional().describe('Number of days to look back (default: 30)'),
      }
    },
    async ({ goalId, days }) => {
      try {
        const history = await callIPC<any[]>('get-goal-achievement-history', {
          goalId,
          days: days || 30,
        });

        if (history.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No achievement history found for goal ${goalId}.`,
            }],
          };
        }

        const formatted = JSON.stringify(history, null, 2);
        return {
          content: [{
            type: 'text',
            text: `Achievement history for goal ${goalId} (${history.length} days):\n\n${formatted}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to get achievement history: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Get goal statistics
  server.registerTool(
    'goals_stats',
    {
      description: 'Get overall goal statistics including total, active, achieved today, streaks, and achievement rate',
      inputSchema: {}
    },
    async () => {
      try {
        const stats = await callIPC<any>('get-goal-stats', {});

        return {
          content: [{
            type: 'text',
            text: `📊 Goal Statistics:
- Total Goals: ${stats.totalGoals || 0}
- Active Goals: ${stats.activeGoals || 0}
- Achieved Today: ${stats.achievedToday || 0}
- Current Streak: ${stats.currentStreak || 0} days
- Longest Streak: ${stats.longestStreak || 0} days
- Achievement Rate: ${stats.achievementRate || 0}%`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to get goal stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );
}
