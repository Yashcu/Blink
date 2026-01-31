import { Pool } from 'pg';
import { dbConfig } from '../config/database';

export const pool = new Pool({
    connectionString: dbConfig.connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: Number(process.env.PG_POOL_MAX ?? 20),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
});
