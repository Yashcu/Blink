import { Router, Request, Response } from 'express';
import { UrlService } from '../url/url.service';
import { emitAnalyticsEvent } from '../analytics/analytics.producer';
import { rateLimiter } from '../rate-limit/rate-limiter';
import { redirectLatency, redirectErrors, maliciousUrlAttempts } from '../metrics/metrics';
import { isUrlBlacklisted } from '../shared/blacklist';

const router = Router();
const urlService = new UrlService();

router.get('/:code', async (req: Request, res: Response): Promise<void> => {
    const endTimer = redirectLatency.startTimer();

    const code = req.params.code as string;
    const rawIp = req.headers['x-forwarded-for'];
    const ip = Array.isArray(rawIp) ? rawIp[0] : (rawIp || req.socket.remoteAddress || 'unknown');
    const userAgent = req.headers['user-agent'] || 'unknown';

    const rawReferer = req.headers['referer'];
    const referer = Array.isArray(rawReferer) ? rawReferer[0] : (rawReferer || null);

    try {
        // 1. Transparent Rate Limiting
        // Limit: 100 requests per 10 minutes (600s)
        const limitCheck = await rateLimiter.check(ip, 100, 600);

        if (!limitCheck.success) {
            res.set('Retry-After', String(limitCheck.retryAfter));
            res.status(429).send(`Too Many Requests. Please try again in ${limitCheck.retryAfter} seconds.`);
            endTimer({ result: 'rate_limited' });
            return;
        }

        // 2. Validate Short Code Format
        if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
            res.status(400).send('Invalid Code Format');
            endTimer({ result: 'bad_request' });
            return;
        }

        // 3. Lookup URL (Cache -> DB)
        const longUrl = await urlService.resolve(code);

        if (!longUrl) {
            res.status(404).sendFile('404.html', { root: 'public' }); // Assuming you have a 404 page, or just send text
            endTimer({ result: 'not_found' });
            return;
        }

        // 4. Security Check (Blacklist)
        if (await isUrlBlacklisted(longUrl)) {
            maliciousUrlAttempts.inc();
            res.status(403).send('Link blocked for safety.');
            endTimer({ result: 'blocked' });
            return;
        }

        emitAnalyticsEvent({ shortCode: code, ip, userAgent, referer, timestamp: Date.now() })
            .catch(err => console.error('Analytics Error:', err));

        // 6. Perform Redirect
        res.redirect(longUrl);
        endTimer({ result: 'success' });

    } catch (error) {
        console.error('Redirect Error:', error);
        redirectErrors.inc();
        res.status(500).send('Internal Server Error');
        endTimer({ result: 'error' });
    }
});

export { router as redirectRouter };
