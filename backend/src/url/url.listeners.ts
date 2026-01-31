import { eventBus, EVENTS } from '../shared/event-bus';
import { redisCache } from '../infra/redis.cache';

// --- Event Handlers ---

// 1. Warm Cache on Create
eventBus.on(EVENTS.URL.CREATED, async ({ shortCode, longUrl, customAlias }) => {
    try {
        await redisCache.set(`short:${shortCode}`, { longUrl }, { ex: 86400 });
        if (customAlias) {
            await redisCache.set(`alias:${customAlias}`, { shortCode }, { ex: 86400 });
        }
        // console.log(`[Cache] Warmed for ${shortCode}`);
    } catch (err) {
        console.error('[Cache] Warm failed', err);
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
async function invalidateUrlCache(shortCode: string, customAlias?: string | null) {
    try {
        const keys = [`short:${shortCode}`];
        if (customAlias) keys.push(`alias:${customAlias}`);
        await redisCache.del(keys);
        // console.log(`[Cache] Invalidated ${shortCode}`);
    } catch (err) {
        console.error('[Cache] Invalidation failed', err);
    }
}
