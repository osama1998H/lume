import type { TFunction } from 'i18next';

/**
 * Format duration in seconds to a human-readable string with i18n support
 * @param seconds - Duration in seconds
 * @param t - Translation function from react-i18next
 * @param includeSeconds - Whether to include seconds in the output (default: false)
 * @returns Formatted duration string (e.g., "2h 30m" or "2س 30د" in Arabic)
 */
export const formatDuration = (
  seconds: number,
  t: TFunction,
  includeSeconds = false
): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}${t('common.h')}`);
  }

  if (minutes > 0) {
    parts.push(`${minutes}${t('common.m')}`);
  }

  if (includeSeconds && secs > 0) {
    parts.push(`${secs}${t('common.s')}`);
  }

  // If no parts, return 0 minutes
  if (parts.length === 0) {
    return `0${t('common.m')}`;
  }

  return parts.join(' ');
};

/**
 * Format time from ISO string to HH:MM format
 * @param isoString - ISO date string
 * @returns Formatted time string (e.g., "14:30")
 */
export const formatTime = (isoString: string): string => {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

/**
 * Format date from ISO string
 * @param isoString - ISO date string
 * @param locale - Locale code (e.g., 'en', 'ar')
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export const formatDate = (
  isoString: string,
  locale = 'en',
  options?: Intl.DateTimeFormatOptions
): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };
  return new Date(isoString).toLocaleDateString(locale, defaultOptions);
};
