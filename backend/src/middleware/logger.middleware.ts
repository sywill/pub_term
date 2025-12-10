import { Request, Response, NextFunction } from 'express';

// Simple structured logger for development
// In production, use a proper logging library like pino or winston

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: Record<string, unknown>;
}

function formatLog(entry: LogEntry): string {
    const emoji = {
        debug: '🔍',
        info: '📝',
        warn: '⚠️',
        error: '❌',
    };

    const contextStr = entry.context
        ? ` ${JSON.stringify(entry.context)}`
        : '';

    return `${emoji[entry.level]} [${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${contextStr}`;
}

export const logger = {
    debug: (message: string, context?: Record<string, unknown>) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(formatLog({ timestamp: new Date().toISOString(), level: 'debug', message, context }));
        }
    },
    info: (message: string, context?: Record<string, unknown>) => {
        console.log(formatLog({ timestamp: new Date().toISOString(), level: 'info', message, context }));
    },
    warn: (message: string, context?: Record<string, unknown>) => {
        console.warn(formatLog({ timestamp: new Date().toISOString(), level: 'warn', message, context }));
    },
    error: (message: string, context?: Record<string, unknown>) => {
        console.error(formatLog({ timestamp: new Date().toISOString(), level: 'error', message, context }));
    },
};

/**
 * Request logging middleware
 * Logs all incoming requests with method, path, status, and duration
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const { method, path, query } = req;

    // Log request start
    logger.info(`→ ${method} ${path}`, {
        query: Object.keys(query).length ? query : undefined,
    });

    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        const { statusCode } = res;

        const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
        logger[level](`← ${method} ${path} ${statusCode}`, {
            duration: `${duration}ms`,
        });
    });

    next();
}
