import { Express } from 'express';
import { registerHealthRoute } from './health/health.route';
import { registerAuthRoutes } from './auth/auth.routes';
import { registerUrlRoutes } from './url/url.routes';
import { registerRedirectRoutes } from './redirect/redirect.routes';
import { registerAnalyticsRoutes } from './analytics/analytics.routes';
import { registerMetricsRoute } from './metrics/metrics.routes';

export function registerRoutes(app: Express) {
    registerMetricsRoute(app);
    registerHealthRoute(app);
    registerAuthRoutes(app);
    registerUrlRoutes(app);
    registerAnalyticsRoutes(app);
    registerRedirectRoutes(app);
}
