import { Request, Response, NextFunction } from 'express';
import { verifyJwt, JwtPayload } from '../shared/jwt';
import { AuthRepository } from '../repositories/auth.repository';
import { AuthError } from '../shared/errors';
import { redisCache } from '../infra/redis.cache';
import { LRUCache } from 'lru-cache';

export interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
        sessionId: string;
    };
}

const authRepo = new AuthRepository();

const sessionL1Cache = new LRUCache<string, boolean>({
    max: 5000,
    ttl: 1000 * 60,
});

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const token = req.cookies?.auth;

    if (!token) {
        return next(new AuthError('No authentication token provided'));
    }

    try {
        const payload: JwtPayload = verifyJwt(token);

        const sessionKey = `session:${payload.sessionId}`;
        if (sessionL1Cache.get(sessionKey)) {
            authReq.user = { userId: payload.userId, sessionId: payload.sessionId };
            return next();
        }

        const cached = await redisCache.get(sessionKey);
        if (cached) {
            sessionL1Cache.set(sessionKey, true);
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
            await redisCache.set(sessionKey, '1', { ex: ttl });
        }

        sessionL1Cache.set(sessionKey, true);

        authReq.user = {
            userId: payload.userId,
            sessionId: payload.sessionId,
        };

        next();
    } catch (err) {
        res.clearCookie('auth');
        if (err instanceof Error && err.name === 'TokenExpiredError') {
            next(new AuthError('Token expired'));
        } else {
            next(err);
        }
    }
};