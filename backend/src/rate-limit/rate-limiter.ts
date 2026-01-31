// rate-limit/rate-limiter.ts
import { redisClient } from '../infra/redis.client';
import { Counter } from 'prom-client';

// Metrics - add to your existing metrics.ts if not already there
export const rateLimitAllowed = new Counter({
    name: 'rate_limit_allowed_total',
    help: 'Total requests allowed by rate limiter',
    labelNames: ['limiter_type'],
});

export const rateLimitBlocked = new Counter({
    name: 'rate_limit_blocked_total',
    help: 'Total requests blocked by rate limiter',
    labelNames: ['limiter_type'],
});

export const rateLimitSkipped = new Counter({
    name: 'rate_limit_skipped_total',
    help: 'Total rate limit checks skipped due to Redis failure',
    labelNames: ['limiter_type'],
});

/**
 * Sliding window rate limiter using Redis sorted set.
 * Fail-open: returns true if Redis fails / is unavailable.
 *
 * @param key Unique rate limit key (e.g. "ratelimit:login:1.2.3.4")
 * @param maxRequests Maximum requests in the window
 * @param windowSeconds Sliding window duration in seconds
 * @param limiterType For metrics (e.g. "login", "api", "create-url")
 * @returns true = allowed, false = blocked
 */
export async function checkRateLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number,
    limiterType: string = 'general',
): Promise<boolean> {
    const now = Date.now();
    const windowStartMs = now - windowSeconds * 1000;

    // Lua script to atomically:
    // 1. Remove old entries (ZREMRANGEBYSCORE)
    // 2. Count current entries (ZCARD)
    // 3. If count < max, add new entry (ZADD) & set expiry (EXPIRE)
    // 4. Return count and allowed status
    const script = `
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local windowStartMs = tonumber(ARGV[2])
        local maxRequests = tonumber(ARGV[3])
        local windowSeconds = tonumber(ARGV[4])
        local uniqueMember = ARGV[5]

        -- Remove old entries
        redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStartMs)

        -- Count current requests
        local count = redis.call('ZCARD', key)

        if count >= maxRequests then
            return 0 -- Blocked
        end

        -- Add current request
        redis.call('ZADD', key, now, uniqueMember)
        
        -- Set expiry
        redis.call('EXPIRE', key, windowSeconds + 60)

        return 1 -- Allowed
    `;

    try {
        const uniqueMember = `${now}-${Math.random().toString(36).slice(2)}`;

        const result = await redisClient.eval(
            script,
            1, // number of keys
            key,
            String(now),
            String(windowStartMs),
            String(maxRequests),
            String(windowSeconds),
            uniqueMember,
        );

        if (result === 1) {
            rateLimitAllowed.inc({ limiter_type: limiterType });
            return true;
        } else {
            rateLimitBlocked.inc({ limiter_type: limiterType });
            return false;
        }
    } catch (err) {
        // FAIL-OPEN: never block legitimate traffic because of Redis issues
        console.error('[RateLimit] Redis error:', err);
        rateLimitSkipped.inc({ limiter_type: limiterType });
        return true;
    }
}
