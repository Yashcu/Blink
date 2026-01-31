import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { rateLimiter } from '../rate-limit/rate-limiter';
import { errorResponse } from '../shared/response';

export function validateBody<T>(schema: z.ZodType<T>) {
    return async (req: Request, res: Response, next: NextFunction) => {
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

export function rateLimitRegister() {
    return async (req: Request, res: Response, next: NextFunction) => {
        const ip = req.ip || '';
        const limitResult = await rateLimiter.check(ip, 100, 60);
        if (!limitResult.success) {
            return errorResponse(res, `Too many requests. Retry in ${limitResult.retryAfter}s`, 429);
        }
        next();
    };
}
