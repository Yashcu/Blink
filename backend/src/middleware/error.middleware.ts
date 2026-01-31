import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors';
import { logger } from '../shared/logger';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
    if (err instanceof AppError) {
        logger.warn({
            code: err.code,
            path: req.path,
            method: req.method,
            ip: req.ip,
            message: err.message
        }, 'Operational Error');

        return res.status(err.status).json({
            error: err.message,
            code: err.code,
        });
    }

    logger.error({
        err,
        path: req.path,
        method: req.method,
        query: req.query,
    }, 'Unhandled Exception');

    return res.status(500).json({
        error: 'Internal server error',
    });
}