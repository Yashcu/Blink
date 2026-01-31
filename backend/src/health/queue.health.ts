import { analyticsQueue } from '../analytics/analytics.queue';

export async function checkAnalyticsQueue(): Promise<boolean> {
    try {
        await analyticsQueue.getJobCounts();
        return true;
    } catch {
        return false;
    }
}
