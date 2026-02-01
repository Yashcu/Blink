import jwt from 'jsonwebtoken';
import { authConfig } from '../config/auth';

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
        algorithm: 'HS256',
        expiresIn: authConfig.jwtExpiresInSeconds,
        ...options,
    });
}

export function verifyJwt(token: string): JwtPayload {
    return jwt.verify(token, authConfig.jwtSecret, {
        algorithms: ['HS256'],
    }) as JwtPayload;
}
