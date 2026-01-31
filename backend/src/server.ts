import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { pool } from './infra/database';
import { redisClient } from './infra/redis.client';
import { closeAnalyticsWorker } from './analytics/analytics.worker';
import './analytics/queue.monitor';

const app = createApp();
const port = Number(env.PORT);

const server = http.createServer(app);

server.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
});

let shuttingDown = false;

async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`🛑 ${signal} received. Shutting down...`);

    const FORCE_EXIT_TIMEOUT = 30000; // 30 seconds max
    const forceExit = setTimeout(() => {
        console.error('❌ Shutdown timeout exceeded – forcing exit');
        process.exit(1);
    }, FORCE_EXIT_TIMEOUT);

    try {
        // 1. Stop accepting new HTTP requests
        server.close(() => {
            console.log('→ HTTP server closed (no new connections)');
        });

        // 2. Close analytics worker with generous timeout
        await closeAnalyticsWorker(15000);

        // 3. Close Redis (best effort)
        try {
            await redisClient.quit();
            console.log('→ Redis connection closed');
        } catch (err: any) {
            console.log('→ Redis quit failed (non-critical):', err.message);
        }

        // 4. Close PostgreSQL pool
        try {
            await pool.end();
            console.log('→ PostgreSQL pool ended');
        } catch (err: any) {
            console.log('→ PostgreSQL pool close failed:', err.message);
        }

        clearTimeout(forceExit);
        console.log('✅ Graceful shutdown complete');
        process.exit(0);
    } catch (err) {
        console.error('❌ Shutdown error', err);
        clearTimeout(forceExit);
        process.exit(1);
    }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception', error);
    process.exit(1);
});
