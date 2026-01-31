import { pool } from '../infra/database';

export class RedirectRepository {
    async findByCustomAlias(alias: string) {
        const result = await pool.query(
            'SELECT long_url, expiry_at FROM urls WHERE custom_alias = $1',
            [alias],
        );
        return result.rows[0] || null;
    }

    async findByShortCode(code: string) {
        const result = await pool.query(
            'SELECT long_url, expiry_at FROM urls WHERE short_code = $1',
            [code],
        );
        return result.rows[0] || null;
    }
}
