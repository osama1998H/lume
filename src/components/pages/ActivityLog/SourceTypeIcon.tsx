import React from 'react';
import { Timer, Monitor, Coffee } from 'lucide-react';
import type { ActivitySourceType } from '@/types';

interface SourceTypeIconProps {
  sourceType: ActivitySourceType;
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
  className?: string;
}

/**
 * SourceTypeIcon
 * Displays an icon and optional badge for different activity source types
 */
const SourceTypeIcon: React.FC<SourceTypeIconProps> = ({
  sourceType,
  size = 'md',
  showBadge = true,
  className = '',
}) => {
  // Icon size mapping
  const iconSizeClass = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }[size];

  // Container size mapping
  const containerSizeClass = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }[size];

  // Get icon, colors, and label based on source type
  const getSourceConfig = () => {
    switch (sourceType) {
      case 'manual':
        return {
          icon: Timer,
          bgColor: 'bg-blue-500',
          lightBgColor: 'bg-blue-100 dark:bg-blue-900/30',
          textColor: 'text-blue-600 dark:text-blue-400',
          label: 'Manual',
          badgeColor: 'bg-blue-500',
        };
      case 'automatic':
        return {
          icon: Monitor,
          bgColor: 'bg-purple-500',
          lightBgColor: 'bg-purple-100 dark:bg-purple-900/30',
          textColor: 'text-purple-600 dark:text-purple-400',
          label: 'Auto',
          badgeColor: 'bg-purple-500',
        };
      case 'pomodoro':
        return {
          icon: Coffee,
          bgColor: 'bg-red-500',
          lightBgColor: 'bg-red-100 dark:bg-red-900/30',
          textColor: 'text-red-600 dark:text-red-400',
          label: 'Pomodoro',
          badgeColor: 'bg-red-500',
        };
      default:
        return {
          icon: Timer,
          bgColor: 'bg-gray-500',
          lightBgColor: 'bg-gray-100 dark:bg-gray-900/30',
          textColor: 'text-gray-600 dark:text-gray-400',
          label: 'Unknown',
          badgeColor: 'bg-gray-500',
        };
    }
  };

  const config = getSourceConfig();
  const Icon = config.icon;

  if (showBadge) {
    // Badge mode: icon with background circle and text label
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div
          className={`${containerSizeClass} ${config.lightBgColor} rounded-full flex items-center justify-center flex-shrink-0`}
        >
          <Icon className={`${iconSizeClass} ${config.textColor}`} />
        </div>
        <span className={`text-xs font-medium ${config.textColor} uppercase tracking-wide`}>
          {config.label}
        </span>
      </div>
    );
  }

  // Icon only mode
  return (
    <div
      className={`${containerSizeClass} ${config.lightBgColor} rounded-full flex items-center justify-center flex-shrink-0 ${className}`}
      title={config.label}
    >
      <Icon className={`${iconSizeClass} ${config.textColor}`} />
    </div>
  );
};

export default SourceTypeIcon;
