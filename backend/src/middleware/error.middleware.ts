import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors';

const isProd = process.env.NODE_ENV === 'production';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
    if (err instanceof AppError) {
        return res.status(err.status).json({
            error: err.message,
            code: err.code,
        });
    }

    console.error('Unhandled error:', {
        message: err.message,
        ...(isProd ? {} : { stack: err.stack }),
        path: req.path,
        method: req.method,
    });

    return res.status(500).json({
        error: 'Internal server error',
    });
}
