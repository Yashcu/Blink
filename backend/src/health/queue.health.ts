import { analyticsQueue } from '../analytics/analytics.queue';

/**
 * Checks analytics queue (BullMQ) connectivity.
 *
 * @returns true if queue is reachable, false otherwise
 */
export async function checkAnalyticsQueue(): Promise<boolean> {
    try {
        await analyticsQueue.getJobCounts();
        return true;
    } catch {
        return false;
    }
}
