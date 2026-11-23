import { Express, Request, Response } from 'express';
import { registry } from './metrics';

/**
 * Registers Prometheus metrics endpoint.
 * Exposes /api/metrics for scraping.
 */
export function registerMetricsRoute(app: Express): void {
    app.get('/api/metrics', async (_req: Request, res: Response) => {
        res.set('Content-Type', registry.contentType);
        res.end(await registry.metrics());
    });
}
