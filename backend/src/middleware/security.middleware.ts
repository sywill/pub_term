import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { Application } from 'express';

/**
 * Rate limiter for general API requests
 * 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: {
            message: 'Too many requests, please try again later',
            code: 'RATE_LIMIT_EXCEEDED',
        },
    },
});

/**
 * Stricter rate limiter for authentication endpoints
 * 5 requests per 15 minutes per IP (to prevent brute force)
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: {
            message: 'Too many authentication attempts, please try again later',
            code: 'AUTH_RATE_LIMIT_EXCEEDED',
        },
    },
});

/**
 * Configure security middleware for the Express app
 */
export function setupSecurity(app: Application) {
    // Security headers via helmet
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", 'data:', 'blob:'],
                    connectSrc: ["'self'", 'ws:', 'wss:'],
                },
            },
            crossOriginEmbedderPolicy: false, // Allow WebSocket
        })
    );

    // Apply general rate limiting to all API routes
    app.use('/api', apiLimiter);

    // Apply stricter rate limiting to auth routes
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/register', authLimiter);
}
