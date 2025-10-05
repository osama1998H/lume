import { crashReporter } from 'electron';
import { app } from 'electron';

/**
 * Initialize Electron's native crash reporter
 * This captures crashes at the native level (C++/system crashes)
 */
export function initializeCrashReporter(): void {
  const uploadUrl = process.env.CRASH_REPORT_URL;
  const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';

  // Skip crash reporter in development unless explicitly enabled
  if (environment === 'development' && !process.env.CRASH_REPORTER_ENABLE_DEV) {
    console.log('Crash reporter disabled in development environment');
    return;
  }

  // If using Sentry, you can use their crash reporting endpoint
  // Otherwise, set up your own Crashpad server
  if (!uploadUrl || uploadUrl === 'your_crash_report_url_here') {
    console.log('Crash reporter URL not configured, skipping initialization');
    return;
  }

  try {
    crashReporter.start({
      productName: 'Lume',
      companyName: 'Lume Team',
      submitURL: uploadUrl,
      uploadToServer: true,
      ignoreSystemCrashHandler: false,
      compress: true,
      extra: {
        version: app.getVersion(),
        environment,
        platform: process.platform,
        arch: process.arch,
      },
    });

    console.log('Crash reporter initialized successfully');
  } catch (error) {
    console.error('Failed to initialize crash reporter:', error);
  }
}

/**
 * Add extra crash reporter parameters
 */
export function addCrashReporterParameter(key: string, value: string): void {
  try {
    crashReporter.addExtraParameter(key, value);
  } catch (error) {
    console.error('Failed to add crash reporter parameter:', error);
  }
}

/**
 * Get crash reporter parameters
 */
export function getCrashReporterParameters(): Record<string, string> {
  try {
    return crashReporter.getParameters();
  } catch (error) {
    console.error('Failed to get crash reporter parameters:', error);
    return {};
  }
}

/**
 * Get last crash report
 */
export function getLastCrashReport() {
  try {
    return crashReporter.getLastCrashReport();
  } catch (error) {
    console.error('Failed to get last crash report:', error);
    return null;
  }
}

/**
 * Get all uploaded crash reports
 */
export function getUploadedReports() {
  try {
    return crashReporter.getUploadedReports();
  } catch (error) {
    console.error('Failed to get uploaded reports:', error);
    return [];
  }
}
