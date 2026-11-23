import { Express } from 'express';
import { checkPostgres } from './postgres.health';
import { checkRedis } from './redis.health';
import { checkAnalyticsQueue } from './queue.health';
import { isRedisCircuitOpen } from '../shared/circuit-breaker';

/**
 * Registers health check endpoints.
 * - /health/live: Liveness probe (always returns 200 if process is running)
 * - /health/ready: Readiness probe (checks all dependencies)
 */
export function registerHealthRoute(app: Express): void {
    app.get('/health/live', (_req, res) => res.status(200).send('alive'));

    app.get('/health/ready', async (_req, res) => {
        const postgres = await checkPostgres();
        const redisStatus = await checkRedis();
        const queueHealthy = await checkAnalyticsQueue();
        const circuitOpen = isRedisCircuitOpen();

        const healthy = postgres && redisStatus.healthy && queueHealthy && !circuitOpen;

        res.status(healthy ? 200 : 503).json({
            status: healthy ? 'ready' : 'degraded',
            postgres,
            redis: redisStatus.healthy,
            analyticsQueue: queueHealthy,
            circuitBreaker: circuitOpen ? 'OPEN (Redis issues)' : 'CLOSED (Healthy)',
        });
    });
}