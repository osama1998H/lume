import React from 'react';
import Badge from './Badge';
import EmptyState from './EmptyState';
import { Clock } from 'lucide-react';

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
      <h3 className="text-xl font-semibold mb-5 dark:text-gray-100">{title}</h3>
      <div className="space-y-2">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.key}
              className="group flex justify-between items-center p-3.5 bg-gray-50/80 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50 hover:bg-gray-100/80 dark:hover:bg-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-200"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {item.mainLabel}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {item.subLabel && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      {item.subLabel}
                      {showCategory && item.category && (
                        <>
                          <span className="text-gray-400 dark:text-gray-500">•</span>
                          <span>{item.category}</span>
                        </>
                      )}
                    </p>
                  )}
                  {!item.subLabel && showCategory && item.category && (
                    <Badge variant="primary" size="sm">
                      {item.category}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right ml-4 flex-shrink-0">
                <p className="font-semibold text-primary-600 dark:text-primary-400 text-lg">
                  {item.value}
                </p>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            icon={Clock}
            title={emptyStateText}
            description="Get started by tracking your first activity"
          />
        )}
      </div>
    </div>
  );
};

export default ActivityListCard;
