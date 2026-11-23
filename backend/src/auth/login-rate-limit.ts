import { rateLimiter } from '../rate-limit/rate-limiter';
import { AppError } from '../shared/errors';
import { logger } from '../shared/logger';
import { redisClient } from '../infra/redis.client';

const MAX_IP_ATTEMPTS = 10;
const MAX_EMAIL_ATTEMPTS = 5;
const WINDOW_SECONDS = 60 * 15;

/**
 * Checks both IP-based and email-based login rate limits.
 * Throws AppError (429) if either limit is exceeded.
 *
 * @param ip - Client IP address
 * @param email - Email being used for login
 * @throws AppError if rate limit exceeded
 */
export async function checkLoginRateLimit(ip: string, email: string): Promise<void> {
    const ipResult = await rateLimiter(`login:ip:${ip}`, MAX_IP_ATTEMPTS, WINDOW_SECONDS);
    const emailResult = await rateLimiter(`login:email:${email}`, MAX_EMAIL_ATTEMPTS, WINDOW_SECONDS);

    if (!ipResult.success || !emailResult.success) {
        const retry = Math.max(ipResult.retryAfter ?? 0, emailResult.retryAfter ?? 0);
        logger.warn({ ip, email }, 'Login rate limit exceeded');
        throw new AppError(
            `Too many login attempts. Please try again in ${Math.ceil(retry)} seconds.`,
            429,
        );
    }
}

/**
 * Resets login rate limit counters for an IP/email after successful login.
 * Best-effort - logs warning if Redis is unavailable.
 *
 * @param ip - Client IP address
 * @param email - Email used for login
 */
export async function resetLoginRateLimit(ip: string, email: string): Promise<void> {
    try {
        await Promise.allSettled([
            redisClient.del(`rate:login:ip:${ip}`),
            redisClient.del(`rate:login:email:${email}`),
        ]);
    } catch (err) {
        logger.warn({ err }, 'Failed to reset login rate limit in Redis');
    }
}