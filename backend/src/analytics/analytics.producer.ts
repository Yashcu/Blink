import { analyticsQueue } from './analytics.queue';

interface AnalyticsEventInput {
    shortCode: string;
    timestamp: number;
    ip: string;
    userAgent: string | null;
    referer: string | null;
}

const QUEUE_TIMEOUT_MS = 5000;

/**
 * Enqueues an analytics event for async processing.
 * Fire-and-forget: never blocks or fails the redirect response.
 * Timeout ensures we don't hang on Redis issues.
 *
 * @param event - Analytics event data from redirect handler
 */
export async function emitAnalyticsEvent(event: AnalyticsEventInput): Promise<void> {
    const safeEvent = {
        ...event,
        shortCode: event.shortCode.trim(),
    };

    try {
        await Promise.race([
            analyticsQueue.add('redirect', safeEvent, {
                removeOnComplete: true,
                removeOnFail: true,
                attempts: 1,
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Queue timeout')), QUEUE_TIMEOUT_MS)),
        ]);
    } catch {
        // FAIL-SILENT: analytics must never affect redirects
    }
}
