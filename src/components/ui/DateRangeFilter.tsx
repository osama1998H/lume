import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface DateRangeOption {
  value: string;
  label: string;
}

export interface DateRangeFilterProps {
  options: DateRangeOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  withNavigation?: boolean;
  onNavigate?: (direction: 'prev' | 'next') => void;
  navigationDisabled?: { prev?: boolean; next?: boolean };
  className?: string;
}

/**
 * Reusable date range filter component with optional navigation
 * Supports RTL mode with automatic arrow flipping
 */
const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  options,
  selectedValue,
  onChange,
  withNavigation = false,
  onNavigate,
  navigationDisabled = {},
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2 w-full sm:w-auto ${className}`}>
      {withNavigation && onNavigate && (
        <button
          onClick={() => onNavigate('prev')}
          disabled={navigationDisabled.prev}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous"
        >
          <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
        </button>
      )}

      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
            selectedValue === option.value
              ? 'bg-primary-600 text-white dark:bg-primary-500'
              : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
          }`}
        >
          {option.label}
        </button>
      ))}

      {withNavigation && onNavigate && (
        <button
          onClick={() => onNavigate('next')}
          disabled={navigationDisabled.next}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next"
        >
          <ChevronRight className="w-5 h-5 rtl:rotate-180" />
        </button>
      )}
    </div>
  );
};

export default DateRangeFilter;
