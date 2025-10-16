import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Copy, Database, X } from 'lucide-react';
import GapDetection from './GapDetection';
import DuplicateDetection from './DuplicateDetection';
import DataCleanup from './DataCleanup';
import { TimeGap } from '@/types';
import { logger } from '@/services/logging/RendererLogger';

interface DataQualityPanelProps {
  startDate: string;
  endDate: string;
  onClose?: () => void;
  onCreateActivity?: (gap: TimeGap) => void;
  onRefreshActivities?: () => void;
}

type ActiveTab = 'gaps' | 'duplicates' | 'cleanup';

const DataQualityPanel: React.FC<DataQualityPanelProps> = ({
  startDate,
  endDate,
  onClose,
  onCreateActivity,
  onRefreshActivities,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ActiveTab>('gaps');

  const handleMergeActivities = async (
    activityIds: Array<{ id: number; sourceType: string }>
  ): Promise<void> => {
    if (!window.electronAPI) return;

    try {
      const result = await window.electronAPI.activities.bulk.update({
        activityIds: activityIds as Array<{ id: number; sourceType: 'manual' | 'automatic' | 'pomodoro' }>,
        operation: 'merge',
        mergeStrategy: 'longest',
      });

      if (result.success) {
        // Refresh activities after successful merge
        if (onRefreshActivities) {
          onRefreshActivities();
        }
      } else {
        throw new Error('Failed to merge activities');
      }
    } catch (error) {
      logger.error('Error merging activities:', {}, error instanceof Error ? error : undefined);
      throw error;
    }
  };

  const tabs = [
    {
      id: 'gaps' as ActiveTab,
      label: t('dataQuality.tabs.gaps', 'Gap Detection'),
      icon: AlertTriangle,
      description: t('dataQuality.tabs.gapsDescription', 'Find untracked time periods'),
    },
    {
      id: 'duplicates' as ActiveTab,
      label: t('dataQuality.tabs.duplicates', 'Duplicate Detection'),
      icon: Copy,
      description: t('dataQuality.tabs.duplicatesDescription', 'Find and merge similar activities'),
    },
    {
      id: 'cleanup' as ActiveTab,
      label: t('dataQuality.tabs.cleanup', 'Data Cleanup'),
      icon: Database,
      description: t('dataQuality.tabs.cleanupDescription', 'Validate and fix data issues'),
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              {t('dataQuality.title', 'Data Quality & Smart Features')}
            </h2>
            <p className="text-sm text-primary-100 mt-1">
              {t('dataQuality.description', 'Analyze and improve your activity data')}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <nav className="flex -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400 bg-white dark:bg-gray-800'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-semibold">{tab.label}</div>
                  <div className="text-xs font-normal opacity-80">{tab.description}</div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6 bg-gray-50 dark:bg-gray-900/30">
        {activeTab === 'gaps' && (
          <GapDetection
            startDate={startDate}
            endDate={endDate}
            onCreateActivity={onCreateActivity}
          />
        )}

        {activeTab === 'duplicates' && (
          <DuplicateDetection
            startDate={startDate}
            endDate={endDate}
            onMergeActivities={handleMergeActivities}
          />
        )}

        {activeTab === 'cleanup' && (
          <DataCleanup
            startDate={startDate}
            endDate={endDate}
            onRefresh={onRefreshActivities}
          />
        )}
      </div>
    </div>
  );
};

export default DataQualityPanel;
