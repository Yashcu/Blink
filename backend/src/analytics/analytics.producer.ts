import { analyticsQueue } from './analytics.queue';

export async function emitAnalyticsEvent(event: {
    shortCode: string;
    timestamp: number;
    ip: string;
    userAgent: string | null;
    referer: string | null;
}) {
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
            new Promise((_, reject) => setTimeout(() => reject(new Error('Queue timeout')), 200)),
        ]);
    } catch {
        // FAIL‑SILENT: analytics must never affect redirects
    }
}
