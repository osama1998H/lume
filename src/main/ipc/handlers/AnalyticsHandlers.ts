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
    ipcMain.handle('get-daily-productivity-stats', async (_, startDate: string, endDate: string) => {
      try {
        if (!context.dbManager) {
          console.error('❌ Database manager not initialized');
          return [];
        }
        const stats = context.dbManager.getDailyProductivityStats(startDate, endDate);
        console.log(`📊 Retrieved daily productivity stats for ${startDate} to ${endDate}`);
        return stats;
      } catch (error) {
        console.error('Failed to get daily productivity stats:', error);
        return [];
      }
    });

    // Get hourly patterns
    // Extracted from main.ts:532-545
    ipcMain.handle('get-hourly-patterns', async (_, days: number) => {
      try {
        if (!context.dbManager) {
          console.error('❌ Database manager not initialized');
          return [];
        }
        const patterns = context.dbManager.getHourlyPatterns(days);
        console.log(`📊 Retrieved hourly patterns for last ${days} days`);
        return patterns;
      } catch (error) {
        console.error('Failed to get hourly patterns:', error);
        return [];
      }
    });

    // Get heatmap data
    // Extracted from main.ts:547-560
    ipcMain.handle('get-heatmap-data', async (_, year: number) => {
      try {
        if (!context.dbManager) {
          console.error('❌ Database manager not initialized');
          return [];
        }
        const heatmapData = context.dbManager.getHeatmapData(year);
        console.log(`📊 Retrieved heatmap data for year ${year}`);
        return heatmapData;
      } catch (error) {
        console.error('Failed to get heatmap data:', error);
        return [];
      }
    });

    // Get weekly summary
    // Extracted from main.ts:562-597
    ipcMain.handle('get-weekly-summary', async (_, weekOffset: number) => {
      try {
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
        console.log(`📊 Retrieved weekly summary for week offset ${weekOffset}`);
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
    ipcMain.handle('get-productivity-trends', async (_, startDate: string, endDate: string, groupBy: 'day' | 'week' | 'month') => {
      try {
        if (!context.dbManager) {
          console.error('❌ Database manager not initialized');
          return [];
        }
        const trends = context.dbManager.getProductivityTrends(startDate, endDate, groupBy);
        console.log(`📊 Retrieved productivity trends for ${startDate} to ${endDate} grouped by ${groupBy}`);
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
        console.log(`📊 Retrieved ${insights.length} behavioral insights`);
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
        console.log(`📊 Retrieved analytics summary - Score: ${summary.productivityScore}`);
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
    ipcMain.handle('get-distraction-analysis', async (_, days: number) => {
      try {
        if (!context.dbManager) {
          console.error('❌ Database manager not initialized');
          return [];
        }
        const analysis = context.dbManager.getDistractionAnalysis(days);
        console.log(`📊 Retrieved distraction analysis for last ${days} days`);
        return analysis;
      } catch (error) {
        console.error('Failed to get distraction analysis:', error);
        return [];
      }
    });
  }
}
