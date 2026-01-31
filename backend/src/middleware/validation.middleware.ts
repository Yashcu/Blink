import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { checkRateLimit } from '../rate-limit/rate-limiter';
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
        const allowed = await checkRateLimit(`ratelimit:register:${ip}`, 4, 3600); // 4/hour

        if (!allowed) {
            return errorResponse(res, 'Too many registration attempts. Try again later.', 429);
        }
        next();
    };
}
