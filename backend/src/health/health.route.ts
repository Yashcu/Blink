import { Express } from 'express';
import { checkPostgres } from './postgres.health';
import { checkRedis } from './redis.health';
import { checkAnalyticsQueue } from './queue.health';

export function registerHealthRoute(app: Express) {
    app.get('/health/live', (_req, res) => res.status(200).json({ status: 'alive' }));

    app.get('/health/ready', async (_req, res) => {
        const postgres = await checkPostgres();
        const redis = (await checkRedis()).healthy;
        const analyticsQueue = await checkAnalyticsQueue();
        const healthy = postgres && redis && analyticsQueue;
        res.status(healthy ? 200 : 503).json({
            status: healthy ? 'ready' : 'not ready',
            postgres,
            redis,
            analyticsQueue,
        });
    });
}
