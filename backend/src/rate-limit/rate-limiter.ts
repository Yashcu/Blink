import { redisClient } from '../infra/redis.client';
import { isRedisCircuitOpen } from '../shared/circuit-breaker';
import { logger } from '../shared/logger';

export interface RateLimitResult {
    success: boolean;
    retryAfter?: number;
}

export interface RateLimitOptions {
    failOpen?: boolean;
}

export const rateLimiter = {
    async check(
        ip: string,
        limit: number,
        windowSeconds: number,
        options: RateLimitOptions = { failOpen: false }
    ): Promise<RateLimitResult> {
        const { failOpen } = options;

        if (isRedisCircuitOpen()) {
            if (failOpen) {
                logger.warn({ ip }, 'Rate Limit skipped (Circuit Open)');
                return { success: true };
            }
            logger.error({ ip }, 'Rate Limit blocked (Circuit Open - Fail Closed)');
            return { success: false, retryAfter: 60 };
        }

        const key = `rate:${ip}`;

        try {
            const requests = await redisClient.incr(key);

            if (requests === 1) {
                await redisClient.expire(key, windowSeconds);
            }

            if (requests > limit) {
                const ttl = await redisClient.ttl(key);
                return {
                    success: false,
                    retryAfter: ttl > 0 ? ttl : windowSeconds
                };
            }

            return { success: true };
        } catch (error) {
            logger.error({ err: error, ip }, 'Rate Limit Redis Failure');

            if (failOpen) {
                return { success: true };
            }

            return { success: false, retryAfter: 60 };
        }
    },
};