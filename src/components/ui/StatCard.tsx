import React from 'react';
import { LucideIcon } from 'lucide-react';

export type ColorScheme = 'primary' | 'green' | 'orange' | 'purple' | 'blue' | 'red';

export interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  colorScheme?: ColorScheme;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const colorSchemes: Record<ColorScheme, { bg: string; iconBg: string; text: string; gradient: string }> = {
  primary: {
    bg: 'bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-800 dark:to-gray-800',
    iconBg: 'bg-gradient-to-br from-primary-500 to-primary-600',
    text: 'text-primary-600 dark:text-white',
    gradient: 'from-primary-500/10 to-primary-600/10',
  },
  green: {
    bg: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-800 dark:to-gray-800',
    iconBg: 'bg-gradient-to-br from-green-500 to-green-600',
    text: 'text-green-600 dark:text-white',
    gradient: 'from-green-500/10 to-green-600/10',
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-gray-800 dark:to-gray-800',
    iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600',
    text: 'text-orange-600 dark:text-white',
    gradient: 'from-orange-500/10 to-orange-600/10',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-gray-800 dark:to-gray-800',
    iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
    text: 'text-purple-600 dark:text-white',
    gradient: 'from-purple-500/10 to-purple-600/10',
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-800',
    iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    text: 'text-blue-600 dark:text-white',
    gradient: 'from-blue-500/10 to-blue-600/10',
  },
  red: {
    bg: 'bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-800 dark:to-gray-800',
    iconBg: 'bg-gradient-to-br from-red-500 to-red-600',
    text: 'text-red-600 dark:text-white',
    gradient: 'from-red-500/10 to-red-600/10',
  },
};

const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  title,
  value,
  colorScheme = 'primary',
  trend,
  className = '',
}) => {
  const colors = colorSchemes[colorScheme];

  return (
    <div className={`card-hover group ${colors.bg} ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className={`p-3 rounded-xl ${colors.iconBg} shadow-lg group-hover:scale-110 transition-transform duration-200`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              {title}
            </h3>
            <div className="flex items-baseline gap-2">
              <p className={`text-3xl font-bold ${colors.text}`}>{value}</p>
              {trend && (
                <span
                  className={`text-sm font-medium ${
                    trend.isPositive
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
