import { Request, Response, NextFunction } from 'express';
import { verifyJwt, JwtPayload } from '../shared/jwt';
import { AuthRepository } from '../repositories/auth.repository';
import { AuthError } from '../shared/errors';
import { redisCache } from '../infra/redis.cache';
import { LRUCache } from 'lru-cache';
import { getCookieOptions } from '../config/auth';
import { logger } from '../shared/logger';
import { validateSessionFingerprint } from '../shared/fingerprint';

export interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
        sessionId: string;
    };
}

const authRepo = new AuthRepository();

// L1 in-memory cache for hot sessions (reduces Redis round-trips)
const sessionL1Cache = new LRUCache<string, boolean>({
    max: 5000,
    ttl: 1000 * 60, // 1 minute
});

/**
 * Authentication middleware.
 * Validates JWT, checks session in Redis/DB, verifies session fingerprint.
 * Attaches user info to request on success.
 *
 * Priority: L1 cache → Redis → PostgreSQL
 * On fingerprint mismatch: invalidates session and logs security event.
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    let token = req.cookies?.auth;

    // Support Bearer token in Authorization header (for API clients)
    if (!token && req.headers.authorization) {
        const parts = req.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
            token = parts[1];
        }
    }

    if (!token) {
        return next(new AuthError('No authentication token provided'));
    }

    try {
        const payload: JwtPayload = verifyJwt(token);

        const sessionKey = `session:${payload.sessionId}`;

        // L1 cache check
        if (sessionL1Cache.get(sessionKey)) {
            authReq.user = { userId: payload.userId, sessionId: payload.sessionId };
            return next();
        }

        // Redis check
        const cached = await redisCache.get(sessionKey);
        if (cached) {
            sessionL1Cache.set(sessionKey, true);
            authReq.user = {
                userId: payload.userId,
                sessionId: payload.sessionId,
            };
            return next();
        }

        // Database fallback
        const session = await authRepo.findSessionById(payload.sessionId);
        if (!session) {
            throw new AuthError('Session invalid or revoked');
        }

        if (new Date(session.expires_at) < new Date()) {
            await authRepo.deleteSession(payload.sessionId);
            throw new AuthError('Session expired');
        }

        // Validate session fingerprint to detect hijacking
        if (!validateSessionFingerprint(session.fingerprint, req)) {
            logger.warn(
                { sessionId: payload.sessionId, userId: payload.userId, ip: req.ip },
                'Session fingerprint mismatch - possible hijacking attempt'
            );
            await authRepo.deleteSession(payload.sessionId);
            await redisCache.del(sessionKey);
            sessionL1Cache.delete(sessionKey);
            throw new AuthError('Session invalidated due to security check');
        }

        const ttl = Math.max(
            0,
            Math.floor((new Date(session.expires_at).getTime() - Date.now()) / 1000),
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
        res.clearCookie('auth', getCookieOptions());
        if (err instanceof Error && err.name === 'TokenExpiredError') {
            next(new AuthError('Token expired'));
        } else {
            next(err);
        }
    }
};