import { rateLimiter } from '../rate-limit/rate-limiter';
import { AuthError } from '../shared/errors';

export async function checkLoginRateLimit(ip: string) {
    const result = await rateLimiter.check(ip, 5, 900);

    if (!result.success) {
        throw new AuthError(`Too many login attempts. Please try again in ${result.retryAfter} seconds.`);
    }
}