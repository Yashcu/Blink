import { v4 as uuidv4 } from 'uuid';
import { AuthRepository } from '../repositories/auth.repository';
import { hashPassword, verifyPassword } from '../shared/password';
import { signJwt } from '../shared/jwt';
import { authConfig } from '../config/auth';
import { AuthError, ConflictError, ValidationError } from '../shared/errors';
import { AUTH_CONSTRAINTS } from '../shared/constraints';

export class AuthService {
    private repo = new AuthRepository();

    async register(email: string, password: string) {
        email = email.trim().toLowerCase();

        if (!this.isStrongPassword(password)) {
            throw new ValidationError('Password must be 8-100 characters long');
        }

        const passwordHash = await hashPassword(password);
        const userId = uuidv4();
        const sessionId = uuidv4();
        const expiresAt = new Date(Date.now() + authConfig.sessionExpiresInSeconds * 1000);

        try {
            // Must be atomic: user + session created in a single transaction
            await this.repo.createUserAndSession(userId, email, passwordHash, sessionId, expiresAt);
        } catch (err) {
            if (err instanceof ConflictError) {
                throw err;
            }
            throw new AuthError('Failed to create account');
        }

        const token = signJwt({ userId, sessionId }, { expiresIn: authConfig.jwtExpiresInSeconds });

        return { token };
    }

    private isStrongPassword(password: string): boolean {
        if (
            password.length < AUTH_CONSTRAINTS.PASSWORD_MIN_LENGTH ||
            password.length > AUTH_CONSTRAINTS.PASSWORD_MAX_LENGTH
        ) {
            return false;
        }

        return (
            /[a-z]/.test(password) &&
            /[A-Z]/.test(password) &&
            /[0-9]/.test(password) &&
            /[^a-zA-Z0-9]/.test(password)
        );
    }

    async login(email: string, password: string) {
        email = email.trim().toLowerCase();

        let user;
        try {
            user = await this.repo.findUserByEmail(email);
        } catch {
            throw new AuthError('Authentication service unavailable');
        }

        if (!user) {
            throw new AuthError('INVALID_CREDENTIALS');
        }

        const valid = await verifyPassword(password, user.password_hash);
        if (!valid) {
            throw new AuthError('INVALID_CREDENTIALS');
        }

        const sessionId = uuidv4();
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
    }
}
