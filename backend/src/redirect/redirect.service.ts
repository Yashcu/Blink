import { redisCache } from '../infra/redis.cache';
import { RedirectRepository } from '../repositories/redirect.repository';
import { cacheHits, cacheMisses } from '../metrics/metrics';

interface CachedUrl {
    longUrl: string;
    expiresAt: string | null;
}

interface DbUrlRow {
    long_url: string;
    expiry_at: Date | null;
}

const MISS_TTL_SECONDS = 300;
const DEFAULT_TTL_SECONDS = 86400;
const MAX_TTL_SECONDS = 86400 * 7;
const MIN_TTL_SECONDS = 60;

/**
 * Redirect service optimized for high-throughput URL resolution.
 * Multi-layer caching: alias cache → short code cache → database → negative cache.
 * All cache operations are fail-open (never block redirect on cache errors).
 */
export class RedirectService {
    private repo = new RedirectRepository();

    /**
     * Resolves a short code to its long URL.
     * Cache hierarchy: alias cache → short code cache → database → negative cache.
     *
     * @param code - Short code or custom alias (trimmed)
     * @returns Long URL string or null if not found/expired
     */
    async resolve(code: string): Promise<string | null> {
        code = code.trim();
        const now = Date.now();

        // Negative caching check (Fail-Open)
        try {
            if (await redisCache.get(`miss:${code}`)) return null;
        } catch {
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
                const parsed = JSON.parse(aliasCache) as CachedUrl;
                if (parsed?.longUrl && !this.isExpired(parsed.expiresAt, now)) {
                    cacheHits.inc({ type: 'alias' });
                    return parsed.longUrl;
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
                const parsed = JSON.parse(shortCache) as CachedUrl;
                if (parsed?.longUrl && !this.isExpired(parsed.expiresAt, now)) {
                    cacheHits.inc({ type: 'short' });
                    return parsed.longUrl;
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

        // Negative caching (5 min TTL)
        try {
            await redisCache.set(`miss:${code}`, '1', { ex: MISS_TTL_SECONDS });
        } catch {
            // fail-open: cache is best-effort
        }

        return null;
    }

    private isExpired(expiresAt: string | null, now: number): boolean {
        if (!expiresAt) return false;
        return new Date(expiresAt).getTime() <= now;
    }

    private async warmCache(key: string, row: DbUrlRow): Promise<void> {
        const ttlSeconds = row.expiry_at
            ? Math.max(
                Math.floor((new Date(row.expiry_at).getTime() - Date.now()) / 1000),
                MIN_TTL_SECONDS,
            )
            : DEFAULT_TTL_SECONDS;

        const cappedTtl = Math.min(ttlSeconds, MAX_TTL_SECONDS);

        // Safe set – never throws
        await redisCache.set(
            key,
            {
                longUrl: row.long_url,
                expiresAt: row.expiry_at?.toISOString() ?? null,
            },
            { ex: cappedTtl },
        );
    }
}
