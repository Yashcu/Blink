import { Request, NextFunction } from 'express';
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

export async function requireAuth(req: AuthenticatedRequest, next: NextFunction) {
    const token = req.cookies?.auth;

    if (!token) {
        throw new AuthError('No authentication token provided');
    }

    const payload: JwtPayload = verifyJwt(token);
    const cacheKey = `session:${payload.sessionId}`;
    const cached = await redisCache.get(cacheKey);

    if (cached) {
        req.user = {
            userId: payload.userId,
            sessionId: payload.sessionId,
        };
        return next();
    }

    let session;
    try {
        session = await authRepo.findSessionById(payload.sessionId);
    } catch {
        throw new AuthError('Authentication service unavailable');
    }

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

    req.user = {
        userId: payload.userId,
        sessionId: payload.sessionId,
    };

    next();
}
