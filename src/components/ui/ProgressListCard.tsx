import React from 'react';
import EmptyState from './EmptyState';
import { BarChart3 } from 'lucide-react';

export type ProgressBarColorScheme = 'primary' | 'green' | 'blue' | 'purple' | 'orange';

export interface ProgressListItem {
  key: string;
  label: string;
  value: number;
  formattedValue?: string;
}

export interface ProgressListCardProps {
  title: string;
  items: ProgressListItem[];
  colorScheme?: ProgressBarColorScheme;
  formatValue?: (value: number) => string;
  emptyStateText?: string;
  className?: string;
}

const colorSchemes: Record<ProgressBarColorScheme, { bar: string; gradient: string; text: string }> = {
  primary: {
    bar: 'bg-gradient-to-r from-primary-500 to-primary-600',
    gradient: 'from-primary-500/20 to-primary-600/20',
    text: 'text-primary-600 dark:text-primary-400',
  },
  green: {
    bar: 'bg-gradient-to-r from-green-500 to-green-600',
    gradient: 'from-green-500/20 to-green-600/20',
    text: 'text-green-600 dark:text-green-400',
  },
  blue: {
    bar: 'bg-gradient-to-r from-blue-500 to-blue-600',
    gradient: 'from-blue-500/20 to-blue-600/20',
    text: 'text-blue-600 dark:text-blue-400',
  },
  purple: {
    bar: 'bg-gradient-to-r from-purple-500 to-purple-600',
    gradient: 'from-purple-500/20 to-purple-600/20',
    text: 'text-purple-600 dark:text-purple-400',
  },
  orange: {
    bar: 'bg-gradient-to-r from-orange-500 to-orange-600',
    gradient: 'from-orange-500/20 to-orange-600/20',
    text: 'text-orange-600 dark:text-orange-400',
  },
};

const ProgressListCard: React.FC<ProgressListCardProps> = ({
  title,
  items,
  colorScheme = 'primary',
  formatValue,
  emptyStateText = 'No data available',
  className = '',
}) => {
  const maxValue = items.length > 0 ? Math.max(...items.map(item => item.value)) : 1;
  const colors = colorSchemes[colorScheme];

  return (
    <div className={`card ${className}`}>
      <h3 className="text-xl font-semibold mb-5 dark:text-gray-100">{title}</h3>
      <div className="space-y-5">
        {items.length > 0 ? (
          items.map((item) => {
            const percentage = (item.value / maxValue) * 100;
            const displayValue = item.formattedValue || (formatValue ? formatValue(item.value) : item.value);

            return (
              <div key={item.key} className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {item.label}
                  </span>
                  <span className={`text-sm font-semibold ${colors.text}`}>
                    {displayValue}
                  </span>
                </div>
                <div className="relative w-full bg-gray-100 dark:bg-gray-700/50 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`${colors.bar} h-2.5 rounded-full transition-all duration-500 ease-out relative`}
                    style={{ width: `${percentage}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>{percentage.toFixed(0)}%</span>
                  <span>{item.value.toLocaleString()}</span>
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState
            icon={BarChart3}
            title={emptyStateText}
            description="No data to display yet"
          />
        )}
      </div>
    </div>
  );
};

export default ProgressListCard;
