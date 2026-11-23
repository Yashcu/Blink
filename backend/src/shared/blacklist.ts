import { pool } from '../infra/database';

/**
 * Checks if a URL matches any blacklisted pattern.
 * Uses case-insensitive pattern matching (ILIKE).
 *
 * @param longUrl - Full URL to check
 * @returns true if URL is blacklisted, false otherwise
 */
export async function isUrlBlacklisted(longUrl: string): Promise<boolean> {
    const result = await pool.query(
        `SELECT 1 FROM blacklisted_urls
         WHERE $1 ILIKE pattern
         LIMIT 1`,
        [longUrl],
    );
    return result.rows.length > 0;
}
