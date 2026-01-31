import { pool } from '../infra/database';
import { ConflictError, AuthError } from '../shared/errors';

export interface UserRow {
    id: string;
    email: string;
    password_hash: string;
}

export interface SessionRow {
    id: string;
    user_id: string;
    expires_at: Date;
}

export class AuthRepository {
    /**
     * Atomic: creates both user and initial session or rolls back both
     */
    async createUserAndSession(
        userId: string,
        email: string,
        passwordHash: string,
        sessionId: string,
        expiresAt: Date,
    ): Promise<void> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            await client.query(
                `INSERT INTO users (id, email, password_hash)
         VALUES ($1, $2, $3)`,
                [userId, email, passwordHash],
            );

            await client.query(
                `INSERT INTO auth_sessions (id, user_id, expires_at)
         VALUES ($1, $2, $3)`,
                [sessionId, userId, expiresAt],
            );

            await client.query('COMMIT');
        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            await client.query('ROLLBACK');

            if (err.code === '23505') {
                throw new ConflictError('This email is already registered');
            }

            throw new AuthError('Failed to create account'); // generic for unexpected
        } finally {
            client.release();
        }
    }

    async findUserByEmail(email: string): Promise<UserRow | null> {
        const result = await pool.query(
            'SELECT id, email, password_hash FROM users WHERE email = $1',
            [email],
        );
        const row = result.rows[0];
        return row ? (row as UserRow) : null;
    }

    async createSession(sessionId: string, userId: string, expiresAt: Date): Promise<void> {
        await pool.query(
            `INSERT INTO auth_sessions (id, user_id, expires_at)
       VALUES ($1, $2, $3)`,
            [sessionId, userId, expiresAt],
        );
    }

    async findSessionById(sessionId: string): Promise<SessionRow | null> {
        const result = await pool.query(
            `SELECT id, user_id, expires_at
       FROM auth_sessions
       WHERE id = $1 AND expires_at > NOW()`,
            [sessionId],
        );

        const row = result.rows[0];
        return row ? (row as SessionRow) : null;
    }

    async deleteSession(sessionId: string): Promise<void> {
        await pool.query('DELETE FROM auth_sessions WHERE id = $1', [sessionId]);
    }
}
