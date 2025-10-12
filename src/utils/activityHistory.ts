import type { UnifiedActivity, ActivitySourceType } from '../types';

/**
 * History Action Types
 */
export type ActionType = 'create' | 'update' | 'delete' | 'bulk_update' | 'bulk_delete' | 'merge';

/**
 * History Action Interface
 * Represents a single undoable/redoable action
 */
export interface HistoryAction {
  type: ActionType;
  timestamp: string;
  description: string; // Human-readable description
  payload: {
    before: any; // State before action
    after: any; // State after action
  };
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

/**
 * HistoryManager Class
 * Manages undo/redo history with a stack-based approach
 */
export class HistoryManager {
  private undoStack: HistoryAction[] = [];
  private redoStack: HistoryAction[] = [];
  private maxSize: number;
  private listeners: Set<() => void> = new Set();

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  /**
   * Add a new action to the history
   * Clears the redo stack
   */
  addAction(action: HistoryAction): void {
    this.undoStack.push(action);
    this.redoStack = []; // Clear redo stack when new action is added

    // Prune oldest actions if stack exceeds maxSize
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }

    this.notifyListeners();
  }

  /**
   * Undo the last action
   */
  async undo(): Promise<void> {
    if (!this.canUndo()) {
      throw new Error('No actions to undo');
    }

    const action = this.undoStack.pop()!;
    try {
      await action.undo();
      this.redoStack.push(action);
      this.notifyListeners();
    } catch (error) {
      // Restore action to stack if undo fails
      this.undoStack.push(action);
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * Redo the last undone action
   */
  async redo(): Promise<void> {
    if (!this.canRedo()) {
      throw new Error('No actions to redo');
    }

    const action = this.redoStack.pop()!;
    try {
      await action.redo();
      this.undoStack.push(action);
      this.notifyListeners();
    } catch (error) {
      // Restore action to stack if redo fails
      this.redoStack.push(action);
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get the last N actions from history
   */
  getHistory(limit: number = 10): HistoryAction[] {
    return this.undoStack.slice(-limit).reverse();
  }

  /**
   * Get the last action description
   */
  getLastActionDescription(): string | null {
    const lastAction = this.undoStack[this.undoStack.length - 1];
    return lastAction ? lastAction.description : null;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notifyListeners();
  }

  /**
   * Get the size of the undo stack
   */
  getUndoCount(): number {
    return this.undoStack.length;
  }

  /**
   * Get the size of the redo stack
   */
  getRedoCount(): number {
    return this.redoStack.length;
  }

  /**
   * Add a listener that gets notified when history changes
   */
  addListener(listener: () => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove a listener
   */
  removeListener(listener: () => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

/**
 * Create activity creation action
 */
export const createActivityCreationAction = (
  activity: UnifiedActivity,
  onUndo: (id: number, sourceType: ActivitySourceType) => Promise<void>,
  onRedo: (activity: UnifiedActivity) => Promise<void>
): HistoryAction => {
  return {
    type: 'create',
    timestamp: new Date().toISOString(),
    description: `Created activity: ${activity.title}`,
    payload: {
      before: null,
      after: activity,
    },
    undo: async () => {
      await onUndo(activity.id, activity.sourceType);
    },
    redo: async () => {
      await onRedo(activity);
    },
  };
};

/**
 * Create activity update action
 */
export const createActivityUpdateAction = (
  activityBefore: UnifiedActivity,
  activityAfter: UnifiedActivity,
  onUndo: (activity: UnifiedActivity) => Promise<void>,
  onRedo: (activity: UnifiedActivity) => Promise<void>
): HistoryAction => {
  return {
    type: 'update',
    timestamp: new Date().toISOString(),
    description: `Updated activity: ${activityAfter.title}`,
    payload: {
      before: activityBefore,
      after: activityAfter,
    },
    undo: async () => {
      await onUndo(activityBefore);
    },
    redo: async () => {
      await onRedo(activityAfter);
    },
  };
};

/**
 * Create activity deletion action
 */
export const createActivityDeletionAction = (
  activity: UnifiedActivity,
  onUndo: (activity: UnifiedActivity) => Promise<void>,
  onRedo: (id: number, sourceType: ActivitySourceType) => Promise<void>
): HistoryAction => {
  return {
    type: 'delete',
    timestamp: new Date().toISOString(),
    description: `Deleted activity: ${activity.title}`,
    payload: {
      before: activity,
      after: null,
    },
    undo: async () => {
      await onUndo(activity);
    },
    redo: async () => {
      await onRedo(activity.id, activity.sourceType);
    },
  };
};

/**
 * Create bulk update action
 */
export const createBulkUpdateAction = (
  activitiesBefore: UnifiedActivity[],
  activitiesAfter: UnifiedActivity[],
  onUndo: (activities: UnifiedActivity[]) => Promise<void>,
  onRedo: (activities: UnifiedActivity[]) => Promise<void>
): HistoryAction => {
  return {
    type: 'bulk_update',
    timestamp: new Date().toISOString(),
    description: `Updated ${activitiesAfter.length} activities`,
    payload: {
      before: activitiesBefore,
      after: activitiesAfter,
    },
    undo: async () => {
      await onUndo(activitiesBefore);
    },
    redo: async () => {
      await onRedo(activitiesAfter);
    },
  };
};

/**
 * Create bulk delete action
 */
export const createBulkDeleteAction = (
  activities: UnifiedActivity[],
  onUndo: (activities: UnifiedActivity[]) => Promise<void>,
  onRedo: (ids: Array<{ id: number; sourceType: ActivitySourceType }>) => Promise<void>
): HistoryAction => {
  return {
    type: 'bulk_delete',
    timestamp: new Date().toISOString(),
    description: `Deleted ${activities.length} activities`,
    payload: {
      before: activities,
      after: null,
    },
    undo: async () => {
      await onUndo(activities);
    },
    redo: async () => {
      const ids = activities.map(a => ({ id: a.id, sourceType: a.sourceType }));
      await onRedo(ids);
    },
  };
};

/**
 * Create merge action
 */
export const createMergeAction = (
  activitiesBefore: UnifiedActivity[],
  activityAfter: UnifiedActivity,
  onUndo: (activities: UnifiedActivity[], mergedId: number) => Promise<void>,
  onRedo: (activities: UnifiedActivity[]) => Promise<void>
): HistoryAction => {
  return {
    type: 'merge',
    timestamp: new Date().toISOString(),
    description: `Merged ${activitiesBefore.length} activities`,
    payload: {
      before: activitiesBefore,
      after: activityAfter,
    },
    undo: async () => {
      await onUndo(activitiesBefore, activityAfter.id);
    },
    redo: async () => {
      await onRedo(activitiesBefore);
    },
  };
};

/**
 * Format action description for display
 */
export const formatActionDescription = (action: HistoryAction, t: any): string => {
  const timeDiff = Date.now() - new Date(action.timestamp).getTime();
  const minutesAgo = Math.floor(timeDiff / 60000);
  const hoursAgo = Math.floor(minutesAgo / 60);

  let timeAgo: string;
  if (minutesAgo < 1) {
    timeAgo = 'just now';
  } else if (minutesAgo < 60) {
    timeAgo = `${minutesAgo}m ago`;
  } else if (hoursAgo < 24) {
    timeAgo = `${hoursAgo}h ago`;
  } else {
    timeAgo = new Date(action.timestamp).toLocaleDateString();
  }

  return `${action.description} (${timeAgo})`;
};
