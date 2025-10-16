import * as fs from 'fs';
import * as path from 'path';
/**
 * Logger - Structured logging service for Lume
 *
 * Replaces console.log/error/warn with structured logging that includes:
 * - Timestamps
 * - Log levels
 * - Context metadata
 * - Safe error handling (EPIPE resistant)
 * - Optional file persistence
 *
 * Usage:
 * ```typescript
 * import { logger } from '@/services/logging/Logger';
 *
 * logger.info('Database initialized', { path: dbPath });
 * logger.error('Failed to save', { error: err.message }, err);
 * ```
 */
export class Logger {
    static instance;
    logToFile = false;
    logFilePath = null;
    minLevel = 'info';
    LOG_LEVELS = {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3,
    };
    constructor() { }
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    /**
     * Configure logger
     */
    configure(options) {
        this.logToFile = options.logToFile ?? false;
        this.logFilePath = options.logFilePath ?? null;
        this.minLevel = options.minLevel ?? 'info';
        // Create log directory if needed
        if (this.logToFile && this.logFilePath) {
            const logDir = path.dirname(this.logFilePath);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
        }
    }
    /**
     * Check if a log level should be logged
     */
    shouldLog(level) {
        return this.LOG_LEVELS[level] <= this.LOG_LEVELS[this.minLevel];
    }
    /**
     * Format log entry
     */
    formatEntry(entry) {
        const parts = [
            entry.timestamp,
            `[${entry.level.toUpperCase()}]`,
            entry.message,
        ];
        if (entry.context && Object.keys(entry.context).length > 0) {
            parts.push(JSON.stringify(entry.context));
        }
        if (entry.stack) {
            parts.push(`\n${entry.stack}`);
        }
        return parts.join(' ');
    }
    /**
     * Write to console safely (handles EPIPE)
     */
    safeConsole(level, message) {
        try {
            console[level](message);
        }
        catch (err) {
            // Ignore EPIPE errors (broken pipe)
            if (err?.code !== 'EPIPE') {
                // Try to log to stderr as fallback
                try {
                    process.stderr.write(`Logger error: ${err?.message}\n`);
                }
                catch {
                    // Silently fail if stderr also fails
                }
            }
        }
    }
    /**
     * Write to file safely
     */
    writeToFile(formatted) {
        if (!this.logToFile || !this.logFilePath)
            return;
        try {
            fs.appendFileSync(this.logFilePath, formatted + '\n', 'utf8');
        }
        catch (err) {
            // If file writing fails, at least try to log to console
            this.safeConsole('error', `Failed to write to log file: ${err?.message}`);
        }
    }
    /**
     * Log a message
     */
    log(level, message, context, error) {
        if (!this.shouldLog(level))
            return;
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context,
            stack: error?.stack,
        };
        const formatted = this.formatEntry(entry);
        // Write to console
        const consoleMethod = level === 'debug' ? 'debug' : level === 'info' ? 'log' : level;
        this.safeConsole(consoleMethod, formatted);
        // Write to file if enabled
        this.writeToFile(formatted);
    }
    /**
     * Log error (level 0)
     */
    error(message, context, error) {
        this.log('error', message, context, error);
    }
    /**
     * Log warning (level 1)
     */
    warn(message, context) {
        this.log('warn', message, context);
    }
    /**
     * Log info (level 2)
     */
    info(message, context) {
        this.log('info', message, context);
    }
    /**
     * Log debug (level 3)
     */
    debug(message, context) {
        this.log('debug', message, context);
    }
    /**
     * Create a child logger with default context
     */
    child(defaultContext) {
        const childLogger = new Logger();
        childLogger.logToFile = this.logToFile;
        childLogger.logFilePath = this.logFilePath;
        childLogger.minLevel = this.minLevel;
        // Override log method to include default context
        const originalLog = childLogger.log.bind(childLogger);
        childLogger.log = (level, message, context, error) => {
            originalLog(level, message, { ...defaultContext, ...context }, error);
        };
        return childLogger;
    }
}
// Export singleton instance
export const logger = Logger.getInstance();
