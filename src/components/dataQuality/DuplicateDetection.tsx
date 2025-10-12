import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, AlertCircle, Percent, GitMerge, ChevronDown, ChevronUp } from 'lucide-react';
import { UnifiedActivity } from '../../types';
import { formatDuration, formatTime, formatDate } from '../../utils/format';

interface DuplicateGroup {
  activities: UnifiedActivity[];
  avgSimilarity: number;
}

interface DuplicateDetectionProps {
  startDate: string;
  endDate: string;
  onMergeActivities?: (activityIds: Array<{ id: number; sourceType: string }>) => Promise<void>;
}

const DuplicateDetection: React.FC<DuplicateDetectionProps> = ({
  startDate,
  endDate,
  onMergeActivities,
}) => {
  const { t } = useTranslation();
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [similarityThreshold, setSimilarityThreshold] = useState(80);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [mergingGroups, setMergingGroups] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadDuplicateData();
  }, [startDate, endDate, similarityThreshold]);

  const loadDuplicateData = async () => {
    // Guard against non-Electron environments
    if (!window.electronAPI) {
      setLoading(false);
      setError(t('dataQuality.duplicates.electronRequired', 'This feature requires the Electron app'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const duplicates = await window.electronAPI.detectDuplicateActivities(
        startDate,
        endDate,
        similarityThreshold
      );

      setDuplicateGroups(duplicates);
    } catch (err) {
      console.error('Failed to load duplicate data:', err);
      setError(t('dataQuality.duplicates.loadError', 'Failed to load duplicate data'));
    } finally {
      setLoading(false);
    }
  };

  const toggleGroupExpansion = (index: number) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedGroups(newExpanded);
  };

  const handleMergeGroup = async (group: DuplicateGroup, groupIndex: number) => {
    if (!onMergeActivities) return;

    setMergingGroups((prev) => new Set(prev).add(groupIndex));

    try {
      const activityIds = group.activities.map((a) => ({
        id: a.id,
        sourceType: a.sourceType,
      }));

      await onMergeActivities(activityIds);

      // Reload data after merge
      await loadDuplicateData();
    } catch (err) {
      console.error('Failed to merge activities:', err);
      setError(t('dataQuality.duplicates.mergeError', 'Failed to merge activities'));
    } finally {
      setMergingGroups((prev) => {
        const newSet = new Set(prev);
        newSet.delete(groupIndex);
        return newSet;
      });
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 95) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
    if (similarity >= 85) return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
    return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
  };

  const getSourceBadgeColor = (sourceType: string) => {
    switch (sourceType) {
      case 'manual':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'application':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'pomodoro':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('dataQuality.duplicates.title', 'Duplicate Detection')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('dataQuality.duplicates.foundGroups', {
                count: duplicateGroups.length,
                defaultValue: `Found ${duplicateGroups.length} duplicate groups`,
              })}
            </p>
          </div>
          <Copy className="h-8 w-8 text-orange-500" />
        </div>

        {/* Similarity Threshold Slider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('dataQuality.duplicates.similarityThreshold', 'Similarity Threshold')}
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="50"
              max="100"
              step="5"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm font-medium text-gray-900 dark:text-white w-16 text-right">
              {similarityThreshold}%
            </span>
          </div>
        </div>
      </div>

      {/* Duplicate Groups List */}
      {duplicateGroups.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow px-6 py-8 text-center text-gray-500 dark:text-gray-400">
          {t('dataQuality.duplicates.noDuplicates', 'No duplicate activities detected')}
        </div>
      ) : (
        <div className="space-y-4">
          {duplicateGroups.map((group, groupIndex) => {
            const isExpanded = expandedGroups.has(groupIndex);
            const isMerging = mergingGroups.has(groupIndex);
            const similarityColor = getSimilarityColor(group.avgSimilarity);

            return (
              <div
                key={groupIndex}
                className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
              >
                {/* Group Header */}
                <div
                  className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => toggleGroupExpansion(groupIndex)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {t('dataQuality.duplicates.group', 'Group {{index}}', {
                            index: groupIndex + 1,
                          })}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {group.activities.length}{' '}
                          {t('dataQuality.duplicates.activities', 'activities')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${similarityColor}`}>
                        <Percent className="h-3 w-3 inline mr-1" />
                        {Math.round(group.avgSimilarity)}% {t('dataQuality.duplicates.similar', 'similar')}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMergeGroup(group, groupIndex);
                        }}
                        disabled={isMerging}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                      >
                        {isMerging ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <GitMerge className="h-4 w-4" />
                        )}
                        {t('dataQuality.duplicates.merge', 'Merge')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Group Activities */}
                {isExpanded && (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {group.activities.map((activity, activityIndex) => (
                      <div
                        key={activityIndex}
                        className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h5 className="font-medium text-gray-900 dark:text-white">
                                {activity.title}
                              </h5>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${getSourceBadgeColor(activity.sourceType)}`}
                              >
                                {activity.sourceType}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <span>{formatDate(activity.startTime)}</span>
                              <span>
                                {formatTime(activity.startTime)} - {formatTime(activity.endTime)}
                              </span>
                              <span className="font-medium">{formatDuration(activity.duration, t)}</span>
                            </div>
                            {activity.categoryName && (
                              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {t('common.category', 'Category')}: {activity.categoryName}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DuplicateDetection;
