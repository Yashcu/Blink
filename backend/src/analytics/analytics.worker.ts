// analytics/analytics.worker.ts
import { Worker } from 'bullmq';
import { redisClient } from '../infra/redis.client';
import { AnalyticsRepository } from '../repositories/analytics.repository';
import { analyticsProcessed, analyticsFailed } from './analytics.queue';
import { UAParser } from 'ua-parser-js';
import geoip from 'geoip-lite';

const repo = new AnalyticsRepository();

// Reuse the shared redisClient – same connection pool + lifecycle
export const analyticsWorker = new Worker(
    'analytics',
    async (job) => {
        try {
            const { userAgent, ip: rawIp, ...rest } = job.data;
            const ip = rawIp || '0.0.0.0';

            // Parse User Agent
            const parser = new UAParser(userAgent);
            const result = parser.getResult();
            const os = result.os.name || 'Unknown';
            const browser = result.browser.name || 'Unknown';
            const device = result.device.type || 'desktop'; // Default to desktop if undefined

            // Parse IP for Country
            const geo = geoip.lookup(ip);
            const country = geo ? geo.country : null;
            const ua = (userAgent || '').toLowerCase();
            const isBot = /bot|crawler|spider|crawling|preview|facebookexternalhit|slackbot/.test(
                ua,
            );

            await repo.insert({
                ...rest,
                userAgent,
                ip,
                country,
                os,
                browser,
                deviceType: device,
                isBot,
            });

            analyticsProcessed.inc();
        } catch (err) {
            analyticsFailed.inc();

            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error(`Analytics insert failed for job ${job.id}: ${errorMessage}`);

            throw err;
        }
    },
    {
        connection: redisClient,
        concurrency: 5,
        stalledInterval: 30000,
        maxStalledCount: 3,
        limiter: {
            max: 100,
            duration: 60 * 1000,
        },
    },
);

// Graceful shutdown hook (called from server.ts)
analyticsWorker.on('closing', () => {
    console.log('[ANALYTICS WORKER] Closing...');
});

export async function closeAnalyticsWorker(timeoutMs = 10000) {
    const timeout = setTimeout(() => {
        console.warn('[ANALYTICS WORKER] Close timeout exceeded');
    }, timeoutMs);

    try {
        await analyticsWorker.close();
        clearTimeout(timeout);
        console.log('[ANALYTICS WORKER] Closed gracefully');
    } catch (err) {
        clearTimeout(timeout);
        console.error('[ANALYTICS WORKER] Error during close:', err);
    }
}
