import { Request, Response, NextFunction } from 'express';
import { verifyJwt, JwtPayload } from '../shared/jwt';
import { AuthRepository } from '../repositories/auth.repository';
import { AuthError } from '../shared/errors';
import { redisCache } from '../infra/redis.cache';

export interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
        sessionId: string;
    };
}

const authRepo = new AuthRepository();

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const token = req.cookies?.auth;

    if (!token) {
        return next(new AuthError('No authentication token provided'));
    }

    try {
        const payload: JwtPayload = verifyJwt(token);

        const cacheKey = `session:${payload.sessionId}`;
        const cached = await redisCache.get(cacheKey);

        if (cached) {
            authReq.user = {
                userId: payload.userId,
                sessionId: payload.sessionId,
            };
            return next();
        }

        const session = await authRepo.findSessionById(payload.sessionId);

        if (!session) {
            throw new AuthError('Session invalid or revoked');
        }

        if (new Date(session.expires_at) < new Date()) {
            await authRepo.deleteSession(payload.sessionId);
            throw new AuthError('Session expired');
        }

        const ttl = Math.max(
            0,
            Math.floor((new Date(session.expires_at).getTime() - Date.now()) / 1000)
        );

        if (ttl > 0) {
            await redisCache.set(cacheKey, '1', { ex: ttl });
        }

        authReq.user = {
            userId: payload.userId,
            sessionId: payload.sessionId,
        };

        next();
    } catch (err) {
        res.clearCookie('auth');
        next(err);
    }
};