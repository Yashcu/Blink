import { Express } from "express";
import { checkPostgres } from "./postgres.health";
import { checkRedis } from "./redis.health";
import { checkAnalyticsQueue } from "./queue.health";
import { isRedisCircuitOpen } from "../shared/circuit-breaker";

export function registerHealthRoute(app: Express) {
    app.get('health/live', (_req, res) => res.status(200).send('alive'));

    app.get('health/ready', async (_req, res) => {
        const postgres = await checkPostgres();
        const redisStatus = await checkRedis();
        const queueHealthy = await checkAnalyticsQueue();
        const circuitOpen = isRedisCircuitOpen();

        const healthy = postgres && redisStatus && queueHealthy && !circuitOpen;

        res.status(healthy ? 200 : 503).json({
            status: healthy ? 'ready' : 'degraded',
            postgres,
            redis: redisStatus.healthy,
            analyticsQueue: queueHealthy,
            circuitBreaker: circuitOpen ? 'OPEN (Redis issues)' : 'CLOSED (Healthy)',
        });
    })
}