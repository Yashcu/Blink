// src/analytics/queue.monitor.ts
import { analyticsQueue } from './analytics.queue';
import { analyticsQueueDepth } from './analytics.queue';

setInterval(async () => {
    try {
        // ✅ NEW: Wrapped in try/catch to prevent crash when Redis is down
        const count = await analyticsQueue.getWaitingCount();
        analyticsQueueDepth.set(count);
    } catch (_err) {
        // Silent fail: If Redis is down, we just skip updating metrics.
        // The server stays ALIVE.
    }
}, 5000);
