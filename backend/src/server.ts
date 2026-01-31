import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { pool } from './infra/database';
import { redisClient } from './infra/redis.client';
import { closeAnalyticsWorker } from './analytics/analytics.worker';
import './analytics/queue.monitor';
import './url/url.listeners';
import { logger } from './shared/logger';

const app = createApp();
const port = Number(env.PORT);

const server = http.createServer(app);

server.listen(port, () => {
    logger.info(`🚀 Server running on port ${port}`);
});

let shuttingDown = false;

async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info({ signal }, '🛑 Shutdown signal received. Starting graceful teardown...');

    const FORCE_EXIT_TIMEOUT = 30000;
    const forceExit = setTimeout(() => {
        logger.fatal('❌ Shutdown timeout exceeded – forcing exit');
        process.exit(1);
    }, FORCE_EXIT_TIMEOUT);

    try {
        // 1. Stop accepting new HTTP requests
        server.close(() => {
            logger.info('→ HTTP server closed');
        });

        // 2. Close analytics worker with generous timeout
        await closeAnalyticsWorker();
        logger.info('→ Analytics worker closed');

        // 3. Close Redis (best effort)
        try {
            await redisClient.quit();
            logger.info('→ Redis connection closed');
        } catch (err: any) {
            logger.warn('→ Redis quit failed (non-critical):', err.message);
        }

        // 4. Close PostgreSQL pool
        try {
            await pool.end();
            logger.info('→ PostgreSQL pool ended');
        } catch (err: any) {
            logger.error('→ PostgreSQL pool close failed:', err.message);
        }

        clearTimeout(forceExit);
        logger.info('✅ Graceful shutdown complete');
        process.exit(0);
    } catch (err) {
        logger.fatal({ err }, '❌ Fatal error during shutdown');
        clearTimeout(forceExit);
        process.exit(1);
    }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, '❌ Unhandled Rejection');
});

process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, '❌ Uncaught Exception');
    process.exit(1);
});