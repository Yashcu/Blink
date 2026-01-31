import { pool } from '../infra/database';

export async function isUrlBlacklisted(longUrl: string): Promise<boolean> {
    const result = await pool.query(
        `SELECT 1 FROM blacklisted_urls 
         WHERE $1 ILIKE pattern 
         LIMIT 1`,
        [longUrl],
    );
    return result.rows.length > 0;
}
