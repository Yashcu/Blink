import { pool } from '../infra/database';
import { ConflictError } from '../shared/errors';

export class UrlRepository {
    async insertUrl(data: {
        id: string;
        shortCode: string;
        longUrl: string;
        userId: string;
        customAlias?: string | null;
        expiresAt?: Date | null;
    }) {
        try {
            await pool.query(
                `
      INSERT INTO urls
        (id, short_code, long_url, user_id, custom_alias, expiry_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
                [
                    data.id,
                    data.shortCode,
                    data.longUrl,
                    data.userId,
                    data.customAlias ?? null,
                    data.expiresAt ?? null,
                ],
            );
        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            if (err.code === '23505') {
                throw new ConflictError('Alias already in use');
            }
            throw err;
        }
    }

    async getUrlsByUserId(userId: string) {
        const result = await pool.query(
            `
            SELECT id, short_code, long_url, custom_alias, created_at
            FROM urls
            WHERE user_id = $1
            ORDER BY created_at DESC
            `,
            [userId],
        );

        return result.rows.map((row) => ({
            id: row.id,
            shortCode: row.short_code,
            longUrl: row.long_url,
            customAlias: row.custom_alias,
            createdAt: row.created_at,
        }));
    }

    async findByShortCode(shortCode: string) {
        const result = await pool.query(
            `SELECT id, short_code, long_url, user_id, custom_alias, expiry_at 
             FROM urls 
             WHERE short_code = $1
             AND (expiry_at IS NULL OR expiry_at > NOW())`,
            [shortCode],
        );

        if (result.rows.length === 0) return null;

        const row = result.rows[0];
        return {
            id: row.id,
            shortCode: row.short_code,
            longUrl: row.long_url,
            userId: row.user_id,
            customAlias: row.custom_alias,
            createdAt: row.created_at,
            expiresAt: row.expiry_at,
        };
    }

    async findOwnedByCode(code: string, userId: string) {
        const result = await pool.query(
            `
                SELECT
                id,
                short_code,
                long_url,
                custom_alias,
                created_at,
                expiry_at,
                user_id
                FROM urls
                WHERE (short_code = $1 OR custom_alias = $1)
                AND user_id = $2
                AND (expiry_at IS NULL OR expiry_at > NOW())
            `,
            [code, userId],
        );

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];

        return {
            id: row.id,
            shortCode: row.short_code,
            longUrl: row.long_url,
            customAlias: row.custom_alias,
            createdAt: row.created_at,
            expiresAt: row.expiry_at,
            userId: row.user_id,
        };
    }

    async updateUrlById(id: string, data: { longUrl?: string; expiresAt?: Date | null }) {
        await pool.query(
            `
                UPDATE urls
                SET
                long_url = COALESCE($1, long_url),
                expiry_at = $2
                WHERE id = $3
                `,
            [data.longUrl ?? null, data.expiresAt ?? null, id],
        );
    }

    async deleteById(id: string) {
        await pool.query('DELETE FROM urls WHERE id = $1', [id]);
    }
}
