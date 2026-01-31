import { Pool, types } from 'pg';
import { dbConfig } from '../config/database';

types.setTypeParser(20, (val) => parseInt(val, 10));

export const pool = new Pool({
    connectionString: dbConfig.connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: Number(process.env.PG_POOL_MAX ?? 20),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
});

// -- Observability & Crash Prevention --

pool.on('error', (err) => {
    console.error('❌ [DB] Unexpected error on idle client', err.message);
});

pool.on('connect', () => {
    // console.debug('🔌 [DB] New client connected');
});

// Test the connection immediately on startup
pool.query('SELECT 1')
    .then(() => console.log('✅ [DB] Connected to PostgreSQL'))
    .catch((err) => {
        console.error('❌ [DB] Failed to connect at startup:', err.message);
    });
