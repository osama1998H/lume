import React from 'react';
import { Tag } from '@/types';

export interface TagDisplayProps {
  tags: Tag[];
  size?: 'sm' | 'md' | 'lg';
  maxDisplay?: number;
  className?: string;
}

/**
 * TagDisplay component for displaying tags as read-only badges
 * Shows tags with their colors in a compact, visually appealing format
 */
const TagDisplay: React.FC<TagDisplayProps> = ({
  tags,
  size = 'sm',
  maxDisplay,
  className = '',
}) => {
  if (!tags || tags.length === 0) {
    return null;
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const displayTags = maxDisplay ? tags.slice(0, maxDisplay) : tags;
  const remainingCount = maxDisplay && tags.length > maxDisplay ? tags.length - maxDisplay : 0;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {displayTags.map((tag) => (
        <span
          key={tag.id}
          className={`inline-flex items-center rounded-full text-white font-medium ${sizeClasses[size]}`}
          style={{ backgroundColor: tag.color }}
          title={tag.name}
        >
          {tag.name}
        </span>
      ))}
      {remainingCount > 0 && (
        <span
          className={`inline-flex items-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium ${sizeClasses[size]}`}
          title={`${remainingCount} more tag${remainingCount > 1 ? 's' : ''}`}
        >
          +{remainingCount}
        </span>
      )}
    </div>
  );
};

export default TagDisplay;
