/**
 * Safe Logger Utility
 *
 * Provides logging functions that gracefully handle EPIPE errors
 * that can occur when stdout/stderr streams are closed during shutdown.
 */

/**
 * Check if a stream is writable
 */
function isStreamWritable(stream: NodeJS.WriteStream): boolean {
  return stream && !stream.destroyed && stream.writable;
}

/**
 * Safe console.log that handles EPIPE errors
 */
export function safeLog(...args: any[]): void {
  try {
    if (isStreamWritable(process.stdout)) {
      console.log(...args);
    }
  } catch (error) {
    // Silently ignore EPIPE errors
    if (error instanceof Error && (error as any).code !== 'EPIPE') {
      // Re-throw non-EPIPE errors
      throw error;
    }
  }
}

/**
 * Safe console.error that handles EPIPE errors
 */
export function safeError(...args: any[]): void {
  try {
    if (isStreamWritable(process.stderr)) {
      console.error(...args);
    }
  } catch (error) {
    // Silently ignore EPIPE errors
    if (error instanceof Error && (error as any).code !== 'EPIPE') {
      // Re-throw non-EPIPE errors
      throw error;
    }
  }
}

/**
 * Safe console.warn that handles EPIPE errors
 */
export function safeWarn(...args: any[]): void {
  try {
    if (isStreamWritable(process.stderr)) {
      console.warn(...args);
    }
  } catch (error) {
    // Silently ignore EPIPE errors
    if (error instanceof Error && (error as any).code !== 'EPIPE') {
      // Re-throw non-EPIPE errors
      throw error;
    }
  }
}

/**
 * Create a logger instance with safe methods
 */
export const logger = {
  log: safeLog,
  error: safeError,
  warn: safeWarn,
  info: safeLog,
};
