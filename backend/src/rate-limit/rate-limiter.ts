import { redisClient } from '../infra/redis.client';

/**
 * Result of a rate limit check.
 */
export interface RateLimitResult {
    success: boolean;
    retryAfter?: number;
}

/**
 * Sliding window rate limiter using Redis sorted sets.
 * Removes expired entries, adds current request, counts requests in window.
 *
 * @param identifier - Unique identifier (e.g., IP address, email)
 * @param limit - Maximum requests allowed in the window
 * @param windowSeconds - Time window in seconds
 * @returns RateLimitResult with success flag and optional retryAfter seconds
 */
export const rateLimiter = async (
    identifier: string,
    limit: number,
    windowSeconds: number,
): Promise<RateLimitResult> => {
    const key = `rate:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    const multi = redisClient.multi();
    multi.zremrangebyscore(key, 0, windowStart); // Remove old requests
    multi.zadd(key, now, now.toString()); // Add current request
    multi.zcard(key); // Count requests in window
    multi.expire(key, windowSeconds);

    const results = await multi.exec();
    const count = (results?.[2]?.[1] as number) ?? 0;

    if (count > limit) {
        return { success: false, retryAfter: windowSeconds };
    }

    return { success: true };
};