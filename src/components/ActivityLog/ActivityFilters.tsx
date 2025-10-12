import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Filter, Save, ChevronDown, Trash2 } from 'lucide-react';
import { useActivityLog } from '../../contexts/ActivityLogContext';
import { useDebounce } from '../../hooks/useDebounce';
import type { UnifiedActivityFilters, Category, Tag, ActivitySourceType } from '../../types';
import DateRangeFilter from '../ui/DateRangeFilter';
import TagSelector from '../ui/TagSelector';

interface FilterPreset {
  id: string;
  name: string;
  filters: UnifiedActivityFilters;
  createdAt: string;
}

interface ActivityFiltersProps {
  categories: Category[];
  tags: Tag[];
  onClose?: () => void;
}

/**
 * ActivityFilters Component
 * Comprehensive filtering UI for the Activity Log
 * Supports date ranges, activity types, categories, tags, duration, and search
 */
const ActivityFilters: React.FC<ActivityFiltersProps> = ({ categories, tags, onClose }) => {
  const { t } = useTranslation();
  const { filters, setFilters, dateRange, setDateRange } = useActivityLog();

  // Local state for filter inputs
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery || '');
  const [selectedSourceTypes, setSelectedSourceTypes] = useState<ActivitySourceType[]>(
    filters.sourceTypes || ['manual', 'automatic', 'pomodoro']
  );
  const [selectedCategories, setSelectedCategories] = useState<number[]>(filters.categories || []);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [minDuration, setMinDuration] = useState<number>(filters.minDuration || 0);
  const [maxDuration, setMaxDuration] = useState<number>(filters.maxDuration || 480); // 8 hours default max
  const [dateRangePreset, setDateRangePreset] = useState<string>('today');

  // Filter presets
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [showPresets, setShowPresets] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Debounce search query for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Load presets from localStorage
  useEffect(() => {
    const savedPresets = localStorage.getItem('activityFilterPresets');
    if (savedPresets) {
      try {
        setPresets(JSON.parse(savedPresets));
      } catch (error) {
        console.error('Failed to load filter presets:', error);
      }
    }
  }, []);

  // Load selected tags from filter
  useEffect(() => {
    if (filters.tags && filters.tags.length > 0) {
      const filterTags = tags.filter(tag => filters.tags?.includes(tag.id!));
      setSelectedTags(filterTags);
    }
  }, [filters.tags, tags]);

  // Apply filters when debounced search query changes
  useEffect(() => {
    applyFilters();
  }, [debouncedSearchQuery]);

  // Apply filters to context
  const applyFilters = useCallback(() => {
    const newFilters: UnifiedActivityFilters = {
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      },
      sourceTypes: selectedSourceTypes,
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      tags: selectedTags.length > 0 ? selectedTags.map(t => t.id!).filter(id => id !== undefined) : undefined,
      searchQuery: debouncedSearchQuery.trim() || undefined,
      minDuration: minDuration > 0 ? minDuration * 60 : undefined, // Convert to seconds
      maxDuration: maxDuration < 480 ? maxDuration * 60 : undefined, // Convert to seconds
    };
    setFilters(newFilters);
  }, [dateRange, selectedSourceTypes, selectedCategories, selectedTags, debouncedSearchQuery, minDuration, maxDuration, setFilters]);

  // Handle date range preset changes
  const handleDateRangeChange = (preset: string) => {
    setDateRangePreset(preset);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let start = new Date(today);
    let end = new Date(today);
    end.setHours(23, 59, 59, 999);

    switch (preset) {
      case 'today':
        // Already set
        break;
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        end.setDate(end.getDate() - 1);
        break;
      case 'last7days':
        start.setDate(start.getDate() - 6);
        break;
      case 'last30days':
        start.setDate(start.getDate() - 29);
        break;
      case 'thisMonth':
        start.setDate(1);
        break;
    }

    setDateRange({ start, end });
    applyFilters();
  };

  // Handle source type toggle
  const toggleSourceType = (type: ActivitySourceType) => {
    setSelectedSourceTypes(prev => {
      const newTypes = prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type];
      return newTypes.length > 0 ? newTypes : prev; // Don't allow empty
    });
  };

  // Handle category toggle
  const toggleCategory = (categoryId: number) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSourceTypes(['manual', 'automatic', 'pomodoro']);
    setSelectedCategories([]);
    setSelectedTags([]);
    setMinDuration(0);
    setMaxDuration(480);
    setDateRangePreset('today');
    handleDateRangeChange('today');
  };

  // Save current filters as preset
  const savePreset = () => {
    if (!presetName.trim()) return;

    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      filters: {
        dateRange: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString(),
        },
        sourceTypes: selectedSourceTypes,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        tags: selectedTags.length > 0 ? selectedTags.map(t => t.id!).filter(id => id !== undefined) : undefined,
        searchQuery: searchQuery.trim() || undefined,
        minDuration: minDuration > 0 ? minDuration * 60 : undefined,
        maxDuration: maxDuration < 480 ? maxDuration * 60 : undefined,
      },
      createdAt: new Date().toISOString(),
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem('activityFilterPresets', JSON.stringify(updatedPresets));
    setPresetName('');
    setShowSaveDialog(false);
  };

  // Load a preset
  const loadPreset = (preset: FilterPreset) => {
    const { filters: presetFilters } = preset;

    // Load date range
    setDateRange({
      start: new Date(presetFilters.dateRange.start),
      end: new Date(presetFilters.dateRange.end),
    });

    // Load other filters
    setSelectedSourceTypes(presetFilters.sourceTypes || ['manual', 'automatic', 'pomodoro']);
    setSelectedCategories(presetFilters.categories || []);
    setSearchQuery(presetFilters.searchQuery || '');
    setMinDuration(presetFilters.minDuration ? presetFilters.minDuration / 60 : 0);
    setMaxDuration(presetFilters.maxDuration ? presetFilters.maxDuration / 60 : 480);

    // Load tags
    if (presetFilters.tags) {
      const presetTags = tags.filter(tag => presetFilters.tags?.includes(tag.id!));
      setSelectedTags(presetTags);
    } else {
      setSelectedTags([]);
    }

    setShowPresets(false);
    applyFilters();
  };

  // Delete a preset
  const deletePreset = (presetId: string) => {
    const updatedPresets = presets.filter(p => p.id !== presetId);
    setPresets(updatedPresets);
    localStorage.setItem('activityFilterPresets', JSON.stringify(updatedPresets));
  };

  // Count active filters
  const activeFilterCount = () => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedSourceTypes.length < 3) count++;
    if (selectedCategories.length > 0) count++;
    if (selectedTags.length > 0) count++;
    if (minDuration > 0) count++;
    if (maxDuration < 480) count++;
    return count;
  };

  return (
    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('activityLog.filters.title', 'Filters')}
          </h3>
          {activeFilterCount() > 0 && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400">
              {activeFilterCount()} active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Presets Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{t('activityLog.filters.loadPreset', 'Presets')}</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {showPresets && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50">
                <div className="p-2 max-h-64 overflow-y-auto">
                  {presets.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 p-2">
                      No saved presets
                    </p>
                  ) : (
                    presets.map(preset => (
                      <div
                        key={preset.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg group"
                      >
                        <button
                          onClick={() => loadPreset(preset)}
                          className="flex-1 text-left text-sm text-gray-900 dark:text-white"
                        >
                          {preset.name}
                        </button>
                        <button
                          onClick={() => deletePreset(preset.id)}
                          className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                  <button
                    onClick={() => {
                      setShowPresets(false);
                      setShowSaveDialog(true);
                    }}
                    className="w-full px-3 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                  >
                    {t('activityLog.filters.savePreset', 'Save Current Filters')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Clear All */}
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {t('activityLog.filters.clearFilters', 'Clear All')}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Save Preset Dialog */}
      {showSaveDialog && (
        <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Preset Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="e.g., Work Activities"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              onKeyPress={(e) => e.key === 'Enter' && savePreset()}
            />
            <button
              onClick={savePreset}
              disabled={!presetName.trim()}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowSaveDialog(false);
                setPresetName('');
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Date Range */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('activityLog.filters.dateRange', 'Date Range')}
          </label>
          <DateRangeFilter
            options={[
              { value: 'today', label: t('common.today', 'Today') },
              { value: 'yesterday', label: 'Yesterday' },
              { value: 'last7days', label: 'Last 7 Days' },
              { value: 'last30days', label: 'Last 30 Days' },
              { value: 'thisMonth', label: 'This Month' },
            ]}
            selectedValue={dateRangePreset}
            onChange={handleDateRangeChange}
          />
        </div>

        {/* Search */}
        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('common.search', 'Search')}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('activityLog.searchPlaceholder', 'Search activities...')}
              className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Activity Types */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('activityLog.filters.activityTypes', 'Activity Types')}
          </label>
          <div className="flex flex-wrap gap-2">
            {(['manual', 'automatic', 'pomodoro'] as ActivitySourceType[]).map(type => (
              <button
                key={type}
                onClick={() => toggleSourceType(type)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedSourceTypes.includes(type)
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {t(`activityLog.${type}`, type)}
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('activityLog.filters.categories', 'Categories')}
          </label>
          <div className="relative">
            <select
              multiple
              value={selectedCategories.map(String)}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                setSelectedCategories(selected);
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              size={3}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('activityLog.filters.tags', 'Tags')}
          </label>
          <TagSelector
            selectedTags={selectedTags}
            onChange={setSelectedTags}
            availableTags={tags}
            allowCreate={false}
            placeholder="Select tags..."
          />
        </div>

        {/* Duration Range */}
        <div className="lg:col-span-3">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('activityLog.filters.durationRange', 'Duration Range')} ({minDuration}m - {maxDuration === 480 ? '8h+' : `${maxDuration}m`})
          </label>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max="480"
                step="5"
                value={minDuration}
                onChange={(e) => setMinDuration(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">to</span>
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max="480"
                step="5"
                value={maxDuration}
                onChange={(e) => setMaxDuration(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Apply Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={applyFilters}
          className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors shadow-lg"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
};

export default ActivityFilters;
