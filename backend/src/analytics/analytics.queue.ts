// analytics/analytics.queue.ts
import { Queue } from 'bullmq';
import { Gauge, Counter } from 'prom-client';
import { redisClient } from '../infra/redis.client';

// Metrics
export const analyticsQueueDepth = new Gauge({
    name: 'analytics_queue_depth',
    help: 'Number of jobs waiting in analytics queue',
});

export const analyticsProcessed = new Counter({
    name: 'analytics_events_processed_total',
    help: 'Total analytics events successfully inserted to DB',
});

export const analyticsFailed = new Counter({
    name: 'analytics_events_failed_total',
    help: 'Total analytics events that failed to insert (dropped or retried)',
});

export const analyticsDropped = new Counter({
    name: 'analytics_events_dropped_total',
    help: 'Total analytics events dropped due to Redis unavailability at enqueue time',
});

// Queue – using shared redisClient (consistent lifecycle)
export const analyticsQueue = new Queue('analytics', {
    connection: redisClient,
    defaultJobOptions: {
        removeOnComplete: { age: 3600 * 24 * 7 }, // 7 days
        removeOnFail: { count: 1000 }, // keep last 1000 failures
        attempts: 3, // retry up to 3 times on DB failure
        backoff: {
            type: 'exponential',
            delay: 1000, // 1s → 2s → 4s ...
        },
        // Important: do NOT retry forever – analytics are not critical
    },
});

// Optional: update depth metric periodically (you can call this from queue.monitor.ts)
setInterval(async () => {
    try {
        const count = await analyticsQueue.getWaitingCount();
        analyticsQueueDepth.set(count);
    } catch (_err) {
        // Silent fail: If Redis is down, we just can't report depth right now.
        // Do NOT crash the process.
    }
}, 5000);
