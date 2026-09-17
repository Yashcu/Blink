import { redisClient } from '../infra/redis.client';

export const rateLimiter = async (ip: string, limit: number, windowSeconds: number) => {
    const key = `rate:${ip}`;
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);

    const multi = redisClient.multi();
    multi.zremrangebyscore(key, 0, windowStart); // Remove old requests
    multi.zadd(key, now, now.toString());        // Add current request
    multi.zcard(key);                            // Count requests in window
    multi.expire(key, windowSeconds);

    const results = await multi.exec();
    const count = results?.[2][1] as number;

    if (count > limit) {
        return { success: false, retryAfter: windowSeconds };
    }

    return { success: true };
};