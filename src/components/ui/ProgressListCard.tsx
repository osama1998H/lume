import React from 'react';

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

const colorSchemes: Record<ProgressBarColorScheme, string> = {
  primary: 'bg-primary-600 dark:bg-primary-500',
  green: 'bg-green-600 dark:bg-green-500',
  blue: 'bg-blue-600 dark:bg-blue-500',
  purple: 'bg-purple-600 dark:bg-purple-500',
  orange: 'bg-orange-600 dark:bg-orange-500',
};

const textColorSchemes: Record<ProgressBarColorScheme, string> = {
  primary: 'text-primary-600 dark:text-primary-400',
  green: 'text-green-600 dark:text-green-400',
  blue: 'text-blue-600 dark:text-blue-400',
  purple: 'text-purple-600 dark:text-purple-400',
  orange: 'text-orange-600 dark:text-orange-400',
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
  const barColor = colorSchemes[colorScheme];
  const textColor = textColorSchemes[colorScheme];

  return (
    <div className={`card ${className}`}>
      <h3 className="text-xl font-semibold mb-4 dark:text-gray-100">{title}</h3>
      <div className="space-y-4">
        {items.length > 0 ? (
          items.map((item) => {
            const percentage = (item.value / maxValue) * 100;
            const displayValue = item.formattedValue || (formatValue ? formatValue(item.value) : item.value);

            return (
              <div key={item.key} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {item.label}
                  </span>
                  <span className={`text-sm font-semibold ${textColor}`}>
                    {displayValue}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`${barColor} h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            {emptyStateText}
          </p>
        )}
      </div>
    </div>
  );
};

export default ProgressListCard;
