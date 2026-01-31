import { v7 as uuidv7 } from 'uuid';
import { UrlRepository } from '../repositories/url.repository';
import { validateUrl } from '../shared/url.validator';
import { generateShortCode } from '../shared/short-code';
import { redisCache } from '../infra/redis.cache';
import { eventBus, EVENTS } from '../shared/event-bus'; // 👈 Import EventBus

export class UrlService {
    private repo = new UrlRepository();

    // --- READ PATH (Keeps Cache-Aside for performance) ---
    async resolve(code: string): Promise<string | null> {
        // 1. Check Cache
        const cached = await redisCache.get(`short:${code}`);
        if (cached) {
            try {
                const data = JSON.parse(cached);
                return data.longUrl;
            } catch { /* ignore */ }
        }

        // 2. Check DB
        const url = await this.repo.findByShortCode(code);
        if (!url) return null;

        // 3. Warm Cache (Self-healing read)
        await redisCache.set(`short:${code}`, { longUrl: url.longUrl }, { ex: 86400 });

        return url.longUrl;
    }

    async getUrlByCode(code: string, userId: string) {
        const url = await this.repo.findOwnedByCode(code, userId);
        if (!url) return null;
        return {
            shortCode: url.shortCode,
            longUrl: url.longUrl,
            customAlias: url.customAlias,
            createdAt: url.createdAt,
            expiresAt: url.expiresAt,
        };
    }

    async getUserUrls(userId: string) {
        return this.repo.getUrlsByUserId(userId);
    }

    // --- WRITE PATHS (Decoupled Side Effects) ---

    async createUrl(params: { longUrl: string; userId: string; customAlias?: string }) {
        const url = validateUrl(params.longUrl);
        let shortCode = params.customAlias || this.generateCode();
        let retries = 0;

        while (retries < 3) {
            const id = uuidv7();
            try {
                await this.repo.insertUrl({
                    id,
                    shortCode,
                    longUrl: url.toString(),
                    userId: params.userId,
                    customAlias: params.customAlias ?? undefined,
                });
                break;
            } catch (err) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if ((err as any).code === '23505' && !params.customAlias) {
                    shortCode = this.generateCode();
                    retries++;
                    continue;
                }
                throw err;
            }
        }

        if (retries >= 3) throw new Error('Failed to generate unique code');

        // 🚀 EMIT EVENT: Cache warming happens in the background now
        eventBus.emit(EVENTS.URL.CREATED, {
            shortCode,
            longUrl: url.toString(),
            customAlias: params.customAlias
        });

        return {
            shortCode,
            customAlias: params.customAlias ?? null,
            createdAt: new Date(),
        };
    }

    async updateUrl(code: string, userId: string, params: { longUrl?: string; expiresAt?: Date | null }) {
        const url = await this.repo.findOwnedByCode(code, userId);
        if (!url) return null;

        if (url.expiresAt && url.expiresAt <= new Date()) throw new Error('Cannot update expired URL');

        let nextLongUrl: string | undefined;
        if (params.longUrl !== undefined) {
            nextLongUrl = validateUrl(params.longUrl).toString();
        }

        await this.repo.updateUrlById(url.id, {
            longUrl: nextLongUrl,
            expiresAt: params.expiresAt !== undefined ? params.expiresAt : (url.expiresAt ?? null),
        });

        // 🚀 EMIT EVENT: Cache invalidation happens in background
        eventBus.emit(EVENTS.URL.UPDATED, {
            shortCode: url.shortCode,
            customAlias: url.customAlias
        });

        return {
            shortCode: url.shortCode,
            longUrl: nextLongUrl ?? url.longUrl,
            customAlias: url.customAlias,
            expiresAt: params.expiresAt ?? url.expiresAt ?? null,
        };
    }

    async deleteUrl(code: string, userId: string): Promise<boolean> {
        const url = await this.repo.findOwnedByCode(code, userId);
        if (!url) return false;

        await this.repo.deleteById(url.id);

        // 🚀 EMIT EVENT
        eventBus.emit(EVENTS.URL.DELETED, {
            shortCode: url.shortCode,
            customAlias: url.customAlias
        });

        return true;
    }

    private generateCode(): string {
        return generateShortCode(7).trim();
    }
}
