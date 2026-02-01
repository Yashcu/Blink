import { v7 as uuidv7 } from 'uuid';
import { AuthRepository } from '../repositories/auth.repository';
import { hashPassword, verifyPassword } from '../shared/password';
import { signJwt } from '../shared/jwt';
import { authConfig } from '../config/auth';
import { AuthError } from '../shared/errors';
import { redisCache } from '../infra/redis.cache';
import { logger } from '../shared/logger';

export class AuthService {
    private repo = new AuthRepository();

    async register(email: string, password: string) {
        email = email.trim().toLowerCase();

        const passwordHash = await hashPassword(password);

        const userId = uuidv7();
        const sessionId = uuidv7();

        const expiresAt = new Date(Date.now() + authConfig.sessionExpiresInSeconds * 1000);

        try {
            await this.repo.createUserAndSession(userId, email, passwordHash, sessionId, expiresAt);
        } catch (err) {
            logger.error({ err, email }, 'Registration failed');
            throw new AuthError('Registration could not be completed at this time.');
        }

        const token = signJwt({ userId, sessionId }, { expiresIn: authConfig.jwtExpiresInSeconds });

        return { token };
    }

    async login(email: string, password: string) {
        const user = await this.repo.findUserByEmail(email.trim().toLowerCase());

        const dummyHash = '$argon2id$v=19$m=65536,t=3,p=1$4S0...';
        const hashToVerify = user ? user.password_hash : dummyHash;

        const valid = await verifyPassword(password, hashToVerify);

        if (!user || !valid) {
            throw new AuthError('INVALID_CREDENTIALS');
        }

        const sessionId = uuidv7();
        const expiresAt = new Date(Date.now() + authConfig.sessionExpiresInSeconds * 1000);

        try {
            await this.repo.createSession(sessionId, user.id, expiresAt);
        } catch {
            throw new AuthError('Authentication failed');
        }

        const token = signJwt(
            { userId: user.id, sessionId },
            { expiresIn: authConfig.jwtExpiresInSeconds },
        );
        return { token };
    }

    async logout(sessionId: string) {
        await this.repo.deleteSession(sessionId);
        try {
            await redisCache.del(`session:${sessionId}`);
        } catch (err) {
            logger.error({ err, sessionId }, 'Failed to clear session from cache during logout');
        }
    }
}
