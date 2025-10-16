import { IpcMain } from 'electron';
import { IIPCHandlerContext, IIPCHandlerGroup } from '../types';

/**
 * AnalyticsHandlers - IPC handlers for analytics and insights
 *
 * Handles:
 * - get-daily-productivity-stats: Get daily productivity statistics
 * - get-hourly-patterns: Get hourly usage patterns
 * - get-heatmap-data: Get activity heatmap data for a year
 * - get-weekly-summary: Get weekly summary with insights
 * - get-productivity-trends: Get productivity trends over time
 * - get-behavioral-insights: Get behavioral insights
 * - get-analytics-summary: Get overall analytics summary
 * - get-distraction-analysis: Get distraction analysis
 *
 * Dependencies: DatabaseManager
 */
export class AnalyticsHandlers implements IIPCHandlerGroup {
  register(ipcMain: IpcMain, context: IIPCHandlerContext): void {
    // Get daily productivity stats
    // Extracted from main.ts:517-530
    ipcMain.handle('get-daily-productivity-stats', async (_, args: Record<string, any>) => {
      try {
        const { startDate, endDate } = args;
        if (!context.dbManager) {
          console.error('❌ Database manager not initialized');
          return [];
        }
        const stats = context.dbManager.getDailyProductivityStats(startDate, endDate);
        return stats;
      } catch (error) {
        console.error('Failed to get daily productivity stats:', error);
        return [];
      }
    });

    // Get hourly patterns
    // Extracted from main.ts:532-545
    ipcMain.handle('get-hourly-patterns', async (_, args: Record<string, any>) => {
      try {
        const { days } = args;
        if (!context.dbManager) {
          console.error('❌ Database manager not initialized');
          return [];
        }
        const patterns = context.dbManager.getHourlyPatterns(days);
        return patterns;
      } catch (error) {
        console.error('Failed to get hourly patterns:', error);
        return [];
      }
    });

    // Get heatmap data
    // Extracted from main.ts:547-560
    ipcMain.handle('get-heatmap-data', async (_, args: Record<string, any>) => {
      try {
        const { year } = args;
        if (!context.dbManager) {
          console.error('❌ Database manager not initialized');
          return [];
        }
        const heatmapData = context.dbManager.getHeatmapData(year);
        return heatmapData;
      } catch (error) {
        console.error('Failed to get heatmap data:', error);
        return [];
      }
    });

    // Get weekly summary
    // Extracted from main.ts:562-597
    ipcMain.handle('get-weekly-summary', async (_, args: Record<string, any>) => {
      try {
        const { weekOffset } = args;
        if (!context.dbManager) {
          console.error('❌ Database manager not initialized');
          return {
            weekStart: '',
            weekEnd: '',
            totalMinutes: 0,
            avgDailyMinutes: 0,
            topDay: null,
            topCategories: [],
            goalsAchieved: 0,
            totalGoals: 0,
            comparisonToPrevious: 0,
            insights: []
          };
        }
        const summary = context.dbManager.getWeeklySummary(weekOffset);
        return summary;
      } catch (error) {
        console.error('Failed to get weekly summary:', error);
        return {
          weekStart: '',
          weekEnd: '',
          totalMinutes: 0,
          avgDailyMinutes: 0,
          topDay: null,
          topCategories: [],
          goalsAchieved: 0,
          totalGoals: 0,
          comparisonToPrevious: 0,
          insights: []
        };
      }
    });

    // Get productivity trends
    // Extracted from main.ts:599-612
    ipcMain.handle('get-productivity-trends', async (_, args: Record<string, any>) => {
      try {
        const { startDate, endDate, groupBy } = args;
        if (!context.dbManager) {
          console.error('❌ Database manager not initialized');
          return [];
        }
        const trends = context.dbManager.getProductivityTrends(startDate, endDate, groupBy);
        return trends;
      } catch (error) {
        console.error('Failed to get productivity trends:', error);
        return [];
      }
    });

    // Get behavioral insights
    // Extracted from main.ts:614-627
    ipcMain.handle('get-behavioral-insights', async () => {
      try {
        if (!context.dbManager) {
          console.error('❌ Database manager not initialized');
          return [];
        }
        const insights = context.dbManager.getBehavioralInsights();
        return insights;
      } catch (error) {
        console.error('Failed to get behavioral insights:', error);
        return [];
      }
    });

    // Get analytics summary
    // Extracted from main.ts:629-656
    ipcMain.handle('get-analytics-summary', async () => {
      try {
        if (!context.dbManager) {
          console.error('❌ Database manager not initialized');
          return {
            productivityScore: 0,
            totalProductiveMinutes: 0,
            avgDailyFocusHours: 0,
            peakHour: 9,
            mostProductiveDay: 'Monday',
            weeklyStreak: 0
          };
        }
        const summary = context.dbManager.getAnalyticsSummary();
        return summary;
      } catch (error) {
        console.error('Failed to get analytics summary:', error);
        return {
          productivityScore: 0,
          totalProductiveMinutes: 0,
          avgDailyFocusHours: 0,
          peakHour: 9,
          mostProductiveDay: 'Monday',
          weeklyStreak: 0
        };
      }
    });

    // Get distraction analysis
    // Extracted from main.ts:658-671
    ipcMain.handle('get-distraction-analysis', async (_, args: Record<string, any>) => {
      try {
        const { days } = args;
        if (!context.dbManager) {
          console.error('❌ Database manager not initialized');
          return [];
        }
        const analysis = context.dbManager.getDistractionAnalysis(days);
        return analysis;
      } catch (error) {
        console.error('Failed to get distraction analysis:', error);
        return [];
      }
    });
  }
}
