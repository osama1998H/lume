import type { CSSProperties } from 'react';
import type { Tag } from './categories';
import type { CategoryStats } from './categories';

// Timeline Types
export interface TimelineActivity {
  id: number;
  type: 'app' | 'browser' | 'time_entry';
  title: string;
  startTime: string;
  endTime: string;
  duration: number; // in seconds
  categoryId?: number;
  categoryName?: string;
  categoryColor?: string;
  tags?: Tag[];
  metadata?: {
    appName?: string;
    windowTitle?: string;
    domain?: string;
    url?: string;
    isIdle?: boolean;
  };
}

export interface TimelineItem {
  id: number;
  group: number;
  title: string;
  start_time: number; // timestamp
  end_time: number; // timestamp
  canMove: boolean;
  canResize: boolean;
  canChangeGroup: boolean;
  itemProps?: {
    className?: string;
    style?: CSSProperties;
  };
}

export interface TimelineGroup {
  id: number;
  title: string;
  stackItems?: boolean;
  height?: number;
}

export interface TimelineFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  activityTypes: ('app' | 'browser' | 'time_entry')[];
  categories: number[];
  tags: number[];
  searchQuery: string;
}

export interface TimelineSummary {
  totalActivities: number;
  totalDuration: number; // in seconds
  averageDuration: number; // in seconds
  longestActivity: TimelineActivity | null;
  categoryBreakdown: CategoryStats[];
}
