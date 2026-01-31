import { Pool, types } from 'pg';
import { env } from '../config/env';
import { logger } from '../shared/logger';

types.setTypeParser(20, (val) => parseInt(val, 10));

const isProd = env.isProduction;

export const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: isProd
        ? {
            rejectUnauthorized: true,
            ca: env.DB_CA_PEM,
        }
        : false,
    max: Number(process.env.PG_POOL_MAX ?? 20),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
    logger.error({ err }, '[DB] Unexpected error on idle client');
});

pool.on('connect', () => {
    logger.debug('[DB] New client connected');
});

pool.query('SELECT 1')
    .then(() => logger.info('[DB] Connected to PostgreSQL'))
    .catch((err) => {
        logger.fatal({ err }, '[DB] Failed to connect at startup');
    });