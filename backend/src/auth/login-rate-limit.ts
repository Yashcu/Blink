import { rateLimiter } from '../rate-limit/rate-limiter';
import { AppError } from '../shared/errors';
import { logger } from '../shared/logger';

const MAX_IP_ATTEMPTS = 10;
const MAX_EMAIL_ATTEMPTS = 5;
const WINDOW_SECONDS = 60 * 15;

export async function checkLoginRateLimit(ip: string, email: string) {
    const ipResult = await rateLimiter(`login:ip:${ip}`, MAX_IP_ATTEMPTS, WINDOW_SECONDS);

    const emailResult = await rateLimiter(`login:email:${email}`, MAX_EMAIL_ATTEMPTS, WINDOW_SECONDS);

    if (!ipResult.success || !emailResult.success) {
        const retry = Math.max(ipResult.retryAfter || 0, emailResult.retryAfter || 0);
        logger.warn({ ip, email }, 'Login rate limit exceeded');
        throw new AppError(
            `Too many login attempts. Please try again in ${Math.ceil(retry)} seconds.`,
            429,
        );
    }
}