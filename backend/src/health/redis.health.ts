// health/redis.health.ts
import { redisClient } from '../infra/redis.client';
import {
    isRedisCircuitOpen,
    recordRedisSuccess,
    recordRedisFailure,
} from '../shared/circuit-breaker';
import { Gauge } from 'prom-client';

// Prometheus metrics for monitoring
export const redisHealthyGauge = new Gauge({
    name: 'redis_healthy',
    help: '1 if Redis is considered healthy, 0 otherwise',
});

export const redisCircuitOpen = new Gauge({
    name: 'redis_circuit_open',
    help: '1 if Redis circuit breaker is open (failing fast)',
});

export async function checkRedis(): Promise<{
    healthy: boolean;
    details: string;
}> {
    const isOpen = isRedisCircuitOpen();

    redisCircuitOpen.set(isOpen ? 1 : 0);

    if (isOpen) {
        redisHealthyGauge.set(0);
        return {
            healthy: false,
            details: 'Circuit breaker is open due to repeated failures',
        };
    }

    try {
        const result = await redisClient.ping();
        if (result === 'PONG') {
            recordRedisSuccess();
            redisHealthyGauge.set(1);
            return { healthy: true, details: 'PONG received' };
        }

        recordRedisFailure();
        redisHealthyGauge.set(0);
        return { healthy: false, details: `Unexpected ping response: ${result}` };
    } catch (err) {
        recordRedisFailure();
        redisHealthyGauge.set(0);

        const errorMsg = err instanceof Error ? err.message : String(err);
        return { healthy: false, details: `Ping failed: ${errorMsg}` };
    }
}
