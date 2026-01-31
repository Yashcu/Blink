import { redisCache } from '../infra/redis.cache';
import { RedirectRepository } from '../repositories/redirect.repository';
import { cacheHits, cacheMisses } from '../metrics/metrics';

export class RedirectService {
    private repo = new RedirectRepository();

    async resolve(code: string): Promise<string | null> {
        code = code.trim();
        const now = Date.now();

        // Negative caching check (Fail-Open)
        try {
            if (await redisCache.get(`miss:${code}`)) return null;
        }
        catch {
            // fail-open: cache is best-effort
        }


        // 1. Try custom alias cache (Fail-Open)
        let aliasCache: string | null = null;
        try {
            aliasCache = await redisCache.get(`alias:${code}`);
        } catch {
            // fail-open: cache is best-effort
        }

        if (aliasCache) {
            try {
                const parsed = JSON.parse(aliasCache) as {
                    longUrl: string;
                    expiresAt?: string | null;
                };
                if (parsed?.longUrl) {
                    // Check expiry
                    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= now) {
                        // Expired -> treat as miss
                    } else {
                        cacheHits.inc({ type: 'alias' });
                        return parsed.longUrl;
                    }
                }
            } catch {
                // corrupt/invalid JSON → treat as miss (silent)
            }
        }

        // 2. Try short code cache (Fail-Open)
        let shortCache: string | null = null;
        try {
            shortCache = await redisCache.get(`short:${code}`);
        } catch {
            // fail-open: cache is best-effort
        }

        if (shortCache) {
            try {
                const parsed = JSON.parse(shortCache) as {
                    longUrl: string;
                    expiresAt?: string | null;
                };
                if (parsed?.longUrl) {
                    // Check expiry
                    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= now) {
                        // Expired -> treat as miss
                    } else {
                        cacheHits.inc({ type: 'short' });
                        return parsed.longUrl;
                    }
                }
            } catch {
                // corrupt → miss
            }
        }

        // 3. DB fallback: custom alias
        const aliasRow = await this.repo.findByCustomAlias(code);
        if (aliasRow) {
            cacheMisses.inc({ type: 'alias' });
            await this.warmCache(`alias:${code}`, aliasRow);
            return aliasRow.long_url;
        }

        // 4. DB fallback: short code
        const shortRow = await this.repo.findByShortCode(code);
        if (shortRow) {
            cacheMisses.inc({ type: 'short' });
            await this.warmCache(`short:${code}`, shortRow);
            return shortRow.long_url;
        }

        // Negative caching (30s TTL)
        try {
            await redisCache.set(`miss:${code}`, '1', { ex: 300 });
        } catch {
            // fail-open: cache is best-effort
        }

        return null;
    }

    private async warmCache(key: string, row: { long_url: string; expiry_at: Date | null }) {
        const ttlSeconds = row.expiry_at
            ? Math.max(
                Math.floor((new Date(row.expiry_at).getTime() - Date.now()) / 1000),
                60, // minimum 1 minute to avoid near-zero TTL spam
            )
            : 86400; // 24h default

        // Safe set – never throws
        await redisCache.set(
            key,
            {
                longUrl: row.long_url,
                expiresAt: row.expiry_at?.toISOString() ?? null,
            },
            { ex: Math.min(ttlSeconds, 86400 * 7) }, // cap at 7 days
        );
    }
}
