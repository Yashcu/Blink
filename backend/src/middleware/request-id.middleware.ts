import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';

/**
 * Request ID middleware for distributed tracing.
 * Generates or propagates X-Request-ID header for log correlation.
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const id = req.get('x-request-id') || nanoid(10);
    req.headers['x-request-id'] = id;
    res.setHeader('x-request-id', id);
    next();
};