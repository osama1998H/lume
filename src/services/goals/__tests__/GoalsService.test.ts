import { GoalsService } from '../GoalsService';
import { ProductivityGoal, GoalWithProgress } from '../../../types';

// Mock DatabaseManager
jest.mock('../../../database/DatabaseManager');
jest.mock('../../notifications/NotificationService');

describe('GoalsService', () => {
  let service: GoalsService;
  let mockDb: any;
  let mockNotificationService: any;
  let consoleLog: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLog = jest.spyOn(console, 'log').mockImplementation();

    mockDb = {
      addGoal: jest.fn(),
      updateGoal: jest.fn(),
      deleteGoal: jest.fn(),
      getGoals: jest.fn(),
      updateGoalProgress: jest.fn(),
      getTodayGoalsWithProgress: jest.fn(),
      getGoalProgress: jest.fn(),
      getGoalAchievementHistory: jest.fn(),
      getGoalStats: jest.fn(),
      queryTotalActiveTime: jest.fn(),
      queryCategoryTime: jest.fn(),
      queryAppTime: jest.fn(),
    };

    mockNotificationService = {
      showNotification: jest.fn(),
    };

    service = new GoalsService(mockDb, mockNotificationService);
  });

  afterEach(() => {
    consoleLog.mockRestore();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with database manager', () => {
      expect(service).toBeDefined();
    });

    it('should initialize without notification service', () => {
      const serviceWithoutNotifications = new GoalsService(mockDb);
      expect(serviceWithoutNotifications).toBeDefined();
    });

    it('should allow setting notification service later', () => {
      const serviceWithoutNotifications = new GoalsService(mockDb);
      serviceWithoutNotifications.setNotificationService(mockNotificationService);
      // Service should accept notification service without error
      expect(serviceWithoutNotifications).toBeDefined();
    });
  });

  describe('CRUD Operations', () => {
    describe('addGoal', () => {
      it('should add a new goal successfully', async () => {
        const goal: ProductivityGoal = {
          name: 'Daily coding',
          goalType: 'daily_time',
          targetMinutes: 240,
          operator: 'gte',
          period: 'daily',
          active: true,
          notificationsEnabled: true,
          notifyAtPercentage: 100,
        };

        mockDb.addGoal.mockResolvedValue(1);

        const goalId = await service.addGoal(goal);

        expect(goalId).toBe(1);
        expect(mockDb.addGoal).toHaveBeenCalledWith(goal);
        expect(consoleLog).toHaveBeenCalledWith(
          expect.stringContaining('Goal created')
        );
      });

      it('should handle errors when adding goal', async () => {
        const goal: ProductivityGoal = {
          name: 'Test Goal',
          goalType: 'daily_time',
          targetMinutes: 60,
          operator: 'gte',
          period: 'daily',
          active: true,
          notificationsEnabled: true,
          notifyAtPercentage: 100,
        };

        mockDb.addGoal.mockRejectedValue(new Error('Database error'));
        const consoleError = jest.spyOn(console, 'error').mockImplementation();

        await expect(service.addGoal(goal)).rejects.toThrow('Database error');
        expect(consoleError).toHaveBeenCalledWith('Failed to add goal:', expect.any(Error));

        consoleError.mockRestore();
      });
    });

    describe('updateGoal', () => {
      it('should update an existing goal', async () => {
        mockDb.updateGoal.mockResolvedValue(true);

        const success = await service.updateGoal(1, { targetMinutes: 300 });

        expect(success).toBe(true);
        expect(mockDb.updateGoal).toHaveBeenCalledWith(1, { targetMinutes: 300 });
      });

      it('should handle update failure', async () => {
        mockDb.updateGoal.mockResolvedValue(false);

        const success = await service.updateGoal(999, { targetMinutes: 300 });

        expect(success).toBe(false);
      });
    });

    describe('deleteGoal', () => {
      it('should delete a goal and clear notification history', async () => {
        mockDb.deleteGoal.mockResolvedValue(true);

        const success = await service.deleteGoal(1);

        expect(success).toBe(true);
        expect(mockDb.deleteGoal).toHaveBeenCalledWith(1);
      });

      it('should handle deletion failure', async () => {
        mockDb.deleteGoal.mockResolvedValue(false);

        const success = await service.deleteGoal(999);

        expect(success).toBe(false);
      });
    });

    describe('getGoals', () => {
      it('should retrieve all goals', async () => {
        const mockGoals: ProductivityGoal[] = [
          {
            id: 1,
            name: 'Goal 1',
            goalType: 'daily_time',
            targetMinutes: 120,
            operator: 'gte',
            period: 'daily',
            active: true,
            notificationsEnabled: true,
            notifyAtPercentage: 100,
          },
        ];

        mockDb.getGoals.mockResolvedValue(mockGoals);

        const goals = await service.getGoals();

        expect(goals).toEqual(mockGoals);
        expect(mockDb.getGoals).toHaveBeenCalledWith(false);
      });

      it('should retrieve only active goals', async () => {
        const mockGoals: ProductivityGoal[] = [
          {
            id: 1,
            name: 'Active Goal',
            goalType: 'daily_time',
            targetMinutes: 120,
            operator: 'gte',
            period: 'daily',
            active: true,
            notificationsEnabled: true,
            notifyAtPercentage: 100,
          },
        ];

        mockDb.getGoals.mockResolvedValue(mockGoals);

        const goals = await service.getGoals(true);

        expect(goals).toEqual(mockGoals);
        expect(mockDb.getGoals).toHaveBeenCalledWith(true);
      });
    });
  });

  describe('Progress Tracking', () => {
    describe('getTodayGoalsWithProgress', () => {
      it('should retrieve goals with progress data', async () => {
        const mockGoalsWithProgress: GoalWithProgress[] = [
          {
            id: 1,
            name: 'Daily Coding',
            goalType: 'daily_time',
            targetMinutes: 240,
            operator: 'gte',
            period: 'daily',
            active: true,
            notificationsEnabled: true,
            notifyAtPercentage: 100,
            progressPercentage: 50,
            timeRemaining: 120,
            status: 'in_progress',
            todayProgress: {
              goalId: 1,
              date: '2025-01-01',
              progressMinutes: 120,
              achieved: false,
              notified: false,
            },
          },
        ];

        mockDb.getTodayGoalsWithProgress.mockResolvedValue(mockGoalsWithProgress);

        const goals = await service.getTodayGoalsWithProgress();

        expect(goals).toEqual(mockGoalsWithProgress);
      });
    });

    describe('updateGoalProgress', () => {
      it('should update progress for a goal', async () => {
        mockDb.updateGoalProgress.mockResolvedValue(undefined);
        mockDb.getGoals.mockResolvedValue([
          {
            id: 1,
            name: 'Test Goal',
            goalType: 'daily_time',
            targetMinutes: 240,
            operator: 'gte',
            period: 'daily',
            active: true,
            notificationsEnabled: false,
            notifyAtPercentage: 100,
          },
        ]);

        await service.updateGoalProgress(1, '2025-01-01', 120);

        expect(mockDb.updateGoalProgress).toHaveBeenCalledWith(1, '2025-01-01', 120);
        expect(consoleLog).toHaveBeenCalledWith(
          expect.stringContaining('Progress updated')
        );
      });
    });

    describe('recalculateAllGoalProgress', () => {
      it('should recalculate progress for all active goals', async () => {
        const today = new Date().toISOString().split('T')[0];
        const mockGoals: ProductivityGoal[] = [
          {
            id: 1,
            name: 'Daily Time',
            goalType: 'daily_time',
            targetMinutes: 240,
            operator: 'gte',
            period: 'daily',
            active: true,
            notificationsEnabled: true,
            notifyAtPercentage: 100,
          },
        ];

        mockDb.getGoals.mockResolvedValue(mockGoals);
        mockDb.updateGoalProgress.mockResolvedValue(undefined);

        // Mock the database query for calculateTotalActiveTime
        mockDb.queryTotalActiveTime.mockReturnValue(120); // 2 hours = 120 minutes

        await service.recalculateAllGoalProgress();

        expect(mockDb.getGoals).toHaveBeenCalledWith(true);
        expect(mockDb.updateGoalProgress).toHaveBeenCalledWith(1, today, 120);
      });

      it('should skip goals without ID', async () => {
        const mockGoals: ProductivityGoal[] = [
          {
            name: 'Goal without ID',
            goalType: 'daily_time',
            targetMinutes: 240,
            operator: 'gte',
            period: 'daily',
            active: true,
            notificationsEnabled: true,
            notifyAtPercentage: 100,
          },
        ];

        mockDb.getGoals.mockResolvedValue(mockGoals);

        await service.recalculateAllGoalProgress();

        expect(mockDb.updateGoalProgress).not.toHaveBeenCalled();
      });
    });
  });

  describe('Progress Calculation', () => {
    beforeEach(() => {
      // Mock database query methods
      mockDb.queryTotalActiveTime.mockReturnValue(60); // 1 hour = 60 minutes
      mockDb.queryCategoryTime.mockReturnValue(60);
      mockDb.queryAppTime.mockReturnValue(60);
    });

    it('should calculate progress for daily_time goal', async () => {
      const goal: ProductivityGoal = {
        id: 1,
        name: 'Daily Time',
        goalType: 'daily_time',
        targetMinutes: 240,
        operator: 'gte',
        period: 'daily',
        active: true,
        notificationsEnabled: true,
        notifyAtPercentage: 100,
      };

      mockDb.getGoals.mockResolvedValue([goal]);
      mockDb.updateGoalProgress.mockResolvedValue(undefined);

      await service.recalculateAllGoalProgress();

      expect(mockDb.updateGoalProgress).toHaveBeenCalledWith(
        1,
        expect.any(String),
        60
      );
    });

    it('should calculate progress for category goal', async () => {
      const goal: ProductivityGoal = {
        id: 1,
        name: 'Coding Time',
        goalType: 'category',
        category: 'Development',
        targetMinutes: 240,
        operator: 'gte',
        period: 'daily',
        active: true,
        notificationsEnabled: true,
        notifyAtPercentage: 100,
      };

      mockDb.getGoals.mockResolvedValue([goal]);
      mockDb.updateGoalProgress.mockResolvedValue(undefined);

      await service.recalculateAllGoalProgress();

      expect(mockDb.updateGoalProgress).toHaveBeenCalled();
    });

    it('should calculate progress for app_limit goal', async () => {
      const goal: ProductivityGoal = {
        id: 1,
        name: 'Social Media Limit',
        goalType: 'app_limit',
        appName: 'Twitter',
        targetMinutes: 30,
        operator: 'lte',
        period: 'daily',
        active: true,
        notificationsEnabled: true,
        notifyAtPercentage: 100,
      };

      mockDb.getGoals.mockResolvedValue([goal]);
      mockDb.updateGoalProgress.mockResolvedValue(undefined);

      await service.recalculateAllGoalProgress();

      expect(mockDb.updateGoalProgress).toHaveBeenCalled();
    });
  });

  describe('Notification Logic', () => {
    it('should send notification at configured percentage', async () => {
      const goal: ProductivityGoal = {
        id: 1,
        name: 'Test Goal',
        goalType: 'daily_time',
        targetMinutes: 100,
        operator: 'gte',
        period: 'daily',
        active: true,
        notificationsEnabled: true,
        notifyAtPercentage: 50,
      };

      mockDb.getGoals.mockResolvedValue([goal]);
      mockDb.updateGoalProgress.mockResolvedValue(undefined);

      await service.updateGoalProgress(1, '2025-01-01', 50); // 50% progress

      expect(mockNotificationService.showNotification).toHaveBeenCalled();
    });

    it('should not send duplicate notifications', async () => {
      const goal: ProductivityGoal = {
        id: 1,
        name: 'Test Goal',
        goalType: 'daily_time',
        targetMinutes: 100,
        operator: 'gte',
        period: 'daily',
        active: true,
        notificationsEnabled: true,
        notifyAtPercentage: 50,
      };

      mockDb.getGoals.mockResolvedValue([goal]);
      mockDb.updateGoalProgress.mockResolvedValue(undefined);

      // First update - should notify
      await service.updateGoalProgress(1, '2025-01-01', 50);

      // Second update with same progress - should not notify again
      await service.updateGoalProgress(1, '2025-01-01', 55);

      expect(mockNotificationService.showNotification).toHaveBeenCalledTimes(1);
    });

    it('should not send notification when notifications disabled', async () => {
      const goal: ProductivityGoal = {
        id: 1,
        name: 'Test Goal',
        goalType: 'daily_time',
        targetMinutes: 100,
        operator: 'gte',
        period: 'daily',
        active: true,
        notificationsEnabled: false,
        notifyAtPercentage: 50,
      };

      mockDb.getGoals.mockResolvedValue([goal]);
      mockDb.updateGoalProgress.mockResolvedValue(undefined);

      await service.updateGoalProgress(1, '2025-01-01', 50);

      expect(mockNotificationService.showNotification).not.toHaveBeenCalled();
    });

    it('should send achievement notification at 100%', async () => {
      const goal: ProductivityGoal = {
        id: 1,
        name: 'Test Goal',
        goalType: 'daily_time',
        targetMinutes: 100,
        operator: 'gte',
        period: 'daily',
        active: true,
        notificationsEnabled: true,
        notifyAtPercentage: 100,
      };

      mockDb.getGoals.mockResolvedValue([goal]);
      mockDb.updateGoalProgress.mockResolvedValue(undefined);

      await service.updateGoalProgress(1, '2025-01-01', 100);

      expect(mockNotificationService.showNotification).toHaveBeenCalled();
    });

    it('should send exceeded notification for limit goals', async () => {
      const goal: ProductivityGoal = {
        id: 1,
        name: 'Social Media Limit',
        goalType: 'app_limit',
        appName: 'Twitter',
        targetMinutes: 30,
        operator: 'lte',
        period: 'daily',
        active: true,
        notificationsEnabled: true,
        notifyAtPercentage: 100,
      };

      mockDb.getGoals.mockResolvedValue([goal]);
      mockDb.updateGoalProgress.mockResolvedValue(undefined);

      await service.updateGoalProgress(1, '2025-01-01', 40); // Exceeded limit

      expect(mockNotificationService.showNotification).toHaveBeenCalled();
    });
  });

  describe('Status Determination', () => {
    it('should return not_started for 0 progress', () => {
      const status = service.determineGoalStatus('gte', 0, 100);
      expect(status).toBe('not_started');
    });

    it('should return in_progress for partial progress', () => {
      const status = service.determineGoalStatus('gte', 50, 100);
      expect(status).toBe('in_progress');
    });

    it('should return achieved for target goals at 100%', () => {
      const status = service.determineGoalStatus('gte', 100, 100);
      expect(status).toBe('achieved');
    });

    it('should return exceeded for limit goals over 100%', () => {
      const status = service.determineGoalStatus('lte', 120, 100);
      expect(status).toBe('exceeded');
    });

    it('should return achieved for exact goals at target', () => {
      const status = service.determineGoalStatus('eq', 100, 100);
      expect(status).toBe('achieved');
    });

    it('should return exceeded for exact goals over target', () => {
      const status = service.determineGoalStatus('eq', 120, 100);
      expect(status).toBe('exceeded');
    });
  });

  describe('Utility Methods', () => {
    describe('clearNotificationHistory', () => {
      it('should clear notification history', () => {
        service.clearNotificationHistory();
        expect(consoleLog).toHaveBeenCalledWith(
          expect.stringContaining('Notification history cleared')
        );
      });
    });

    describe('getGoalsNeedingAttention', () => {
      it('should return goals needing attention', async () => {
        const mockGoals: GoalWithProgress[] = [
          {
            id: 1,
            name: 'Test Goal',
            goalType: 'daily_time',
            targetMinutes: 100,
            operator: 'gte',
            period: 'daily',
            active: true,
            notificationsEnabled: true,
            notifyAtPercentage: 75,
            progressPercentage: 80,
            timeRemaining: 20,
            status: 'in_progress',
            todayProgress: {
              goalId: 1,
              date: '2025-01-01',
              progressMinutes: 80,
              achieved: false,
              notified: false,
            },
          },
        ];

        mockDb.getTodayGoalsWithProgress.mockResolvedValue(mockGoals);

        const needsAttention = await service.getGoalsNeedingAttention();

        expect(needsAttention).toHaveLength(1);
        expect(needsAttention[0]!.goalId).toBe(1);
      });

      it('should not include goals below notification threshold', async () => {
        const mockGoals: GoalWithProgress[] = [
          {
            id: 1,
            name: 'Test Goal',
            goalType: 'daily_time',
            targetMinutes: 100,
            operator: 'gte',
            period: 'daily',
            active: true,
            notificationsEnabled: true,
            notifyAtPercentage: 75,
            progressPercentage: 50,
            timeRemaining: 50,
            status: 'in_progress',
          },
        ];

        mockDb.getTodayGoalsWithProgress.mockResolvedValue(mockGoals);

        const needsAttention = await service.getGoalsNeedingAttention();

        expect(needsAttention).toHaveLength(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.getGoals.mockRejectedValue(new Error('Database connection failed'));
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      await expect(service.getGoals()).rejects.toThrow('Database connection failed');
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });

    it('should handle errors in progress calculation', async () => {
      const goal: ProductivityGoal = {
        id: 1,
        name: 'Test Goal',
        goalType: 'daily_time',
        targetMinutes: 240,
        operator: 'gte',
        period: 'daily',
        active: true,
        notificationsEnabled: true,
        notifyAtPercentage: 100,
      };

      mockDb.getGoals.mockResolvedValue([goal]);
      mockDb.queryTotalActiveTime.mockImplementation(() => {
        throw new Error('Query failed');
      });

      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      await service.recalculateAllGoalProgress();

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });
});
