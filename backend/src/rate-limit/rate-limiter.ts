import { redisClient } from '../infra/redis.client';
import { isRedisCircuitOpen } from '../shared/circuit-breaker';

export interface RateLimitResult {
    success: boolean;
    retryAfter?: number;
}

export const rateLimiter = {
    /**
     * Checks if an IP has exceeded the rate limit.
     * Returns success status and time to retry if failed.
     */
    async check(ip: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
        // 1. Circuit Breaker: If Redis is down, fail open (allow traffic)
        if (isRedisCircuitOpen()) {
            return { success: true };
        }

        const key = `rate:${ip}`;

        try {
            const requests = await redisClient.incr(key);

            if (requests === 1) {
                await redisClient.expire(key, windowSeconds);
            }

            if (requests > limit) {
                // Fetch valid TTL to tell user when to retry
                const ttl = await redisClient.ttl(key);
                return {
                    success: false,
                    retryAfter: ttl > 0 ? ttl : windowSeconds
                };
            }

            return { success: true };
        } catch (error) {
            // Redis failure -> Fail Open
            return { success: true };
        }
    },
};
