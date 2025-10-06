import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ProductivityGoal, GoalWithProgress, GoalStats, GoalType, GoalOperator, GoalPeriod, GoalStatus } from '../types';

const Goals: React.FC = () => {
  const { t } = useTranslation();
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [stats, setStats] = useState<GoalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalWithProgress | null>(null);

  useEffect(() => {
    loadGoals();
    loadStats();
  }, []);

  const loadGoals = async () => {
    try {
      if (window.electronAPI) {
        const goalsData = await window.electronAPI.getTodayGoalsWithProgress();
        setGoals(goalsData);
      }
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      if (window.electronAPI) {
        const statsData = await window.electronAPI.getGoalStats();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleCreateGoal = () => {
    setEditingGoal(null);
    setShowCreateModal(true);
  };

  const handleEditGoal = (goal: GoalWithProgress) => {
    setEditingGoal(goal);
    setShowCreateModal(true);
  };

  const handleDeleteGoal = async (goalId: number) => {
    if (!window.confirm(t('goals.confirmDelete'))) {
      return;
    }

    try {
      if (window.electronAPI) {
        const success = await window.electronAPI.deleteGoal(goalId);
        if (success) {
          await loadGoals();
          await loadStats();
        }
      }
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
  };

  const handleToggleActive = async (goal: GoalWithProgress) => {
    try {
      if (window.electronAPI && goal.id) {
        await window.electronAPI.updateGoal(goal.id, { active: !goal.active });
        await loadGoals();
        await loadStats();
      }
    } catch (error) {
      console.error('Failed to toggle goal:', error);
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

  const getStatusColor = (status: GoalStatus): string => {
    switch (status) {
      case 'achieved':
        return 'text-green-600 bg-green-100';
      case 'in_progress':
        return 'text-blue-600 bg-blue-100';
      case 'exceeded':
        return 'text-red-600 bg-red-100';
      case 'failed':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-400 bg-gray-50';
    }
  };

  const getProgressBarColor = (status: GoalStatus): string => {
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">{t('goals.loadingGoals')}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('goals.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('goals.subtitle')}
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('goals.stats.totalGoals')}
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
              {stats.totalGoals}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('goals.stats.activeGoals')}
            </div>
            <div className="text-3xl font-bold text-blue-600 mt-2">
              {stats.activeGoals}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('goals.stats.achievedToday')}
            </div>
            <div className="text-3xl font-bold text-green-600 mt-2">
              {stats.achievedToday}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('goals.stats.currentStreak')}
            </div>
            <div className="text-3xl font-bold text-purple-600 mt-2">
              {stats.currentStreak} {t('goals.stats.days')}
            </div>
          </div>
        </div>
      )}

      {/* Create Goal Button */}
      <div className="mb-6">
        <button
          onClick={handleCreateGoal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          + {t('goals.createGoal')}
        </button>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="text-gray-400 text-lg mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('goals.noGoals')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('goals.noGoalsPrompt')}
          </p>
          <button
            onClick={handleCreateGoal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            {t('goals.createGoal')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {goal.name}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        goal.status
                      )}`}
                    >
                      {t(`goals.status${goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}`)}
                    </span>
                  </div>
                  {goal.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {goal.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>
                      {t(`goals.goalType${goal.goalType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`)}
                    </span>
                    <span>•</span>
                    <span>
                      {t(`goals.operator${goal.operator.charAt(0).toUpperCase() + goal.operator.slice(1)}`)} {formatMinutes(goal.targetMinutes)}
                    </span>
                    {goal.category && (
                      <>
                        <span>•</span>
                        <span>{goal.category}</span>
                      </>
                    )}
                    {goal.appName && (
                      <>
                        <span>•</span>
                        <span>{goal.appName}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(goal)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      goal.active
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {goal.active ? t('goals.active') : t('settings.stopped')}
                  </button>
                  <button
                    onClick={() => handleEditGoal(goal)}
                    className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => goal.id && handleDeleteGoal(goal.id)}
                    className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('goals.progress')}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatMinutes(goal.todayProgress?.progressMinutes || 0)} / {formatMinutes(goal.targetMinutes)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${getProgressBarColor(
                      goal.status
                    )}`}
                    style={{
                      width: `${Math.min(goal.progressPercentage, 100)}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{goal.progressPercentage.toFixed(0)}%</span>
                  {goal.timeRemaining > 0 && goal.operator === 'gte' && (
                    <span>
                      {formatMinutes(goal.timeRemaining)} {t('goals.timeRemaining')}
                    </span>
                  )}
                  {goal.operator === 'lte' && goal.status !== 'exceeded' && (
                    <span>
                      {formatMinutes(goal.timeRemaining)} {t('goals.timeRemaining')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <GoalModal
          goal={editingGoal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingGoal(null);
          }}
          onSave={async () => {
            setShowCreateModal(false);
            setEditingGoal(null);
            await loadGoals();
            await loadStats();
          }}
        />
      )}
    </div>
  );
};

interface GoalModalProps {
  goal: GoalWithProgress | null;
  onClose: () => void;
  onSave: () => void;
}

const GoalModal: React.FC<GoalModalProps> = ({ goal, onClose, onSave }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    goalType: GoalType;
    category: string;
    appName: string;
    targetMinutes: number;
    operator: GoalOperator;
    period: GoalPeriod;
    active: boolean;
    notificationsEnabled: boolean;
    notifyAtPercentage: number;
  }>({
    name: goal?.name || '',
    description: goal?.description || '',
    goalType: goal?.goalType || 'daily_time',
    category: goal?.category || '',
    appName: goal?.appName || '',
    targetMinutes: goal?.targetMinutes || 60,
    operator: goal?.operator || 'gte',
    period: goal?.period || 'daily',
    active: goal?.active !== undefined ? goal.active : true,
    notificationsEnabled: goal?.notificationsEnabled !== undefined ? goal.notificationsEnabled : true,
    notifyAtPercentage: goal?.notifyAtPercentage || 100,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (window.electronAPI) {
        const goalData: Partial<ProductivityGoal> = {
          name: formData.name,
          description: formData.description || undefined,
          goalType: formData.goalType,
          category: formData.category || undefined,
          appName: formData.appName || undefined,
          targetMinutes: formData.targetMinutes,
          operator: formData.operator,
          period: formData.period,
          active: formData.active,
          notificationsEnabled: formData.notificationsEnabled,
          notifyAtPercentage: formData.notifyAtPercentage,
        };

        if (goal?.id) {
          await window.electronAPI.updateGoal(goal.id, goalData);
        } else {
          await window.electronAPI.addGoal(goalData as ProductivityGoal);
        }

        onSave();
      }
    } catch (error) {
      console.error('Failed to save goal:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {goal ? t('goals.editGoal') : t('goals.createGoal')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Goal Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('goals.goalName')} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('goals.goalNamePlaceholder')}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('goals.description')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('goals.descriptionPlaceholder')}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Goal Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('goals.goalType')} *
              </label>
              <select
                value={formData.goalType}
                onChange={(e) => setFormData({ ...formData, goalType: e.target.value as GoalType })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="daily_time">{t('goals.goalTypeDaily')}</option>
                <option value="weekly_time">{t('goals.goalTypeWeekly')}</option>
                <option value="category">{t('goals.goalTypeCategory')}</option>
                <option value="app_limit">{t('goals.goalTypeAppLimit')}</option>
              </select>
            </div>

            {/* Category (for category goals) */}
            {formData.goalType === 'category' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('goals.category')} *
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder={t('goals.categoryPlaceholder')}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}

            {/* App Name (for app_limit goals) */}
            {formData.goalType === 'app_limit' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('goals.appName')} *
                </label>
                <input
                  type="text"
                  value={formData.appName}
                  onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
                  placeholder={t('goals.appNamePlaceholder')}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}

            {/* Operator & Target */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('goals.operator')} *
                </label>
                <select
                  value={formData.operator}
                  onChange={(e) => setFormData({ ...formData, operator: e.target.value as GoalOperator })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="gte">{t('goals.operatorGte')}</option>
                  <option value="lte">{t('goals.operatorLte')}</option>
                  <option value="eq">{t('goals.operatorEq')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('goals.targetMinutes')} *
                </label>
                <input
                  type="number"
                  value={formData.targetMinutes}
                  onChange={(e) => setFormData({ ...formData, targetMinutes: parseInt(e.target.value) })}
                  min={1}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Notifications */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('goals.notifyAtPercentage')}
              </label>
              <select
                value={formData.notifyAtPercentage}
                onChange={(e) => setFormData({ ...formData, notifyAtPercentage: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value={50}>{t('goals.notifyAt50')}</option>
                <option value={75}>{t('goals.notifyAt75')}</option>
                <option value={90}>{t('goals.notifyAt90')}</option>
                <option value={100}>{t('goals.notifyAt100')}</option>
              </select>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {t('goals.activeDesc')}
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.notificationsEnabled}
                  onChange={(e) => setFormData({ ...formData, notificationsEnabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {t('goals.notificationsEnabledDesc')}
                </span>
              </label>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isSaving ? t('settings.saving') : t('common.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Goals;
