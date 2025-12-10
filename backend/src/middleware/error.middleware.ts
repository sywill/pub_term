import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger.middleware.js';

/**
 * Custom API error class for structured error responses
 */
export class ApiError extends Error {
    constructor(
        public statusCode: number,
        message: string,
        public code?: string,
        public details?: unknown
    ) {
        super(message);
        this.name = 'ApiError';
    }

    static badRequest(message: string, code?: string, details?: unknown) {
        return new ApiError(400, message, code ?? 'BAD_REQUEST', details);
    }

    static unauthorized(message = 'Unauthorized') {
        return new ApiError(401, message, 'UNAUTHORIZED');
    }

    static forbidden(message = 'Forbidden') {
        return new ApiError(403, message, 'FORBIDDEN');
    }

    static notFound(message = 'Not found') {
        return new ApiError(404, message, 'NOT_FOUND');
    }

    static conflict(message: string) {
        return new ApiError(409, message, 'CONFLICT');
    }

    static internal(message = 'Internal server error') {
        return new ApiError(500, message, 'INTERNAL_ERROR');
    }
}

/**
 * Standard API response format
 */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        code?: string;
        details?: unknown;
    };
    meta?: {
        timestamp: string;
        requestId?: string;
    };
}

/**
 * Helper to send successful responses
 */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200) {
    const response: ApiResponse<T> = {
        success: true,
        data,
        meta: {
            timestamp: new Date().toISOString(),
        },
    };
    res.status(statusCode).json(response);
}

/**
 * Helper to send error responses
 */
export function sendError(res: Response, error: ApiError) {
    const response: ApiResponse = {
        success: false,
        error: {
            message: error.message,
            code: error.code,
            details: error.details,
        },
        meta: {
            timestamp: new Date().toISOString(),
        },
    };
    res.status(error.statusCode).json(response);
}

/**
 * Global error handling middleware
 * Must be registered AFTER all routes
 */
export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction
) {
    // Log the error
    logger.error(`Error handling ${req.method} ${req.path}`, {
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });

    // Handle known error types
    if (err instanceof ApiError) {
        return sendError(res, err);
    }

    if (err instanceof ZodError) {
        return sendError(res, ApiError.badRequest('Validation error', 'VALIDATION_ERROR', err.errors));
    }

    // Handle Prisma errors
    if (err.name === 'PrismaClientKnownRequestError') {
        const prismaError = err as { code?: string };
        if (prismaError.code === 'P2002') {
            return sendError(res, ApiError.conflict('Resource already exists'));
        }
        if (prismaError.code === 'P2025') {
            return sendError(res, ApiError.notFound('Resource not found'));
        }
    }

    // Default to internal server error
    const internalError = ApiError.internal(
        process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    );
    return sendError(res, internalError);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
