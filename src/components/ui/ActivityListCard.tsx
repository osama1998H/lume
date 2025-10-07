import React from 'react';

export interface ActivityItem {
  key: string | number;
  mainLabel: string;
  subLabel?: string;
  category?: string;
  value: string;
  isActive?: boolean;
}

export interface ActivityListCardProps {
  title: string;
  items: ActivityItem[];
  emptyStateText?: string;
  showCategory?: boolean;
  className?: string;
}

const ActivityListCard: React.FC<ActivityListCardProps> = ({
  title,
  items,
  emptyStateText = 'No entries available',
  showCategory = true,
  className = '',
}) => {
  return (
    <div className={`card ${className}`}>
      <h3 className="text-xl font-semibold mb-4 dark:text-gray-100">{title}</h3>
      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.key}
              className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {item.mainLabel}
                </p>
                {item.subLabel && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {item.subLabel}
                    {showCategory && item.category && ` • ${item.category}`}
                  </p>
                )}
                {!item.subLabel && showCategory && item.category && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-400 mt-1">
                    {item.category}
                  </span>
                )}
              </div>
              <div className="text-right">
                <p className="font-semibold text-primary-600 dark:text-primary-400">
                  {item.value}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            {emptyStateText}
          </p>
        )}
      </div>
    </div>
  );
};

export default ActivityListCard;
