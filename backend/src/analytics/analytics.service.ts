import { AnalyticsRepository } from '../repositories/analytics.repository';
import { UrlRepository } from '../repositories/url.repository';
import { AppError } from '../shared/errors';

export class AnalyticsService {
    constructor(
        private analyticsRepo = new AnalyticsRepository(),
        private urlRepo = new UrlRepository(),
    ) {}

    async getStats(code: string, userId: string) {
        const url = await this.urlRepo.findOwnedByCode(code, userId);

        if (!url) {
            throw new AppError('Not found', 404);
        }

        // 🔒 Optional hardening: block analytics for expired URLs
        if (url.expiresAt && url.expiresAt <= new Date()) {
            throw new AppError('URL expired', 410);
        }

        const codes = [url.shortCode];
        if (url.customAlias) {
            codes.push(url.customAlias);
        }

        let stats;
        try {
            stats = await this.analyticsRepo.getStatsByShortCodes(codes);
        } catch {
            stats = {
                totalClicks: 0,
                lastAccessed: null,
                countries: [],
                devices: {},
                osStats: [],
                browserStats: [],
                bots: 0,
            };
        }

        return {
            ...stats,
            url: {
                shortCode: url.shortCode,
                customAlias: url.customAlias,
                longUrl: url.longUrl,
            },
        };
    }
}
