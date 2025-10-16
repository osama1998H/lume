/**
 * Renderer Logger Service
 *
 * Browser-compatible logging service for the Electron renderer process.
 * Logs to browser console and sends critical logs to main process via IPC.
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogContext {
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  stack?: string;
}

/**
 * Renderer Logger Class
 * Singleton pattern for consistent logging across the renderer process
 */
export class RendererLogger {
  private static instance: RendererLogger;
  private minLevel: LogLevel = 'info';

  private constructor() {
    // Set log level based on environment
    if (process.env.NODE_ENV === 'development') {
      this.minLevel = 'debug';
    }
  }

  public static getInstance(): RendererLogger {
    if (!RendererLogger.instance) {
      RendererLogger.instance = new RendererLogger();
    }
    return RendererLogger.instance;
  }

  /**
   * Log level hierarchy
   */
  private getLevelValue(level: LogLevel): number {
    const levels: Record<LogLevel, number> = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };
    return levels[level];
  }

  /**
   * Check if a level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return this.getLevelValue(level) <= this.getLevelValue(this.minLevel);
  }

  /**
   * Format log message with timestamp and context
   */
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context && Object.keys(context).length > 0
      ? ` | ${JSON.stringify(context)}`
      : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  /**
   * Send critical logs to main process
   */
  private async sendToMainProcess(entry: LogEntry): Promise<void> {
    // Only send errors and warnings to main process
    if (entry.level === 'error' || entry.level === 'warn') {
      try {
        // Check if electronAPI is available
        if (window.electronAPI && typeof (window.electronAPI as any).logToMain === 'function') {
          await (window.electronAPI as any).logToMain(entry);
        }
      } catch (error) {
        // Silently fail if IPC is not available
        // Don't create infinite loop by logging this error
      }
    }
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      stack: error?.stack,
    };

    const formattedMessage = this.formatMessage(level, message, context);

    // Log to browser console
    switch (level) {
      case 'error':
        if (error) {
          console.error(formattedMessage, error);
        } else {
          console.error(formattedMessage);
        }
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'debug':
        console.debug(formattedMessage);
        break;
    }

    // Send to main process asynchronously (don't await to avoid blocking)
    this.sendToMainProcess(entry).catch(() => {
      // Silently fail
    });
  }

  /**
   * Log an error message
   */
  public error(message: string, context?: LogContext, error?: Error): void {
    this.log('error', message, context, error);
  }

  /**
   * Log a warning message
   */
  public warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log an info message
   */
  public info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log a debug message
   */
  public debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Set minimum log level
   */
  public setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Get current minimum log level
   */
  public getMinLevel(): LogLevel {
    return this.minLevel;
  }
}

/**
 * Export singleton instance for use throughout the renderer process
 */
export const logger = RendererLogger.getInstance();
