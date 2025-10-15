import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GoalWithProgress } from '../../types';

const GoalProgressWidget: React.FC = () => {
  const { t } = useTranslation();
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGoals();
    // Refresh goals every 30 seconds
    const interval = setInterval(loadGoals, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadGoals = async () => {
    try {
      if (window.electronAPI) {
        const goalsData = await window.electronAPI.goals.getTodayWithProgress();
        // Only show active goals
        const activeGoals = goalsData.filter((g: GoalWithProgress) => g.active);
        setGoals(activeGoals);
      }
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}${t('common.h')} ${mins}${t('common.m')}`;
    }
    return `${mins}${t('common.m')}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'achieved':
        return 'text-green-600';
      case 'in_progress':
        return 'text-blue-600';
      case 'exceeded':
        return 'text-red-600';
      default:
        return 'text-gray-400';
    }
  };

  const getProgressBarColor = (status: string): string => {
    switch (status) {
      case 'achieved':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'exceeded':
        return 'bg-red-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'achieved':
        return '✅';
      case 'in_progress':
        return '⏳';
      case 'exceeded':
        return '⚠️';
      case 'not_started':
        return '○';
      default:
        return '○';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('goals.todayGoals')}
        </h3>
        <div className="text-center text-gray-500 dark:text-gray-400 py-4">
          {t('goals.loadingGoals')}
        </div>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('goals.todayGoals')}
        </h3>
        <div className="text-center text-gray-500 dark:text-gray-400 py-4">
          <div className="text-3xl mb-2">🎯</div>
          <p className="text-sm">{t('goals.noActiveGoals')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('goals.todayGoals')}
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {goals.filter(g => g.status === 'achieved').length} / {goals.length}
        </span>
      </div>

      <div className="space-y-4">
        {goals.slice(0, 5).map((goal) => (
          <div key={goal.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-lg">{getStatusIcon(goal.status)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {goal.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatMinutes(goal.todayProgress?.progressMinutes || 0)} / {formatMinutes(goal.targetMinutes)}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-medium ${getStatusColor(goal.status)}`}>
                {goal.progressPercentage.toFixed(0)}%
              </span>
            </div>

            {/* Mini Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${getProgressBarColor(goal.status)}`}
                style={{
                  width: `${Math.min(goal.progressPercentage, 100)}%`,
                }}
              />
            </div>
          </div>
        ))}

        {goals.length > 5 && (
          <div className="text-center pt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              +{goals.length - 5} {t('goals.activeGoals').toLowerCase()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalProgressWidget;
