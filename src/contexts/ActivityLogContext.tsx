import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import type { UnifiedActivity, UnifiedActivityFilters, ActivitySourceType } from '../types';
import { HistoryManager, type HistoryAction } from '../utils/activityHistory';
import { logger } from '../services/logging/RendererLogger';

// View type for tab switching
export type ActivityLogView = 'list' | 'timeline' | 'calendar';

// Selected activity identifier
export interface SelectedActivity {
  id: number;
  sourceType: ActivitySourceType;
}

// Context state interface
interface ActivityLogContextState {
  // View state
  activeView: ActivityLogView;
  setActiveView: (view: ActivityLogView) => void;

  // Date range
  dateRange: { start: Date; end: Date };
  setDateRange: (range: { start: Date; end: Date }) => void;

  // Filters
  filters: UnifiedActivityFilters;
  setFilters: (filters: UnifiedActivityFilters) => void;

  // Activities data
  activities: UnifiedActivity[];
  setActivities: (activities: UnifiedActivity[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;

  // Selection state
  selectedActivities: Set<string>; // Using string key: "id:sourceType"
  toggleSelection: (activity: SelectedActivity) => void;
  selectAll: () => void;
  clearSelection: () => void;
  isSelected: (activity: SelectedActivity) => boolean;
  selectionCount: number;

  // Bulk mode
  bulkMode: boolean;
  setBulkMode: (mode: boolean) => void;

  // Edit mode (for timeline drag/drop)
  editMode: boolean;
  setEditMode: (mode: boolean) => void;

  // Conflict detection
  conflicts: Set<string>; // Set of activity keys that have conflicts
  detectConflicts: (activities?: UnifiedActivity[]) => void;

  // Refresh callback
  refreshActivities: () => Promise<void>;
  setRefreshCallback: (callback: () => Promise<void>) => void;

  // Undo/Redo
  history: HistoryManager;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  recentActions: HistoryAction[];
}

// Create context
const ActivityLogContext = createContext<ActivityLogContextState | undefined>(undefined);

// Helper function to create selection key
const createSelectionKey = (activity: SelectedActivity): string => {
  return `${activity.id}:${activity.sourceType}`;
};

// Helper function to parse selection key
const parseSelectionKey = (key: string): SelectedActivity => {
  const [id, sourceType] = key.split(':');
  const idValue = id;
  const sourceTypeValue = sourceType;

  if (!idValue || !sourceTypeValue) {
    throw new Error(`Invalid selection key format: ${key}`);
  }

  const parsedId = parseInt(idValue, 10);
  if (isNaN(parsedId)) {
    throw new Error(`Invalid numeric ID in selection key: ${key}`);
  }

  return {
    id: parsedId,
    sourceType: sourceTypeValue as ActivitySourceType,
  };
};

// Provider props
interface ActivityLogProviderProps {
  children: ReactNode;
}

// Provider component
export const ActivityLogProvider: React.FC<ActivityLogProviderProps> = ({ children }) => {
  // View state
  const [activeView, setActiveView] = useState<ActivityLogView>('list');

  // Date range (default: today)
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(new Date().setHours(0, 0, 0, 0)),
    end: new Date(new Date().setHours(23, 59, 59, 999)),
  });

  // Filters
  const [filters, setFilters] = useState<UnifiedActivityFilters>({
    dateRange: {
      start: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
      end: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
    },
    sourceTypes: ['manual', 'automatic', 'pomodoro'],
    categories: [],
    tags: [],
    searchQuery: '',
  });

  // Activities data
  const [activities, setActivities] = useState<UnifiedActivity[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Selection state
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState<boolean>(false);

  // Edit mode
  const [editMode, setEditMode] = useState<boolean>(false);

  // Conflict detection
  const [conflicts, setConflicts] = useState<Set<string>>(new Set());

  // Refresh callback
  const [refreshCallback, setRefreshCallback] = useState<(() => Promise<void>) | null>(null);

  // Undo/Redo history
  const [history] = useState(() => new HistoryManager(50));
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [recentActions, setRecentActions] = useState<HistoryAction[]>([]);

  // Toggle selection
  const toggleSelection = useCallback((activity: SelectedActivity) => {
    const key = createSelectionKey(activity);
    setSelectedActivities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  // Select all
  const selectAll = useCallback(() => {
    const allKeys = activities.map(activity =>
      createSelectionKey({ id: activity.id, sourceType: activity.sourceType })
    );
    setSelectedActivities(new Set(allKeys));
  }, [activities]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedActivities(new Set());
    setBulkMode(false);
  }, []);

  // Check if activity is selected
  const isSelected = useCallback((activity: SelectedActivity): boolean => {
    const key = createSelectionKey(activity);
    return selectedActivities.has(key);
  }, [selectedActivities]);

  // Get selection count
  const selectionCount = selectedActivities.size;

  // Detect conflicts in activities
  const detectConflicts = useCallback((activitiesToCheck?: UnifiedActivity[]) => {
    const acts = activitiesToCheck || activities;
    const conflictSet = new Set<string>();

    // Check for overlapping activities (O(n²) algorithm)
    for (let i = 0; i < acts.length; i++) {
      for (let j = i + 1; j < acts.length; j++) {
        const a1 = acts[i];
        const a2 = acts[j];

        // Guard against undefined array access
        if (!a1 || !a2) continue;

        // Skip activities without endTime
        if (!a1.endTime || !a2.endTime) continue;

        const start1 = new Date(a1.startTime).getTime();
        const end1 = new Date(a1.endTime).getTime();
        const start2 = new Date(a2.startTime).getTime();
        const end2 = new Date(a2.endTime).getTime();

        // Check for overlap: start1 < end2 && end1 > start2
        if (start1 < end2 && end1 > start2) {
          conflictSet.add(createSelectionKey({ id: a1.id, sourceType: a1.sourceType }));
          conflictSet.add(createSelectionKey({ id: a2.id, sourceType: a2.sourceType }));
        }
      }
    }

    setConflicts(conflictSet);
  }, [activities]);

  // Refresh activities
  const refreshActivities = useCallback(async () => {
    if (refreshCallback) {
      await refreshCallback();
    }
  }, [refreshCallback]);

  // Set refresh callback wrapper
  const setRefreshCallbackWrapper = useCallback((callback: () => Promise<void>) => {
    setRefreshCallback(() => callback);
  }, []);

  // Update history state when history changes
  useEffect(() => {
    const updateHistoryState = () => {
      setCanUndo(history.canUndo());
      setCanRedo(history.canRedo());
      setRecentActions(history.getHistory(10));
    };

    history.addListener(updateHistoryState);
    updateHistoryState(); // Initial update

    return () => {
      history.removeListener(updateHistoryState);
    };
  }, [history]);

  // Undo function
  const undo = useCallback(async () => {
    try {
      await history.undo();
      await refreshActivities(); // Refresh to show updated state
    } catch (error) {
      logger.error('Failed to undo action', {}, error instanceof Error ? error : undefined);
      throw error;
    }
  }, [history, refreshActivities]);

  // Redo function
  const redo = useCallback(async () => {
    try {
      await history.redo();
      await refreshActivities(); // Refresh to show updated state
    } catch (error) {
      logger.error('Failed to redo action', {}, error instanceof Error ? error : undefined);
      throw error;
    }
  }, [history, refreshActivities]);

  const value: ActivityLogContextState = {
    activeView,
    setActiveView,
    dateRange,
    setDateRange,
    filters,
    setFilters,
    activities,
    setActivities,
    loading,
    setLoading,
    selectedActivities,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    selectionCount,
    bulkMode,
    setBulkMode,
    editMode,
    setEditMode,
    conflicts,
    detectConflicts,
    refreshActivities,
    setRefreshCallback: setRefreshCallbackWrapper,
    history,
    undo,
    redo,
    canUndo,
    canRedo,
    recentActions,
  };

  return (
    <ActivityLogContext.Provider value={value}>
      {children}
    </ActivityLogContext.Provider>
  );
};

// Hook to use context
export const useActivityLog = (): ActivityLogContextState => {
  const context = useContext(ActivityLogContext);
  if (!context) {
    throw new Error('useActivityLog must be used within ActivityLogProvider');
  }
  return context;
};

// Export helper functions
export { createSelectionKey, parseSelectionKey };
