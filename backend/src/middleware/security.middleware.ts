import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors';

/**
 * Ensures requests to sensitive mutations have a custom header.
 * This prevents CSRF from simple <form> or <a> tag submissions.
 */
export const verifyRequestSource = (req: Request, _res: Response, next: NextFunction) => {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) return next();

    // Check for a custom header that browsers don't send by default
    const requestHeader = req.headers['x-requested-with'] || req.headers['authorization'];
    if (!requestHeader) {
        throw new AppError('Security check failed: Missing request header', 403);
    }
    next();
};