import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Target, TrendingUp, Award, Flame, Edit2, Trash2, Plus } from 'lucide-react';
import { ProductivityGoal, GoalWithProgress, GoalStats, GoalType, GoalOperator, GoalPeriod, GoalStatus } from '../types';
import StatCard from './ui/StatCard';
import Button from './ui/Button';
import Input from './ui/Input';
import Badge from './ui/Badge';
import EmptyState from './ui/EmptyState';
import Skeleton from './ui/Skeleton';

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

  const getStatusVariant = (status: GoalStatus): 'success' | 'primary' | 'danger' | 'gray' => {
    switch (status) {
      case 'achieved':
        return 'success';
      case 'in_progress':
        return 'primary';
      case 'exceeded':
        return 'danger';
      default:
        return 'gray';
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
      <div className="p-8 overflow-y-auto space-y-8">
        <div className="space-y-2">
          <Skeleton width="200px" height="32px" />
          <Skeleton width="300px" height="20px" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton variant="rectangular" height="120px" />
          <Skeleton variant="rectangular" height="120px" />
          <Skeleton variant="rectangular" height="120px" />
          <Skeleton variant="rectangular" height="120px" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('goals.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('goals.subtitle')}
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Target}
            title={t('goals.stats.totalGoals')}
            value={stats.totalGoals}
            colorScheme="primary"
          />
          <StatCard
            icon={TrendingUp}
            title={t('goals.stats.activeGoals')}
            value={stats.activeGoals}
            colorScheme="primary"
          />
          <StatCard
            icon={Award}
            title={t('goals.stats.achievedToday')}
            value={stats.achievedToday}
            colorScheme="green"
          />
          <StatCard
            icon={Flame}
            title={t('goals.stats.currentStreak')}
            value={`${stats.currentStreak} ${t('goals.stats.days')}`}
            colorScheme="orange"
          />
        </div>
      )}

      {/* Create Goal Button */}
      <div className="mb-6">
        <Button
          onClick={handleCreateGoal}
          variant="primary"
          icon={Plus}
        >
          {t('goals.createGoal')}
        </Button>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title={t('goals.noGoals')}
          description={t('goals.noGoalsPrompt')}
          action={{
            label: t('goals.createGoal'),
            onClick: handleCreateGoal,
          }}
        />
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
                    <Badge variant={getStatusVariant(goal.status)} size="sm">
                      {t(`goals.status${goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}`)}
                    </Badge>
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
                  <Button
                    onClick={() => handleToggleActive(goal)}
                    variant={goal.active ? 'secondary' : 'ghost'}
                    size="sm"
                  >
                    {goal.active ? t('goals.active') : t('settings.stopped')}
                  </Button>
                  <button
                    onClick={() => handleEditGoal(goal)}
                    className="p-2 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => goal.id && handleDeleteGoal(goal.id)}
                    className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Trash2 className="h-4 w-4" />
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
            <Input
              type="text"
              label={`${t('goals.goalName')} *`}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('goals.goalNamePlaceholder')}
              required
            />

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                {t('goals.description')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('goals.descriptionPlaceholder')}
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-gray-100 transition-all"
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily_time" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">{t('goals.goalTypeDaily')}</option>
                <option value="weekly_time" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">{t('goals.goalTypeWeekly')}</option>
                <option value="category" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">{t('goals.goalTypeCategory')}</option>
                <option value="app_limit" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">{t('goals.goalTypeAppLimit')}</option>
              </select>
            </div>

            {/* Category (for category goals) */}
            {formData.goalType === 'category' && (
              <Input
                type="text"
                label={`${t('goals.category')} *`}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder={t('goals.categoryPlaceholder')}
                required
              />
            )}

            {/* App Name (for app_limit goals) */}
            {formData.goalType === 'app_limit' && (
              <Input
                type="text"
                label={`${t('goals.appName')} *`}
                value={formData.appName}
                onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
                placeholder={t('goals.appNamePlaceholder')}
                required
              />
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="gte" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">{t('goals.operatorGte')}</option>
                  <option value="lte" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">{t('goals.operatorLte')}</option>
                  <option value="eq" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">{t('goals.operatorEq')}</option>
                </select>
              </div>
              <Input
                type="number"
                label={`${t('goals.targetMinutes')} *`}
                value={formData.targetMinutes.toString()}
                onChange={(e) => setFormData({ ...formData, targetMinutes: parseInt(e.target.value, 10) || 0 })}
                min={1}
                required
              />
            </div>

            {/* Notifications */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('goals.notifyAtPercentage')}
              </label>
              <select
                value={formData.notifyAtPercentage}
                onChange={(e) => setFormData({ ...formData, notifyAtPercentage: parseInt(e.target.value, 10) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value={50} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">{t('goals.notifyAt50')}</option>
                <option value={75} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">{t('goals.notifyAt75')}</option>
                <option value={90} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">{t('goals.notifyAt90')}</option>
                <option value={100} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">{t('goals.notifyAt100')}</option>
              </select>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800"
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
                  className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {t('goals.notificationsEnabledDesc')}
                </span>
              </label>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                onClick={onClose}
                variant="ghost"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                variant="primary"
                loading={isSaving}
              >
                {t('common.save')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Goals;
