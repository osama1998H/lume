import React from 'react';

export type ColorScheme = 'primary' | 'green' | 'orange' | 'purple' | 'blue' | 'red';

export interface StatCardProps {
  icon: string | React.ReactNode;
  title: string;
  value: string | number;
  colorScheme?: ColorScheme;
  className?: string;
}

const colorSchemes: Record<ColorScheme, { bg: string; text: string }> = {
  primary: {
    bg: 'bg-primary-100 dark:bg-primary-900/30',
    text: 'text-primary-600 dark:text-primary-400',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600 dark:text-green-400',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-600 dark:text-orange-400',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-600 dark:text-purple-400',
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-600 dark:text-red-400',
  },
};

const StatCard: React.FC<StatCardProps> = ({
  icon,
  title,
  value,
  colorScheme = 'primary',
  className = '',
}) => {
  const colors = colorSchemes[colorScheme];

  return (
    <div className={`card ${className}`}>
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${colors.bg} ${colors.text} mr-4`}>
          {typeof icon === 'string' ? (
            <span className="text-2xl">{icon}</span>
          ) : (
            icon
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          <p className={`text-2xl font-bold ${colors.text}`}>{value}</p>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
