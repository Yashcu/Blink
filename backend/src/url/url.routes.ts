import { Express, Response, NextFunction } from 'express';
import { UrlService } from './url.service';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { checkRateLimit } from '../rate-limit/rate-limiter';
import { createUrlSchema, updateUrlSchema } from './url.validation';

const service = new UrlService();

export function registerUrlRoutes(app: Express) {
    app.post(
        '/api/urls',
        requireAuth,
        validateBody(createUrlSchema),
        async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
            try {
                const { longUrl, customAlias } = req.body;

                const userId = req.user!.userId;

                let allowed;
                try {
                    allowed = await checkRateLimit(`ratelimit:create:${userId}`, 10, 60);
                } catch {
                    allowed = true;
                }

                if (!allowed) {
                    return res.status(429).json({ error: 'Rate limit exceeded' });
                }

                const result = await service.createUrl({
                    longUrl,
                    userId,
                    customAlias,
                });

                res.status(201).json(result);
            } catch (err) {
                next(err);
            }
        },
    );

    app.get(
        '/api/urls',
        requireAuth,
        async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
            try {
                const userId = req.user!.userId;
                const urls = await service.getUserUrls(userId);
                res.json(urls);
            } catch (err) {
                next(err);
            }
        },
    );

    app.get(
        '/api/urls/:code',
        requireAuth,
        async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
            try {
                const userId = req.user!.userId;
                const code = req.params.code as string;

                const url = await service.getUrlByCode(code, userId);

                if (!url) {
                    return res.status(404).json({ error: 'Not found' });
                }

                res.json(url);
            } catch (err) {
                next(err);
            }
        },
    );

    app.patch(
        '/api/urls/:code',
        requireAuth,
        validateBody(updateUrlSchema),
        async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
            try {
                const userId = req.user!.userId;
                const code = req.params.code as string;

                const { longUrl, expiresAt } = req.body as {
                    longUrl?: string;
                    expiresAt?: string | null;
                };

                // Reject alias changes explicitly
                if ('customAlias' in req.body) {
                    return res.status(400).json({ error: 'customAlias cannot be changed' });
                }

                const parsedExpiry =
                    expiresAt === undefined
                        ? undefined
                        : expiresAt === null
                          ? null
                          : new Date(expiresAt);

                if (parsedExpiry && parsedExpiry instanceof Date) {
                    if (isNaN(parsedExpiry.getTime())) {
                        return res.status(400).json({ error: 'Invalid expiresAt' });
                    }
                    if (parsedExpiry <= new Date()) {
                        return res
                            .status(400)
                            .json({ error: 'Expiration date must be in the future' });
                    }
                }

                const updated = await service.updateUrl(code, userId, {
                    longUrl,
                    expiresAt: parsedExpiry,
                });

                if (!updated) {
                    return res.status(404).json({ error: 'Not found' });
                }

                res.json(updated);
            } catch (err) {
                next(err);
            }
        },
    );

    app.delete(
        '/api/urls/:code',
        requireAuth,
        async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
            try {
                const userId = req.user!.userId;

                const rawCode = req.params.code;
                const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;

                const deleted = await service.deleteUrl(code, userId);

                if (!deleted) {
                    return res.status(404).json({ error: 'Not found' });
                }

                res.status(204).send();
            } catch (err) {
                next(err);
            }
        },
    );
}
