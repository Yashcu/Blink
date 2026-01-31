import { Worker } from 'bullmq';
import { redisClient } from '../infra/redis.client';
import { AnalyticsRepository, AnalyticsEvent } from '../repositories/analytics.repository';
import { analyticsProcessed, analyticsFailed } from './analytics.queue';
import { UAParser } from 'ua-parser-js';
import geoip from 'geoip-lite';
import crypto from 'crypto';
import { v5 as uuidv5 } from 'uuid';

const repo = new AnalyticsRepository();

// --- Configuration ---
const BATCH_SIZE = 50;
const FLUSH_INTERVAL_MS = 2000;
const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // Standard DNS namespace

interface BufferedJob {
    event: AnalyticsEvent;
    resolve: () => void;
    reject: (err: Error) => void;
}

let batchBuffer: BufferedJob[] = [];
let flushTimer: NodeJS.Timeout | null = null;

// --- Flush Logic ---
async function flushBuffer() {
    if (batchBuffer.length === 0) return;

    // 1. Swap buffer (concurrency safety)
    const currentBatch = [...batchBuffer];
    batchBuffer = [];
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }

    try {
        // 2. Bulk Insert
        const events = currentBatch.map((b) => b.event);
        await repo.insertBatch(events);

        // 3. Ack all jobs
        currentBatch.forEach((job) => job.resolve());
        analyticsProcessed.inc(currentBatch.length);
    } catch (err) {
        // 4. On failure, fail all jobs (BullMQ will retry them individually)
        console.error('❌ [ANALYTICS] Batch insert failed', err);
        analyticsFailed.inc(currentBatch.length);
        const error = err instanceof Error ? err : new Error(String(err));
        currentBatch.forEach((job) => job.reject(error));
    }
}

// --- Worker ---
export const analyticsWorker = new Worker(
    'analytics',
    async (job) => {
        const { userAgent, ip: rawIp, timestamp, shortCode, ...rest } = job.data;
        const ip = rawIp || '0.0.0.0';

        // 1. Parse Metadata (CPU bound - do it before locking in buffer)
        const parser = new UAParser(userAgent);
        const result = parser.getResult();

        const geo = geoip.lookup(ip);
        const country = geo ? geo.country : null;

        const isBot = /bot|crawler|spider|crawling/i.test(userAgent || '');

        // 2. Generate Deterministic ID (Idempotency Key)
        // Hash: shortCode + timestamp + ip + ua
        const uniqueString = `${shortCode}-${timestamp}-${ip}-${userAgent}`;
        const eventId = uuidv5(uniqueString, UUID_NAMESPACE);
        const ipHash = crypto.createHash('sha256').update(ip + (process.env.IP_HASH_SALT || 'salt')).digest('hex');

        const event: AnalyticsEvent = {
            id: eventId,
            shortCode,
            timestamp,
            ipHash,
            userAgent,
            referer: rest.referer,
            country,
            os: result.os.name || 'Unknown',
            browser: result.browser.name || 'Unknown',
            deviceType: result.device.type || 'desktop',
            isBot,
        };

        // 3. Add to Buffer and Wait
        return new Promise<void>((resolve, reject) => {
            batchBuffer.push({ event, resolve, reject });

            // Trigger flush if full
            if (batchBuffer.length >= BATCH_SIZE) {
                flushBuffer();
            }
            // Start timer if not running
            else if (!flushTimer) {
                flushTimer = setTimeout(flushBuffer, FLUSH_INTERVAL_MS);
            }
        });
    },
    {
        connection: redisClient,
        concurrency: 20,
        stalledInterval: 30000,
    },
);

// Graceful Shutdown
analyticsWorker.on('closing', async () => {
    console.log('[ANALYTICS] Flushing remaining events before shutdown...');
    await flushBuffer();
});

export async function closeAnalyticsWorker() {
    await analyticsWorker.close();
}
