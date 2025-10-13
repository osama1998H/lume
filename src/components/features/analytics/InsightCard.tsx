import React from 'react';
import { useTranslation } from 'react-i18next';
import type { BehavioralInsight } from '../../../types';

interface InsightCardProps {
  insight: BehavioralInsight;
}

export const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const { t } = useTranslation();

  // Get translated title and description
  const getTranslatedContent = () => {
    const type = insight.type;

    switch (type) {
      case 'peak_hour': {
        const title = t('analytics.insightTypes.peakHour.title');
        // Extract hour and period from description
        const match = insight.description.match(/(\d+):00.*?(morning|afternoon|evening)/);
        if (match) {
          const hour = match[1];
          const periodEn = match[2];
          const period = t(`analytics.insightTypes.peakHour.${periodEn}`);
          const description = t('analytics.insightTypes.peakHour.description', { hour, period });
          return { title, description };
        }
        return { title, description: insight.description };
      }
      case 'productive_day': {
        const title = t('analytics.insightTypes.productiveDay.title');
        // Extract day name
        const match = insight.description.match(/(\w+) is your most productive day/);
        if (match) {
          const dayEn = match[1];
          const day = t(`common.daysOfWeek.${dayEn}`, dayEn);
          const description = t('analytics.insightTypes.productiveDay.description', { day });
          return { title, description };
        }
        return { title, description: insight.description };
      }
      case 'category_trend': {
        const title = t('analytics.insightTypes.categoryTrend.title');
        // Extract category name
        const match = insight.description.match(/most time on (.+)$/);
        if (match) {
          const category = match[1];
          const description = t('analytics.insightTypes.categoryTrend.description', { category });
          return { title, description };
        }
        return { title, description: insight.description };
      }
      case 'distraction': {
        const title = t('analytics.insightTypes.distraction.title');
        // Extract app name and count
        const match = insight.description.match(/(.+) has (\d+) short sessions/);
        if (match) {
          const app = match[1];
          const count = parseInt(match[2]);
          const description = t('analytics.insightTypes.distraction.description', { app, count });
          return { title, description };
        }
        return { title, description: insight.description };
      }
      case 'focus_quality': {
        const title = t('analytics.insightTypes.focusQuality.title');
        // Extract completion rate
        const match = insight.description.match(/(\d+)%/);
        if (match) {
          const rate = match[1];
          const isGood = insight.description.includes('Great focus');
          const description = isGood
            ? t('analytics.insightTypes.focusQuality.descriptionGood', { rate })
            : t('analytics.insightTypes.focusQuality.descriptionPoor', { rate });
          return { title, description };
        }
        return { title, description: insight.description };
      }
      case 'streak': {
        const title = t('analytics.insightTypes.streak.title');
        // Extract days
        const match = insight.description.match(/(\d+) days?/);
        if (match) {
          const days = parseInt(match[1]);
          const description = days >= 7
            ? t('analytics.insightTypes.streak.descriptionLong', { days })
            : days > 1
            ? t('analytics.insightTypes.streak.descriptionShortPlural', { days })
            : t('analytics.insightTypes.streak.descriptionShort', { days });
          return { title, description };
        }
        return { title, description: insight.description };
      }
      default:
        return { title: insight.title, description: insight.description };
    }
  };

  const { title, description } = getTranslatedContent();

  // Translate the value field
  const getTranslatedValue = () => {
    const value = insight.value;

    if (typeof value !== 'string') {
      return value;
    }

    // Translate day names (e.g., "Monday")
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (dayNames.includes(value)) {
      return t(`common.daysOfWeek.${value}`, value);
    }

    // Translate time with units (e.g., "26 min", "3 min avg")
    let translatedValue = value;

    // Replace " min avg" -> " {translated min} {translated avg}"
    if (translatedValue.includes(' min avg')) {
      translatedValue = translatedValue.replace(' min avg', ` ${t('common.min')} ${t('common.avg')}`);
    }
    // Replace " min" -> " {translated min}"
    else if (translatedValue.includes(' min')) {
      translatedValue = translatedValue.replace(' min', ` ${t('common.min')}`);
    }

    // Replace " days" -> " {translated days}"
    if (translatedValue.includes(' days')) {
      translatedValue = translatedValue.replace(' days', ` ${t('common.days')}`);
    }
    // Replace " day" -> " {translated day}"
    else if (translatedValue.includes(' day')) {
      translatedValue = translatedValue.replace(' day', ` ${t('common.day')}`);
    }

    return translatedValue;
  };

  const translatedValue = getTranslatedValue();

  // Get icon based on insight type
  const getIcon = (type: BehavioralInsight['type']) => {
    switch (type) {
      case 'peak_hour':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'productive_day':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'category_trend':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        );
      case 'distraction':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'streak':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          </svg>
        );
      case 'focus_quality':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // Get color scheme based on insight type
  const getColorScheme = (type: BehavioralInsight['type']) => {
    switch (type) {
      case 'peak_hour':
        return 'from-orange-500/20 to-yellow-500/20 border-orange-500/30 text-orange-500';
      case 'productive_day':
        return 'from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-500';
      case 'category_trend':
        return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-500';
      case 'distraction':
        return 'from-red-500/20 to-pink-500/20 border-red-500/30 text-red-500';
      case 'streak':
        return 'from-purple-500/20 to-violet-500/20 border-purple-500/30 text-purple-500';
      case 'focus_quality':
        return 'from-teal-500/20 to-cyan-500/20 border-teal-500/30 text-teal-500';
      default:
        return 'from-gray-500/20 to-slate-500/20 border-gray-500/30 text-gray-500';
    }
  };

  const colorScheme = getColorScheme(insight.type);

  return (
    <div className={`bg-gradient-to-br ${colorScheme} border rounded-xl p-4 hover:shadow-lg transition-all duration-300`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {getIcon(insight.type)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-text-primary mb-1 text-sm">
            {title}
          </h4>
          <p className="text-text-secondary text-xs mb-2">
            {description}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-text-primary font-bold text-sm">
              {translatedValue}
            </span>
            {insight.trend && (
              <div className={`flex items-center gap-1 text-xs ${insight.trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ transform: insight.trend.isPositive ? 'rotate(0deg)' : 'rotate(180deg)' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <span>{Math.abs(insight.trend.value).toFixed(0)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
