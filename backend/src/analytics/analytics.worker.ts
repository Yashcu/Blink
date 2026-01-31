import { Worker, Job } from 'bullmq';
import { redisClient } from '../infra/redis.client';
import { AnalyticsRepository, AnalyticsEvent } from '../repositories/analytics.repository';
import { analyticsProcessed, analyticsFailed } from './analytics.queue';
import { UAParser } from 'ua-parser-js';
import geoip from 'geoip-lite';
import crypto from 'crypto';
import { v5 as uuidv5 } from 'uuid';
import { logger } from '../shared/logger';

const repo = new AnalyticsRepository();
const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export const analyticsWorker = new Worker(
    'analytics',
    async (job: Job) => {
        try {
            const { userAgent, ip: rawIp, timestamp, shortCode, ...rest } = job.data;
            const ip = rawIp || '0.0.0.0';

            const parser = new UAParser(userAgent);
            const result = parser.getResult();

            const geo = geoip.lookup(ip);
            const country = geo ? geo.country : null;

            const isBot = /bot|crawler|spider|crawling/i.test(userAgent || '');

            const uniqueString = `${shortCode}-${timestamp}-${ip}-${userAgent}`;
            const eventId = uuidv5(uniqueString, UUID_NAMESPACE);
            const ipHash = crypto
                .createHash('sha256')
                .update(ip + (process.env.IP_HASH_SALT || 'salt'))
                .digest('hex');

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

            await repo.insertBatch([event]);

            analyticsProcessed.inc();

            logger.debug({ jobId: job.id, eventId }, 'Analytics event processed');

        } catch (err: any) {
            analyticsFailed.inc();
            logger.error({ err, jobId: job.id }, 'Analytics job failed');
            throw err;
        }
    },
    {
        connection: redisClient,
        concurrency: 10,
        stalledInterval: 30000,
    },
);

analyticsWorker.on('error', (err) => {
    logger.error({ err }, '❌ Analytics Worker Error');
});

analyticsWorker.on('failed', (job, err) => {
    logger.warn({ jobId: job?.id, err }, '⚠️ Analytics Job Failed (will retry if attempts remain)');
});

export async function closeAnalyticsWorker() {
    await analyticsWorker.close();
}