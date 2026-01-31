import { Express, Request, Response } from 'express';
import { RedirectService } from './redirect.service';
import { checkRateLimit } from '../rate-limit/rate-limiter';
import { emitAnalyticsEvent } from '../analytics/analytics.producer';
import { redirectLatency, redirectErrors } from '../metrics/metrics';

const service = new RedirectService();

export function registerRedirectRoutes(app: Express) {
    app.get('/api/:code', async (req: Request, res: Response) => {
        const end = redirectLatency.startTimer();
        const code = ((req.params.code as string) || '').trim();
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';

        if (code.length > 32) {
            return res.status(404).send('Not found');
        }

        try {
            // Rate limiting (FAIL‑OPEN)
            try {
                const allowed = await checkRateLimit(`ratelimit:redirect:${ip}`, 1000, 60);

                if (!allowed) {
                    end({ result: 'rate_limited' });
                    return res.status(429).send('Too many requests');
                }
            } catch {
                // fail‑open
            }

            const longUrl = await service.resolve(code);

            if (!longUrl) {
                end({ result: 'not_found' });
                return res.status(404).send('Not found');
            }

            end({ result: 'success' });

            // Fire‑and‑forget analytics (FAIL‑OPEN)
            try {
                void emitAnalyticsEvent({
                    shortCode: code,
                    timestamp: Date.now(),
                    ip,
                    userAgent: req.headers['user-agent'] || null,
                    referer: req.headers['referer'] || null,
                });
            } catch {
                // never block redirect
            }

            return res.redirect(302, longUrl);
        } catch {
            redirectErrors.inc();
            end({ result: 'error' });
            return res.status(500).send('Internal error');
        }
    });
}
