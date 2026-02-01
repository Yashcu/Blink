// backend/src/analytics/analytics.service.ts
import { AnalyticsRepository } from '../repositories/analytics.repository';
import { UrlRepository } from '../repositories/url.repository';
import { AppError } from '../shared/errors';

export class AnalyticsService {
    private analyticsRepo = new AnalyticsRepository();
    private urlRepo = new UrlRepository();

    async getStats(code: string, userId: string) {
        // Ownership verification
        const url = await this.urlRepo.findOwnedByCode(code, userId);
        if (!url) throw new AppError('URL not found or unauthorized', 404);

        // Aggregate stats for both standard code and alias if they exist
        const targetCodes = [url.shortCode];
        if (url.customAlias) targetCodes.push(url.customAlias);

        const stats = await this.analyticsRepo.getStatsByShortCodes(targetCodes);

        return {
            ...stats,
            details: {
                shortCode: url.shortCode,
                longUrl: url.longUrl,
                expiresAt: url.expiresAt
            }
        };
    }
}