import { Express, Request, Response } from 'express';
import { registry } from './metrics';

export function registerMetricsRoute(app: Express) {
    app.get('/api/metrics', async (_req: Request, res: Response) => {
        res.set('Content-Type', registry.contentType);
        res.end(await registry.metrics());
    });
}
