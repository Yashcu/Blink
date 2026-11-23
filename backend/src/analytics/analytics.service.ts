// backend/src/analytics/analytics.service.ts
import { AnalyticsRepository, AnalyticsStats } from '../repositories/analytics.repository';
import { UrlRepository } from '../repositories/url.repository';
import { AppError } from '../shared/errors';

/**
 * Response shape for analytics API.
 */
export interface AnalyticsResponse extends AnalyticsStats {
    url: {
        shortCode: string;
        customAlias: string | null;
        longUrl: string;
        expiresAt: Date | null;
    };
}

export class AnalyticsService {
    private analyticsRepo = new AnalyticsRepository();
    private urlRepo = new UrlRepository();

    /**
     * Retrieves analytics statistics for a user's short URL.
     * Verifies ownership before returning data.
     *
     * @param code - Short code or custom alias
     * @param userId - Authenticated user ID
     * @returns Analytics data with URL metadata
     * @throws AppError (404) if URL not found or unauthorized
     */
    async getStats(code: string, userId: string): Promise<AnalyticsResponse> {
        // Ownership verification
        const url = await this.urlRepo.findOwnedByCode(code, userId);
        if (!url) throw new AppError('URL not found or unauthorized', 404);

        // Aggregate stats for both standard code and alias if they exist
        const targetCodes = [url.shortCode];
        if (url.customAlias) targetCodes.push(url.customAlias);

        const stats = await this.analyticsRepo.getStatsByShortCodes(targetCodes);

        return {
            ...stats,
            url: {
                shortCode: url.shortCode,
                customAlias: url.customAlias ?? null,
                longUrl: url.longUrl,
                expiresAt: url.expiresAt ?? null,
            },
        };
    }
}