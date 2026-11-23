import { pool } from '../infra/database';

/**
 * Checks PostgreSQL connectivity with a simple query.
 *
 * @returns true if database is reachable, false otherwise
 */
export async function checkPostgres(): Promise<boolean> {
    try {
        await pool.query('SELECT 1');
        return true;
    } catch {
        return false;
    }
}
