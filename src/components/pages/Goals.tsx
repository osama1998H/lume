import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Target, TrendingUp, Award, Flame, Edit2, Trash2, Plus } from 'lucide-react';
import { ProductivityGoal, GoalWithProgress, GoalStats, GoalType, GoalOperator, GoalPeriod, GoalStatus, Tag } from '@/types';
import StatCard from '../ui/StatCard';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import Skeleton from '../ui/Skeleton';
import { FormModal, ConfirmModal } from '../ui/Modal';
import FormField, { SelectField } from '../ui/FormField';
import TagSelector from '../ui/TagSelector';
import TagDisplay from '../ui/TagDisplay';
import { showToast } from '@/utils/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '@/services/logging/RendererLogger';

interface CategoryData {
  id?: number;
  name: string;
  color: string;
  description?: string;
}

interface ApplicationData {
  name: string;
  totalDuration: number;
}

const Goals: React.FC = () => {
  const { t } = useTranslation();
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [stats, setStats] = useState<GoalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalWithProgress | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteGoalId, setDeleteGoalId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [applications, setApplications] = useState<ApplicationData[]>([]);

  // Form state
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
    tags: Tag[];
  }>({
    name: '',
    description: '',
    goalType: 'daily_time',
    category: '',
    appName: '',
    targetMinutes: 60,
    operator: 'gte',
    period: 'daily',
    active: true,
    notificationsEnabled: true,
    notifyAtPercentage: 100,
    tags: [],
  });

  const loadGoals = useCallback(async () => {
    try {
      if (window.electronAPI) {
        const goalsData = await window.electronAPI.goals.getTodayWithProgress();
        // Load tags for each goal
        const goalsWithTags = await Promise.all(
          goalsData.map(async (goal) => {
            if (goal.id) {
              const tags = await window.electronAPI.tagAssociations.productivityGoals.get(goal.id);
              return { ...goal, tags };
            }
            return goal;
          })
        );
        setGoals(goalsWithTags);
      }
    } catch (error) {
      logger.error('Failed to load goals:', {}, error instanceof Error ? error : undefined);
      showToast.error(t('goals.loadingGoals') || 'Failed to load goals');
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const loadStats = useCallback(async () => {
    try {
      if (window.electronAPI) {
        const statsData = await window.electronAPI.goals.getStats();
        setStats(statsData);
      }
    } catch (error) {
      logger.error('Failed to load stats:', {}, error instanceof Error ? error : undefined);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      if (window.electronAPI) {
        const categoriesData = await window.electronAPI.categories.getAll();
        setCategories(categoriesData);
      }
    } catch (error) {
      logger.error('Failed to load categories:', {}, error instanceof Error ? error : undefined);
    }
  }, []);

  const loadApplications = useCallback(async () => {
    try {
      if (window.electronAPI) {
        const appsData = await window.electronAPI.activityTracking.getTopApplications(100);
        setApplications(appsData);
      }
    } catch (error) {
      logger.error('Failed to load applications:', {}, error instanceof Error ? error : undefined);
    }
  }, []);

  useEffect(() => {
    loadGoals();
    loadStats();
    loadCategories();
    loadApplications();
  }, [loadGoals, loadStats, loadCategories, loadApplications]);

  const handleCreateGoal = () => {
    setEditingGoal(null);
    setFormData({
      name: '',
      description: '',
      goalType: 'daily_time',
      category: '',
      appName: '',
      targetMinutes: 60,
      operator: 'gte',
      period: 'daily',
      active: true,
      notificationsEnabled: true,
      notifyAtPercentage: 100,
      tags: [],
    });
    setShowCreateModal(true);
  };

  const handleEditGoal = (goal: GoalWithProgress) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      description: goal.description || '',
      goalType: goal.goalType,
      category: goal.category || '',
      appName: goal.appName || '',
      targetMinutes: goal.targetMinutes,
      operator: goal.operator,
      period: goal.period,
      active: goal.active,
      notificationsEnabled: goal.notificationsEnabled,
      notifyAtPercentage: goal.notifyAtPercentage,
      tags: goal.tags || [],
    });
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast.error(t('goals.goalName') + ' is required');
      return;
    }

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

        let goalId: number;
        if (editingGoal?.id) {
          await window.electronAPI.goals.update(editingGoal.id, goalData);
          goalId = editingGoal.id;
          showToast.success(t('goals.updateSuccess') || 'Goal updated successfully');
        } else {
          goalId = await window.electronAPI.goals.add(goalData as ProductivityGoal);
          showToast.success(t('goals.createSuccess') || 'Goal created successfully');
        }

        // Save tags (use set to replace existing tags)
        const tagIds = formData.tags
          .map((tag) => tag.id)
          .filter((id): id is number => id != null);
        await window.electronAPI.tagAssociations.productivityGoals.set(goalId, tagIds);

        setShowCreateModal(false);
        setEditingGoal(null);
        await loadGoals();
        await loadStats();
      }
    } catch (error) {
      logger.error('Failed to save goal:', {}, error instanceof Error ? error : undefined);
      showToast.error(editingGoal ? t('goals.updateFailed') : t('goals.createFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGoal = (goalId: number) => {
    setDeleteGoalId(goalId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteGoalId) return;

    setIsSaving(true);
    try {
      if (window.electronAPI) {
        const success = await window.electronAPI.goals.delete(deleteGoalId);
        if (success) {
          await loadGoals();
          await loadStats();
          showToast.success(t('goals.deleteSuccess') || 'Goal deleted successfully');
        }
      }
    } catch (error) {
      logger.error('Failed to delete goal:', {}, error instanceof Error ? error : undefined);
      showToast.error(t('goals.deleteFailed') || 'Failed to delete goal');
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
      setDeleteGoalId(null);
    }
  };

  const handleToggleActive = async (goal: GoalWithProgress) => {
    try {
      if (window.electronAPI && goal.id) {
        await window.electronAPI.goals.update(goal.id, { active: !goal.active });
        await loadGoals();
        await loadStats();
        showToast.success(goal.active ? 'Goal paused' : 'Goal activated');
      }
    } catch (error) {
      logger.error('Failed to toggle goal:', {}, error instanceof Error ? error : undefined);
      showToast.error('Failed to update goal status');
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
      <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-8">
        <div className="space-y-2">
          <Skeleton width="200px" height="32px" />
          <Skeleton width="300px" height="20px" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Skeleton variant="rectangular" height="120px" />
          <Skeleton variant="rectangular" height="120px" />
          <Skeleton variant="rectangular" height="120px" />
          <Skeleton variant="rectangular" height="120px" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('goals.title')}
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          {t('goals.subtitle')}
        </p>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8"
        >
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
        </motion.div>
      )}

      {/* Create Goal Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <Button
          onClick={handleCreateGoal}
          variant="primary"
          icon={Plus}
        >
          {t('goals.createGoal')}
        </Button>
      </motion.div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <EmptyState
            icon={Target}
            title={t('goals.noGoals')}
            description={t('goals.noGoalsPrompt')}
            action={{
              label: t('goals.createGoal'),
              onClick: handleCreateGoal,
            }}
          />
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {goals.map((goal, index) => (
              <motion.div
                key={goal.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition-all p-4 sm:p-6 border border-gray-200 dark:border-gray-700 group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">
                        {goal.name}
                      </h3>
                      <Badge variant={getStatusVariant(goal.status)} size="sm">
                        {t(`goals.status${goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}`)}
                      </Badge>
                    </div>
                    {goal.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {goal.description}
                      </p>
                    )}
                    {goal.tags && goal.tags.length > 0 && (
                      <div className="mb-3">
                        <TagDisplay tags={goal.tags} size="sm" maxDisplay={5} />
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">
                        {t(`goals.goalType${goal.goalType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`)}
                      </span>
                      <span>•</span>
                      <span>
                        {t(`goals.operator${goal.operator.charAt(0).toUpperCase() + goal.operator.slice(1)}`)} {formatMinutes(goal.targetMinutes)}
                      </span>
                      {goal.category && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">
                            {goal.category}
                          </span>
                        </>
                      )}
                      {goal.appName && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">
                            {goal.appName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex sm:flex-col gap-2 sm:items-end">
                    <Button
                      onClick={() => handleToggleActive(goal)}
                      variant={goal.active ? 'secondary' : 'ghost'}
                      size="sm"
                      className="flex-1 sm:flex-none"
                    >
                      {goal.active ? t('goals.active') : t('settings.stopped')}
                    </Button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditGoal(goal)}
                        className="p-2 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Edit goal"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => goal.id && handleDeleteGoal(goal.id)}
                        className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Delete goal"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('goals.progress')}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatMinutes(goal.todayProgress?.progressMinutes || 0)} / {formatMinutes(goal.targetMinutes)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(goal.progressPercentage, 100)}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-3 rounded-full transition-colors ${getProgressBarColor(goal.status)}`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium">{goal.progressPercentage.toFixed(0)}%</span>
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
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Modal */}
      <FormModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingGoal(null);
        }}
        onSubmit={handleSubmit}
        title={editingGoal ? t('goals.editGoal') : t('goals.createGoal')}
        isLoading={isSaving}
        size="lg"
      >
        <div className="space-y-4">
          {/* Goal Name */}
          <FormField
            type="text"
            label={`${t('goals.goalName')} *`}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t('goals.goalNamePlaceholder')}
            required
          />

          {/* Description */}
          <FormField
            as="textarea"
            label={t('goals.description')}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder={t('goals.descriptionPlaceholder')}
            rows={2}
          />

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              {t('goals.tags')}
            </label>
            <TagSelector
              selectedTags={formData.tags}
              onChange={(tags) => setFormData({ ...formData, tags })}
              allowCreate={true}
              placeholder={t('goals.tagsPlaceholder')}
            />
          </div>

          {/* Goal Type */}
          <SelectField
            label={`${t('goals.goalType')} *`}
            value={formData.goalType}
            onChange={(e) => setFormData({ ...formData, goalType: e.target.value as GoalType })}
            options={[
              { value: 'daily_time', label: t('goals.goalTypeDaily') },
              { value: 'weekly_time', label: t('goals.goalTypeWeekly') },
              { value: 'category', label: t('goals.goalTypeCategory') },
              { value: 'app_limit', label: t('goals.goalTypeAppLimit') },
            ]}
            required
          />

          {/* Category (for category goals) */}
          {formData.goalType === 'category' && (
            <SelectField
              label={`${t('goals.category')} *`}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={[
                { value: '', label: t('goals.categoryPlaceholder') },
                ...categories.map((cat) => ({ value: cat.name, label: cat.name })),
              ]}
              required
            />
          )}

          {/* App Name (for app_limit goals) */}
          {formData.goalType === 'app_limit' && (
            <SelectField
              label={`${t('goals.appName')} *`}
              value={formData.appName}
              onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
              options={[
                { value: '', label: t('goals.appNamePlaceholder') },
                ...applications.map((app) => ({ value: app.name, label: app.name })),
              ]}
              required
            />
          )}

          {/* Operator & Target */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField
              label={`${t('goals.operator')} *`}
              value={formData.operator}
              onChange={(e) => setFormData({ ...formData, operator: e.target.value as GoalOperator })}
              options={[
                { value: 'gte', label: t('goals.operatorGte') },
                { value: 'lte', label: t('goals.operatorLte') },
                { value: 'eq', label: t('goals.operatorEq') },
              ]}
              required
            />
            <FormField
              type="number"
              label={`${t('goals.targetMinutes')} *`}
              value={formData.targetMinutes.toString()}
              onChange={(e) => setFormData({ ...formData, targetMinutes: parseInt(e.target.value, 10) || 0 })}
              min={1}
              required
            />
          </div>

          {/* Notifications */}
          <SelectField
            label={t('goals.notifyAtPercentage')}
            value={formData.notifyAtPercentage.toString()}
            onChange={(e) => setFormData({ ...formData, notifyAtPercentage: parseInt(e.target.value, 10) })}
            options={[
              { value: '50', label: t('goals.notifyAt50') },
              { value: '75', label: t('goals.notifyAt75') },
              { value: '90', label: t('goals.notifyAt90') },
              { value: '100', label: t('goals.notifyAt100') },
            ]}
          />

          {/* Toggles */}
          <div className="space-y-3 pt-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-4 h-4 text-primary-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500 transition-colors"
              />
              <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                {t('goals.activeDesc')}
              </span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.notificationsEnabled}
                onChange={(e) => setFormData({ ...formData, notificationsEnabled: e.target.checked })}
                className="w-4 h-4 text-primary-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500 transition-colors"
              />
              <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                {t('goals.notificationsEnabledDesc')}
              </span>
            </label>
          </div>
        </div>
      </FormModal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteGoalId(null);
        }}
        onConfirm={confirmDelete}
        title={t('goals.deleteGoal') || 'Delete Goal'}
        message={t('goals.confirmDelete') || 'Are you sure you want to delete this goal? This action cannot be undone.'}
        confirmText={t('common.delete') || 'Delete'}
        cancelText={t('common.cancel') || 'Cancel'}
        variant="danger"
        isLoading={isSaving}
      />
    </div>
  );
};

export default Goals;
