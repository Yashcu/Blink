// analytics/analytics.queue.ts
import { Queue } from 'bullmq';
import { Gauge, Counter } from 'prom-client';
import { redisClient } from '../infra/redis.client';

/** Queue depth gauge (waiting jobs) */
export const analyticsQueueDepth = new Gauge({
    name: 'analytics_queue_depth',
    help: 'Number of jobs waiting in analytics queue',
});

/** Successfully processed analytics events counter */
export const analyticsProcessed = new Counter({
    name: 'analytics_events_processed_total',
    help: 'Total analytics events successfully inserted to DB',
});

/** Failed analytics events counter (retried or dropped) */
export const analyticsFailed = new Counter({
    name: 'analytics_events_failed_total',
    help: 'Total analytics events that failed to insert (dropped or retried)',
});

/** Dropped events due to Redis unavailability at enqueue time */
export const analyticsDropped = new Counter({
    name: 'analytics_events_dropped_total',
    help: 'Total analytics events dropped due to Redis unavailability at enqueue time',
});

/**
 * BullMQ queue for analytics processing.
 * Uses shared Redis client for consistent lifecycle.
 * Configured with retry/backoff for resilience.
 * Analytics are non-critical: max 3 retries with exponential backoff.
 */
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
    },
});

