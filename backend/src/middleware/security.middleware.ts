import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors';

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'] as const;

/**
 * CSRF protection middleware for state-changing requests.
 * Requires a custom header (x-requested-with or Authorization) that
 * browsers don't send automatically with form submissions.
 * This prevents CSRF attacks from simple <form> or <a> tag submissions.
 *
 * @param req - Express request
 * @param _res - Express response
 * @param next - Next middleware
 * @throws AppError (403) if required header is missing on unsafe methods
 */
export const verifyRequestSource = (req: Request, _res: Response, next: NextFunction): void => {
    if (SAFE_METHODS.includes(req.method as (typeof SAFE_METHODS)[number])) return next();

    // Check for a custom header that browsers don't send by default
    const requestHeader = req.headers['x-requested-with'] || req.headers['authorization'];
    if (!requestHeader) {
        throw new AppError('Security check failed: Missing request header', 403);
    }
    next();
};