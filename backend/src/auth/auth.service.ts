import { v7 as uuidv7 } from 'uuid';
import { Request } from 'express';
import { AuthRepository, UserRow } from '../repositories/auth.repository';
import { hashPassword, verifyPassword } from '../shared/password';
import { signJwt } from '../shared/jwt';
import { authConfig } from '../config/auth';
import { AppError, AuthError } from '../shared/errors';
import { redisCache } from '../infra/redis.cache';
import { logger } from '../shared/logger';
import { generateSessionFingerprint } from '../shared/fingerprint';
import { securityAudit } from '../shared/security-audit';

interface RegisterResult {
    token: string;
    userId: string;
}

interface LoginResult {
    token: string;
    user: { id: string; email: string };
}

/**
 * Authentication service handling registration, login, and session management.
 * Uses Argon2id for password hashing and JWT for stateless auth with server-side session tracking.
 */
export class AuthService {
    private repo = new AuthRepository();

    /**
     * Registers a new user with email and password.
     * Creates user record and initial session atomically.
     *
     * @param email - User's email (will be normalized to lowercase)
     * @param password - Plain text password (will be hashed with Argon2id)
     * @param fingerprint - Optional session fingerprint from client
     * @param req - Express request for audit logging
     * @returns JWT token and user ID
     * @throws AuthError if registration fails
     */
    async register(email: string, password: string, fingerprint?: string, req?: Request): Promise<RegisterResult> {
        email = email.trim().toLowerCase();

        const passwordHash = await hashPassword(password);

        const userId = uuidv7();
        const sessionId = uuidv7();

        const expiresAt = new Date(Date.now() + authConfig.sessionExpiresInSeconds * 1000);
        const sessionFingerprint = fingerprint || generateSessionFingerprint(req);

        try {
            await this.repo.createUserAndSession(userId, email, passwordHash, sessionId, expiresAt, sessionFingerprint);
        } catch (err) {
            logger.error({ err, email }, 'Registration failed');
            if (err instanceof AppError) {
                throw err;
            }
            throw new AuthError('Registration could not be completed at this time.');
        }

        if (req) {
            securityAudit.registration(userId, email, req);
        }

        const token = signJwt({ userId, sessionId }, { expiresIn: authConfig.jwtExpiresInSeconds });

        return { token, userId };
    }

    /**
     * Authenticates a user with email and password.
     * Uses constant-time verification to prevent timing attacks.
     * Creates new session on successful login.
     *
     * @param email - User's email
     * @param password - Plain text password
     * @param fingerprint - Optional session fingerprint from client
     * @param req - Express request for audit logging and IP extraction
     * @returns JWT token and user info
     * @throws AuthError if credentials are invalid
     */
    async login(email: string, password: string, fingerprint?: string, req?: Request): Promise<LoginResult> {
        const normalizedEmail = email.trim().toLowerCase();
        const user = await this.repo.findUserByEmail(normalizedEmail);

        // Use dummy hash for constant-time verification even when user doesn't exist
        const dummyHash = '$argon2id$v=19$m=65536,t=3,p=1$4S0...';
        const hashToVerify = user ? user.password_hash : dummyHash;

        const valid = await verifyPassword(password, hashToVerify);

        if (!user || !valid) {
            if (req) {
                securityAudit.loginFailure(normalizedEmail, req, 'invalid_credentials');
            }
            throw new AuthError('INVALID_CREDENTIALS');
        }

        const sessionId = uuidv7();
        const expiresAt = new Date(Date.now() + authConfig.sessionExpiresInSeconds * 1000);
        const sessionFingerprint = fingerprint || generateSessionFingerprint(req);

        try {
            await this.repo.createSession(sessionId, user.id, expiresAt, sessionFingerprint);
        } catch {
            throw new AuthError('Authentication failed');
        }

        if (req) {
            securityAudit.loginSuccess(user.id, user.email, req);
        }

        const token = signJwt(
            { userId: user.id, sessionId },
            { expiresIn: authConfig.jwtExpiresInSeconds },
        );
        return { token, user: { id: user.id, email: user.email } };
    }

    /**
     * Retrieves user by ID (without password hash).
     *
     * @param id - User UUID
     * @returns User row or null if not found
     */
    async getUserById(id: string): Promise<UserRow | null> {
        return this.repo.findUserById(id);
    }

    /**
     * Logs out a user by deleting their session.
     * Clears session from Redis cache and logs audit event.
     *
     * @param sessionId - Session UUID to invalidate
     * @param req - Express request for audit logging
     */
    async logout(sessionId: string, req?: Request): Promise<void> {
        await this.repo.deleteSession(sessionId);
        try {
            await redisCache.del(`session:${sessionId}`);
        } catch (err) {
            logger.error({ err, sessionId }, 'Failed to clear session from cache during logout');
        }
        if (req) {
            securityAudit.logout('unknown', req);
        }
    }
}
