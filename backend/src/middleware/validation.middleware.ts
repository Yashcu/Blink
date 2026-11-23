import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { rateLimiter } from '../rate-limit/rate-limiter';
import { errorResponse } from '../shared/response';

/**
 * Middleware factory for Zod schema validation.
 * Parses and validates request body against schema.
 * Returns 400 with first error message on validation failure.
 *
 * @param schema - Zod schema to validate against
 * @returns Express middleware
 */
export function validateBody<T>(schema: z.ZodType<T>) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (err) {
            if (err instanceof z.ZodError) {
                const message = err.issues[0].message;
                return errorResponse(res, message, 400);
            }
            next(err);
        }
    };
}

/**
 * Registration rate limiting middleware (100 req/min/IP).
 * Applied before validation to prevent abuse.
 *
 * @returns Express middleware
 */
export function rateLimitRegister() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const ip = req.ip || '';
        const limitResult = await rateLimiter(ip, 100, 60);
        if (!limitResult.success) {
            return errorResponse(res, `Too many requests. Retry in ${limitResult.retryAfter}s`, 429);
        }
        next();
    };
}
