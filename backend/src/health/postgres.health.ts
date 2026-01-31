import { pool } from '../infra/database';

export async function checkPostgres(): Promise<boolean> {
    try {
        await pool.query('SELECT 1');
        return true;
    } catch {
        return false;
    }
}
