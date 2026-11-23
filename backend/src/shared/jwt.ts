import jwt from 'jsonwebtoken';
import { authConfig } from '../config/auth';

export interface JwtPayload {
    userId: string;
    sessionId: string;
    iat?: number;
    exp?: number;
}

/**
 * Signs a JWT token with HS256 algorithm.
 *
 * @param payload - Token payload (userId, sessionId)
 * @param options - Additional sign options (e.g., custom expiresIn)
 * @returns Signed JWT string
 */
export function signJwt(
    payload: Omit<JwtPayload, 'iat' | 'exp'>,
    options?: jwt.SignOptions,
): string {
    return jwt.sign(payload, authConfig.jwtSecret, {
        algorithm: 'HS256',
        expiresIn: authConfig.jwtExpiresInSeconds,
        ...options,
    });
}

/**
 * Verifies and decodes a JWT token.
 * Throws if token is invalid, expired, or malformed.
 *
 * @param token - JWT string to verify
 * @returns Decoded JWT payload
 * @throws JsonWebTokenError if verification fails
 */
export function verifyJwt(token: string): JwtPayload {
    return jwt.verify(token, authConfig.jwtSecret, {
        algorithms: ['HS256'],
    }) as JwtPayload;
}
