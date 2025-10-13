import React from 'react';
import { AlertTriangle, Copy, Clock } from 'lucide-react';
import type { ConflictType } from '../../../types';

interface ConflictBadgeProps {
  conflictType: ConflictType;
  severity?: 'low' | 'medium' | 'high';
  count?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * ConflictBadge
 * Visual indicator for activity conflicts (overlaps, duplicates, gaps)
 */
const ConflictBadge: React.FC<ConflictBadgeProps> = ({
  conflictType,
  severity = 'medium',
  count,
  showLabel = true,
  size = 'md',
  className = '',
}) => {
  // Size mappings
  const iconSizeClass = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textSizeClass = size === 'sm' ? 'text-xs' : 'text-sm';
  const paddingClass = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';

  // Get configuration based on conflict type and severity
  const getConflictConfig = () => {
    switch (conflictType) {
      case 'overlap':
        return {
          icon: AlertTriangle,
          label: 'Overlap',
          bgColor: severity === 'high' ? 'bg-red-100 dark:bg-red-900/30' :
                   severity === 'medium' ? 'bg-orange-100 dark:bg-orange-900/30' :
                   'bg-yellow-100 dark:bg-yellow-900/30',
          textColor: severity === 'high' ? 'text-red-700 dark:text-red-400' :
                     severity === 'medium' ? 'text-orange-700 dark:text-orange-400' :
                     'text-yellow-700 dark:text-yellow-400',
          borderColor: severity === 'high' ? 'border-red-300 dark:border-red-700' :
                       severity === 'medium' ? 'border-orange-300 dark:border-orange-700' :
                       'border-yellow-300 dark:border-yellow-700',
        };
      case 'duplicate':
        return {
          icon: Copy,
          label: 'Duplicate',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          textColor: 'text-blue-700 dark:text-blue-400',
          borderColor: 'border-blue-300 dark:border-blue-700',
        };
      case 'gap':
        return {
          icon: Clock,
          label: 'Gap',
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          textColor: 'text-gray-700 dark:text-gray-400',
          borderColor: 'border-gray-300 dark:border-gray-600',
        };
      default:
        return {
          icon: AlertTriangle,
          label: 'Unknown',
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          textColor: 'text-gray-700 dark:text-gray-400',
          borderColor: 'border-gray-300 dark:border-gray-600',
        };
    }
  };

  const config = getConflictConfig();
  const Icon = config.icon;

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 ${paddingClass}
        ${config.bgColor} ${config.textColor}
        border ${config.borderColor}
        rounded-full
        ${className}
      `}
      title={`${config.label} ${count ? `(${count})` : ''}`}
    >
      <Icon className={iconSizeClass} />
      {showLabel && (
        <>
          <span className={`${textSizeClass} font-medium`}>{config.label}</span>
          {count && count > 1 && (
            <span className={`${textSizeClass} font-bold`}>({count})</span>
          )}
        </>
      )}
    </div>
  );
};

export default ConflictBadge;
