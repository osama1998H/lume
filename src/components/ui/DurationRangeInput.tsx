import React from 'react';
import { useTranslation } from 'react-i18next';

interface DurationRangeInputProps {
  minValue: number; // in minutes
  maxValue: number; // in minutes
  maxDuration?: number; // maximum allowed duration in minutes
  onChange: (values: { min: number; max: number }) => void;
  className?: string;
}

/**
 * DurationRangeInput Component
 * Provides numeric inputs and preset buttons for selecting duration ranges
 * Supports dark mode and proper validation
 */
const DurationRangeInput: React.FC<DurationRangeInputProps> = ({
  minValue,
  maxValue,
  maxDuration = 480,
  onChange,
  className = '',
}) => {
  const { t } = useTranslation();

  // Convert minutes to hours and minutes
  const getHoursMinutes = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { hours, minutes };
  };

  const minHM = getHoursMinutes(minValue);
  const maxHM = getHoursMinutes(maxValue);

  // Handle min duration change
  const handleMinChange = (hours: number, minutes: number) => {
    const totalMinutes = Math.max(0, hours * 60 + minutes);
    const clampedMin = Math.min(totalMinutes, maxValue - 5); // Ensure at least 5 min gap
    onChange({ min: clampedMin, max: maxValue });
  };

  // Handle max duration change
  const handleMaxChange = (hours: number, minutes: number) => {
    const totalMinutes = Math.max(0, hours * 60 + minutes);
    const clampedMax = Math.max(totalMinutes, minValue + 5); // Ensure at least 5 min gap
    onChange({ min: minValue, max: Math.min(clampedMax, maxDuration) });
  };

  // Preset button configurations
  const presets = [
    { label: t('activityLog.filters.durationPresets.any', 'Any'), min: 0, max: maxDuration },
    { label: t('activityLog.filters.durationPresets.under30', '< 30m'), min: 0, max: 30 },
    { label: t('activityLog.filters.durationPresets.30to60', '30m - 1h'), min: 30, max: 60 },
    { label: t('activityLog.filters.durationPresets.60to120', '1h - 2h'), min: 60, max: 120 },
    { label: t('activityLog.filters.durationPresets.120to240', '2h - 4h'), min: 120, max: 240 },
    { label: t('activityLog.filters.durationPresets.over240', '> 4h'), min: 240, max: maxDuration },
  ];

  const handlePresetClick = (min: number, max: number) => {
    onChange({ min, max });
  };

  // Check if current values match a preset
  const isPresetActive = (min: number, max: number) => {
    return minValue === min && maxValue === max;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => handlePresetClick(preset.min, preset.max)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              isPresetActive(preset.min, preset.max)
                ? 'bg-primary-600 text-white dark:bg-primary-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Numeric Inputs */}
      <div className="grid grid-cols-2 gap-4">
        {/* Min Duration */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('activityLog.filters.minimum', 'Minimum')}
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="number"
                min="0"
                max="8"
                value={minHM.hours}
                onChange={(e) => handleMinChange(parseInt(e.target.value) || 0, minHM.minutes)}
                className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="0"
              />
              <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">{t('common.hours', 'hours')}</span>
            </div>
            <div className="flex-1">
              <input
                type="number"
                min="0"
                max="59"
                step="5"
                value={minHM.minutes}
                onChange={(e) => handleMinChange(minHM.hours, parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="0"
              />
              <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">{t('common.minutes', 'min')}</span>
            </div>
          </div>
        </div>

        {/* Max Duration */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('activityLog.filters.maximum', 'Maximum')}
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="number"
                min="0"
                max="8"
                value={maxHM.hours}
                onChange={(e) => handleMaxChange(parseInt(e.target.value) || 0, maxHM.minutes)}
                className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="8"
              />
              <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">{t('common.hours', 'hours')}</span>
            </div>
            <div className="flex-1">
              <input
                type="number"
                min="0"
                max="59"
                step="5"
                value={maxHM.minutes}
                onChange={(e) => handleMaxChange(maxHM.hours, parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="0"
              />
              <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">{t('common.minutes', 'min')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Current Range Display */}
      <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
        {t('activityLog.filters.showingActivities', 'Showing activities from')}{' '}
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {minValue === 0 ? '0 min' : minValue >= 60 ? `${Math.floor(minValue / 60)}h ${minValue % 60 > 0 ? `${minValue % 60}m` : ''}`.trim() : `${minValue} min`}
        </span>{' '}
        {t('common.to', 'to')}{' '}
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {maxValue >= maxDuration ? `${Math.floor(maxDuration / 60)}h+` : maxValue >= 60 ? `${Math.floor(maxValue / 60)}h ${maxValue % 60 > 0 ? `${maxValue % 60}m` : ''}`.trim() : `${maxValue} min`}
        </span>
      </div>
    </div>
  );
};

export default DurationRangeInput;
