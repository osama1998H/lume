import { TimeEntry, AppUsage } from '../types';

const toOptionalNumber = (value: unknown): number | undefined => {
  if (value == null) return undefined;

  const rawNumber = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(rawNumber) ? rawNumber : undefined;
};

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return undefined;
};

const pickString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    const stringValue = toOptionalString(value);
    if (stringValue) return stringValue;
  }
  return undefined;
};

const toDateISO = (value: unknown): string | undefined => {
  if (value == null) return undefined;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) return undefined;
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  }

  return undefined;
};

export const normalizeTimeEntry = (raw: any): TimeEntry | null => {
  if (!raw) return null;

  const startTime = toDateISO(raw.startTime) ?? toDateISO(raw.start_time) ?? toDateISO(raw.start_date);
  if (!startTime) return null;
  const endTime = toDateISO(raw.endTime) ?? toDateISO(raw.end_time) ?? undefined;
  let durationMinutes = toOptionalNumber(raw.duration ?? raw.durationMinutes ?? raw.duration_minutes);

  if ((durationMinutes == null || Number.isNaN(durationMinutes)) && endTime) {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      durationMinutes = Math.max(1, Math.round((end - start) / 60000));
    }
  }

  return {
    id: raw.id ?? raw.entryId ?? undefined,
    task: pickString(raw.task, raw.taskName, raw.title) || 'Untitled Task',
    startTime,
    endTime,
    duration: durationMinutes ?? undefined,
    category: pickString(raw.category, raw.categoryName, raw.category_name),
    createdAt: pickString(raw.createdAt, raw.created_at),
  };
};

export const normalizeAppUsage = (raw: any): AppUsage | null => {
  if (!raw) return null;

  const startTime = toDateISO(raw.startTime) ?? toDateISO(raw.start_time);
  if (!startTime) return null;
  const endTime = toDateISO(raw.endTime) ?? toDateISO(raw.end_time) ?? undefined;
  let durationSeconds = toOptionalNumber(raw.duration);

  if ((durationSeconds == null || Number.isNaN(durationSeconds)) && endTime) {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      durationSeconds = Math.max(1, Math.round((end - start) / 1000));
    }
  }

  return {
    id: raw.id ?? raw.usageId ?? undefined,
    appName: pickString(raw.appName, raw.app_name, raw.name) || 'Unknown',
    windowTitle: pickString(raw.windowTitle, raw.window_title),
    category: pickString(raw.category, raw.category_name),
    domain: pickString(raw.domain),
    url: pickString(raw.url),
    startTime,
    endTime,
    duration: durationSeconds ?? undefined,
    isBrowser:
      typeof raw.isBrowser === 'boolean'
        ? raw.isBrowser
        : typeof raw.isBrowser === 'number'
          ? Boolean(raw.isBrowser)
          : typeof raw.is_browser === 'boolean'
            ? raw.is_browser
            : typeof raw.is_browser === 'number'
              ? Boolean(raw.is_browser)
              : raw.is_browser != null
                ? Boolean(raw.is_browser)
                : undefined,
    isIdle:
      typeof raw.isIdle === 'boolean'
        ? raw.isIdle
        : typeof raw.isIdle === 'number'
          ? Boolean(raw.isIdle)
          : typeof raw.is_idle === 'boolean'
            ? raw.is_idle
            : typeof raw.is_idle === 'number'
              ? Boolean(raw.is_idle)
              : raw.is_idle != null
                ? Boolean(raw.is_idle)
                : undefined,
    createdAt: pickString(raw.createdAt, raw.created_at),
  };
};

export const normalizeTimeEntries = (rawEntries: any[]): TimeEntry[] =>
  (rawEntries || [])
    .map(normalizeTimeEntry)
    .filter((entry): entry is TimeEntry => entry !== null);

export const normalizeAppUsageList = (rawUsage: any[]): AppUsage[] =>
  (rawUsage || [])
    .map(normalizeAppUsage)
    .filter((usage): usage is AppUsage => usage !== null);
