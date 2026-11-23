import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors';
import { logger } from '../shared/logger';
import { env } from '../config/env';

/**
 * Global error handler middleware.
 * Distinguishes between operational errors (AppError) and programmer errors.
 * In production: returns generic error messages.
 * In development: includes stack traces for debugging.
 *
 * @param err - Error thrown by route handlers or middleware
 * @param req - Express request
 * @param res - Express response
 * @param _next - Next function (unused, terminates request)
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
    if (err instanceof AppError) {
        logger.warn({
            code: err.code,
            path: req.path,
            method: req.method,
            ip: req.ip,
            message: err.message,
        }, 'Operational Error');

        res.status(err.status).json({
            error: err.message,
            code: err.code,
        });
        return;
    }

    // Log full error details server-side (with redaction)
    logger.error({
        err,
        path: req.path,
        method: req.method,
        query: req.query,
    }, 'Unhandled Exception');

    // In production, never leak stack traces or internal error details
    if (env.isProduction) {
        res.status(500).json({
            error: 'Internal server error',
        });
        return;
    }

    // In development, include error details for debugging
    res.status(500).json({
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
    });
}