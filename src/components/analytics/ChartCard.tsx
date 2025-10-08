import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface ChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  className?: string;
  actions?: ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  description,
  children,
  isLoading = false,
  isEmpty = false,
  emptyMessage,
  className = '',
  actions,
}) => {
  const { t } = useTranslation();

  return (
    <div className={`bg-surface-primary rounded-xl border border-border p-6 shadow-card hover:shadow-card-hover transition-all duration-300 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-text-primary mb-1">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-text-secondary">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="ml-4">
            {actions}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <svg
              className="w-16 h-16 text-text-tertiary mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="text-text-secondary">
              {emptyMessage || t('reports.noData')}
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
