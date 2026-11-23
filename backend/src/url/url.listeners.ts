import { eventBus, EVENTS } from '../shared/event-bus';
import { redisCache } from '../infra/redis.cache';
import { logger } from '../shared/logger';

// --- Event Handlers ---

// 1. Warm Cache on Create
eventBus.on(EVENTS.URL.CREATED, async ({ shortCode, longUrl, customAlias }) => {
    try {
        await redisCache.set(`short:${shortCode}`, { longUrl }, { ex: 86400 });
        if (customAlias) {
            await redisCache.set(`alias:${customAlias}`, { shortCode }, { ex: 86400 });
        }
        logger.debug({ shortCode }, 'Cache warmed');
    } catch (err) {
        logger.error({ err, shortCode }, 'Cache warm failed');
    }
});

// 2. Invalidate Cache on Update/Delete
eventBus.on(EVENTS.URL.UPDATED, async ({ shortCode, customAlias }) => {
    await invalidateUrlCache(shortCode, customAlias);
});

eventBus.on(EVENTS.URL.DELETED, async ({ shortCode, customAlias }) => {
    await invalidateUrlCache(shortCode, customAlias);
});

// Helper
async function invalidateUrlCache(shortCode: string, customAlias?: string | null): Promise<void> {
    try {
        const keys = [`short:${shortCode}`];
        if (customAlias) keys.push(`alias:${customAlias}`);
        await redisCache.del(keys);
        logger.debug({ shortCode }, 'Cache invalidated');
    } catch (err) {
        logger.error({ err, shortCode }, 'Cache invalidation failed');
    }
}
