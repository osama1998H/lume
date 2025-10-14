import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  CheckCircle,
  Trash2,
  RefreshCw,
  Shield,
  Database,
  TrendingUp,
} from 'lucide-react';
import { UnifiedActivity } from '../../../types';
import { formatDuration, formatTime, formatDate } from '../../../utils/format';

interface DataCleanupProps {
  startDate: string;
  endDate: string;
  onRefresh?: () => void;
}

interface QualityReport {
  totalActivities: number;
  validActivities: number;
  invalidActivities: number;
  warningsCount: number;
  orphanedCount: number;
  zeroDurationCount: number;
  gapsCount: number;
  duplicateGroupsCount: number;
  qualityScore: number;
}

const DataCleanup: React.FC<DataCleanupProps> = ({ startDate, endDate, onRefresh }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'quality' | 'orphaned' | 'zero' | 'recalculate' | 'validate'>('quality');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quality Report State
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);

  // Orphaned Activities State
  const [orphanedActivities, setOrphanedActivities] = useState<UnifiedActivity[]>([]);

  // Zero Duration State
  const [zeroDurationActivities, setZeroDurationActivities] = useState<UnifiedActivity[]>([]);

  // Validation State
  const [validationResults, setValidationResults] = useState<{
    valid: Array<{ activity: UnifiedActivity; warnings: string[] }>;
    invalid: Array<{ activity: UnifiedActivity; errors: string[]; warnings: string[] }>;
  } | null>(null);

  // Recalculation State
  const [recalculationResult, setRecalculationResult] = useState<{
    success: boolean;
    recalculated: number;
    errors: string[];
  } | null>(null);

  // Load functions depend on the same props (startDate, endDate) that are in the dependency array
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (activeTab === 'quality') {
      loadQualityReport();
    } else if (activeTab === 'orphaned') {
      loadOrphanedActivities();
    } else if (activeTab === 'zero') {
      loadZeroDurationActivities();
    } else if (activeTab === 'validate') {
      loadValidationResults();
    }
  }, [activeTab, startDate, endDate]);

  const loadQualityReport = async () => {
    if (!window.electronAPI) return;

    try {
      setLoading(true);
      setError(null);
      const report = await window.electronAPI.getDataQualityReport(startDate, endDate);
      setQualityReport(report);
    } catch (err) {
      console.error('Failed to load quality report:', err);
      setError(t('dataQuality.cleanup.loadError', 'Failed to load quality report'));
    } finally {
      setLoading(false);
    }
  };

  const loadOrphanedActivities = async () => {
    if (!window.electronAPI) return;

    try {
      setLoading(true);
      setError(null);
      const activities = await window.electronAPI.findOrphanedActivities(startDate, endDate);
      setOrphanedActivities(activities);
    } catch (err) {
      console.error('Failed to load orphaned activities:', err);
      setError(t('dataQuality.cleanup.loadError', 'Failed to load orphaned activities'));
    } finally {
      setLoading(false);
    }
  };

  const loadZeroDurationActivities = async () => {
    if (!window.electronAPI) return;

    try {
      setLoading(true);
      setError(null);
      const result = await window.electronAPI.findZeroDurationActivities(startDate, endDate, false);
      setZeroDurationActivities(result.activities);
    } catch (err) {
      console.error('Failed to load zero-duration activities:', err);
      setError(t('dataQuality.cleanup.loadError', 'Failed to load zero-duration activities'));
    } finally {
      setLoading(false);
    }
  };

  const loadValidationResults = async () => {
    if (!window.electronAPI) return;

    try {
      setLoading(true);
      setError(null);
      const results = await window.electronAPI.validateActivitiesBatch(startDate, endDate);
      setValidationResults(results);
    } catch (err) {
      console.error('Failed to validate activities:', err);
      setError(t('dataQuality.cleanup.loadError', 'Failed to validate activities'));
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateDurations = async () => {
    if (!window.electronAPI) return;

    try {
      setLoading(true);
      setError(null);
      const result = await window.electronAPI.recalculateActivityDurations(startDate, endDate);
      setRecalculationResult(result);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to recalculate durations:', err);
      setError(t('dataQuality.cleanup.recalculateError', 'Failed to recalculate durations'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveZeroDuration = async () => {
    if (!window.electronAPI) return;

    if (!confirm(t('dataQuality.cleanup.confirmRemoveZero', 'Are you sure you want to remove all zero-duration activities?'))) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await window.electronAPI.findZeroDurationActivities(startDate, endDate, true);
      alert(
        t('dataQuality.cleanup.removedCount', {
          count: result.removed,
          defaultValue: `Removed ${result.removed} zero-duration activities`,
        })
      );
      loadZeroDurationActivities();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to remove zero-duration activities:', err);
      setError(t('dataQuality.cleanup.removeError', 'Failed to remove activities'));
    } finally {
      setLoading(false);
    }
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const tabs = [
    { id: 'quality', label: t('dataQuality.cleanup.qualityReport', 'Quality Report'), icon: TrendingUp },
    { id: 'orphaned', label: t('dataQuality.cleanup.orphaned', 'Orphaned Activities'), icon: Database },
    { id: 'zero', label: t('dataQuality.cleanup.zeroDuration', 'Zero Duration'), icon: AlertCircle },
    { id: 'recalculate', label: t('dataQuality.cleanup.recalculate', 'Recalculate Durations'), icon: RefreshCw },
    { id: 'validate', label: t('dataQuality.cleanup.validate', 'Validate All'), icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
              {/* Quality Report Tab */}
              {activeTab === 'quality' && qualityReport && (
                <div className="space-y-6">
                  {/* Quality Score Card */}
                  <div className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {t('dataQuality.cleanup.overallQuality', 'Overall Data Quality')}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {t('dataQuality.cleanup.qualityDescription', 'Based on validation, gaps, and duplicates')}
                        </p>
                      </div>
                      <div className="text-center">
                        <div className={`text-5xl font-bold ${getQualityScoreColor(qualityReport.qualityScore)}`}>
                          {Math.round(qualityReport.qualityScore)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Statistics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('dataQuality.cleanup.totalActivities', 'Total Activities')}
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {qualityReport.totalActivities}
                      </p>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {t('dataQuality.cleanup.validActivities', 'Valid Activities')}
                      </p>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
                        {qualityReport.validActivities}
                      </p>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {t('dataQuality.cleanup.invalidActivities', 'Invalid Activities')}
                      </p>
                      <p className="text-2xl font-bold text-red-900 dark:text-red-100 mt-1">
                        {qualityReport.invalidActivities}
                      </p>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        {t('dataQuality.cleanup.warnings', 'Warnings')}
                      </p>
                      <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100 mt-1">
                        {qualityReport.warningsCount}
                      </p>
                    </div>

                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                      <p className="text-sm text-orange-600 dark:text-orange-400">
                        {t('dataQuality.cleanup.orphanedActivities', 'Orphaned')}
                      </p>
                      <p className="text-2xl font-bold text-orange-900 dark:text-orange-100 mt-1">
                        {qualityReport.orphanedCount}
                      </p>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                      <p className="text-sm text-purple-600 dark:text-purple-400">
                        {t('dataQuality.cleanup.zeroDurationActivities', 'Zero Duration')}
                      </p>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                        {qualityReport.zeroDurationCount}
                      </p>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        {t('dataQuality.cleanup.timeGaps', 'Time Gaps')}
                      </p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                        {qualityReport.gapsCount}
                      </p>
                    </div>

                    <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-4">
                      <p className="text-sm text-pink-600 dark:text-pink-400">
                        {t('dataQuality.cleanup.duplicateGroups', 'Duplicate Groups')}
                      </p>
                      <p className="text-2xl font-bold text-pink-900 dark:text-pink-100 mt-1">
                        {qualityReport.duplicateGroupsCount}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Orphaned Activities Tab */}
              {activeTab === 'orphaned' && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t('dataQuality.cleanup.orphanedFound', {
                        count: orphanedActivities.length,
                        defaultValue: `Found ${orphanedActivities.length} orphaned activities`,
                      })}
                    </h4>
                  </div>
                  {orphanedActivities.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                      <p>{t('dataQuality.cleanup.noOrphaned', 'No orphaned activities found')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {orphanedActivities.map((activity) => (
                        <div
                          key={`${activity.sourceType}-${activity.id}`}
                          className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="font-medium text-gray-900 dark:text-white">
                                {activity.title}
                              </h5>
                              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                                <span>{formatDate(activity.startTime)}</span>
                                <span>
                                  {formatTime(activity.startTime)} - {formatTime(activity.endTime)}
                                </span>
                                <span>{formatDuration(activity.duration, t)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Zero Duration Tab */}
              {activeTab === 'zero' && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t('dataQuality.cleanup.zeroDurationFound', {
                        count: zeroDurationActivities.length,
                        defaultValue: `Found ${zeroDurationActivities.length} zero-duration activities`,
                      })}
                    </h4>
                    {zeroDurationActivities.length > 0 && (
                      <button
                        onClick={handleRemoveZeroDuration}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        {t('dataQuality.cleanup.removeAll', 'Remove All')}
                      </button>
                    )}
                  </div>
                  {zeroDurationActivities.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                      <p>{t('dataQuality.cleanup.noZeroDuration', 'No zero-duration activities found')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {zeroDurationActivities.map((activity) => (
                        <div
                          key={`${activity.sourceType}-${activity.id}`}
                          className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="font-medium text-gray-900 dark:text-white">
                                {activity.title}
                              </h5>
                              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                                <span>{formatDate(activity.startTime)}</span>
                                <span>{formatTime(activity.startTime)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Recalculate Tab */}
              {activeTab === 'recalculate' && (
                <div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {t('dataQuality.cleanup.recalculateTitle', 'Recalculate Activity Durations')}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {t(
                        'dataQuality.cleanup.recalculateDescription',
                        'This will recalculate durations for all activities based on their start and end times.'
                      )}
                    </p>
                    <button
                      onClick={handleRecalculateDurations}
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                    >
                      <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                      {t('dataQuality.cleanup.startRecalculation', 'Start Recalculation')}
                    </button>
                  </div>

                  {recalculationResult && (
                    <div
                      className={`rounded-lg p-6 ${
                        recalculationResult.success
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {recalculationResult.success ? (
                          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
                        )}
                        <div>
                          <h5
                            className={`font-semibold mb-2 ${
                              recalculationResult.success
                                ? 'text-green-900 dark:text-green-100'
                                : 'text-red-900 dark:text-red-100'
                            }`}
                          >
                            {recalculationResult.success
                              ? t('dataQuality.cleanup.recalculationSuccess', 'Recalculation Complete')
                              : t('dataQuality.cleanup.recalculationError', 'Recalculation Failed')}
                          </h5>
                          <p
                            className={`text-sm ${
                              recalculationResult.success
                                ? 'text-green-800 dark:text-green-200'
                                : 'text-red-800 dark:text-red-200'
                            }`}
                          >
                            {t('dataQuality.cleanup.recalculatedCount', {
                              count: recalculationResult.recalculated,
                              defaultValue: `Recalculated ${recalculationResult.recalculated} activities`,
                            })}
                          </p>
                          {recalculationResult.errors.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                                {t('common.errors', 'Errors')}:
                              </p>
                              <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1">
                                {recalculationResult.errors.map((error, index) => (
                                  <li key={index}>{error}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Validate Tab */}
              {activeTab === 'validate' && validationResults && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="text-sm text-green-600 dark:text-green-400">
                            {t('dataQuality.cleanup.validActivities', 'Valid Activities')}
                          </p>
                          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                            {validationResults.valid.length}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                        <div>
                          <p className="text-sm text-red-600 dark:text-red-400">
                            {t('dataQuality.cleanup.invalidActivities', 'Invalid Activities')}
                          </p>
                          <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                            {validationResults.invalid.length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {validationResults.invalid.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        {t('dataQuality.cleanup.invalidActivitiesList', 'Invalid Activities')}
                      </h4>
                      <div className="space-y-2">
                        {validationResults.invalid.map((result, index) => (
                          <div
                            key={index}
                            className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800"
                          >
                            <h5 className="font-medium text-red-900 dark:text-red-100">
                              {result.activity.title}
                            </h5>
                            <div className="text-sm text-red-700 dark:text-red-300 mt-2">
                              <p className="font-medium">{t('common.errors', 'Errors')}:</p>
                              <ul className="list-disc list-inside mt-1 space-y-1">
                                {result.errors.map((error, errorIndex) => (
                                  <li key={errorIndex}>{error}</li>
                                ))}
                              </ul>
                            </div>
                            {result.warnings.length > 0 && (
                              <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                                <p className="font-medium">{t('common.warnings', 'Warnings')}:</p>
                                <ul className="list-disc list-inside mt-1 space-y-1">
                                  {result.warnings.map((warning, warningIndex) => (
                                    <li key={warningIndex}>{warning}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataCleanup;
