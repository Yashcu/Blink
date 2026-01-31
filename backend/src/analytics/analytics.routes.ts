import { Express, Response, NextFunction } from 'express'; // Added Response, NextFunction
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { AnalyticsService } from './analytics.service';

const service = new AnalyticsService();

export function registerAnalyticsRoutes(app: Express) {
    app.get(
        '/api/analytics/:code',
        requireAuth,
        async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
            try {
                const userId = req.user!.userId;

                const rawCode = req.params.code;
                const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;

                const stats = await service.getStats(code, userId);
                res.json(stats);
            } catch (err) {
                next(err);
            }
        },
    );
}