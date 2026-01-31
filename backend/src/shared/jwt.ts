import jwt from 'jsonwebtoken';
import { authConfig } from '../config/auth';
import { AuthError } from './errors';

export interface JwtPayload {
    userId: string;
    sessionId: string;
    iat?: number;
    exp?: number;
}

export function signJwt(
    payload: Omit<JwtPayload, 'iat' | 'exp'>,
    options?: jwt.SignOptions,
): string {
    return jwt.sign(payload, authConfig.jwtSecret, {
        expiresIn: authConfig.jwtExpiresInSeconds,
        ...options,
    });
}

export function verifyJwt(token: string): JwtPayload {
    try {
        const decoded = jwt.verify(token, authConfig.jwtSecret) as JwtPayload;

        if (!decoded.userId || !decoded.sessionId) {
            throw new AuthError('Invalid token payload');
        }

        return decoded;
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            throw new AuthError('Token has expired');
        }
        if (err instanceof jwt.JsonWebTokenError) {
            throw new AuthError('Invalid token');
        }
        throw new AuthError('Authentication failed');
    }
}
