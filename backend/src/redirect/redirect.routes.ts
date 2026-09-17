import { Express, Router, Request, Response } from 'express';
import { RedirectService } from './redirect.service'; // Switch from UrlService
import { emitAnalyticsEvent } from '../analytics/analytics.producer';
import { rateLimiter } from '../rate-limit/rate-limiter';
import { redirectLatency, redirectErrors, maliciousUrlAttempts } from '../metrics/metrics';
import { isUrlBlacklisted } from '../shared/blacklist';

const router = Router();
const redirectService = new RedirectService(); // Use RedirectService

router.get('/:code', async (req: Request, res: Response): Promise<void> => {
    const endTimer = redirectLatency.startTimer();
    const code = req.params.code as string;

    // IP Extraction (Cloudflare/Proxy aware)
    const rawIp = req.headers['x-forwarded-for'];
    const ip = Array.isArray(rawIp) ? rawIp[0] : (rawIp || req.socket.remoteAddress || 'unknown');

    try {
        // 1. Transparent Rate Limiting
        const limitCheck = await rateLimiter(ip, 100, 600);
        if (!limitCheck.success) {
            res.status(429).send(`Too Many Requests. Retry in ${limitCheck.retryAfter}s.`);
            endTimer({ result: 'rate_limited' });
            return;
        }

        // 2. Optimized Resolve (Cache -> DB)
        const longUrl = await redirectService.resolve(code);

        if (!longUrl) {
            res.status(404).send('URL Not Found');
            endTimer({ result: 'not_found' });
            return;
        }

        // 3. Security Check
        if (await isUrlBlacklisted(longUrl)) {
            maliciousUrlAttempts.inc();
            res.status(403).send('Link blocked for safety.');
            endTimer({ result: 'blocked' });
            return;
        }

        // 4. Fire-and-Forget Analytics (Non-blocking)
        emitAnalyticsEvent({
            shortCode: code,
            ip,
            userAgent: req.headers['user-agent'] || null,
            referer: req.headers['referer'] || null,
            timestamp: Date.now()
        }).catch(() => { }); // Safety catch to ensure no crash

        // 5. High-speed Redirect
        res.redirect(longUrl);
        endTimer({ result: 'success' });

    } catch {
        redirectErrors.inc();
        res.status(500).send('Service Temporarily Unavailable');
        endTimer({ result: 'error' });
    }
});

export function registerRedirectRoutes(app: Express) {
    app.use(router);
}