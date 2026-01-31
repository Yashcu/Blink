import { v4 as uuidv4 } from 'uuid';
import { UrlRepository } from '../repositories/url.repository';
import { validateUrl } from '../shared/url.validator';
import { generateShortCode } from '../shared/short-code';
import { redisCache } from '../infra/redis.cache';

export class UrlService {
    private repo = new UrlRepository();

    async createUrl(params: { longUrl: string; userId: string; customAlias?: string }) {
        const url = validateUrl(params.longUrl);

        let shortCode = params.customAlias || this.generateCode();
        let retries = 0;

        while (retries < 3) {
            const id = uuidv4();
            try {
                await this.repo.insertUrl({
                    id,
                    shortCode,
                    longUrl: url.toString(),
                    userId: params.userId,
                    customAlias: params.customAlias ?? undefined,
                });
                break;
            } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                // Check for unique constraint violation (code collision)
                // Postgres error 23505 is unique_violation
                if (err.code === '23505' && !params.customAlias) {
                    shortCode = this.generateCode();
                    retries++;
                    continue;
                }
                throw err;
            }
        }

        if (retries >= 3) {
            throw new Error('Failed to generate unique code');
        }

        // 🔥 CACHE WARMING (WRITE‑TIME ONLY)
        try {
            await redisCache.set(`short:${shortCode}`, { longUrl: url.toString() }, { ex: 86400 });

            if (params.customAlias) {
                await redisCache.set(`alias:${params.customAlias}`, { shortCode }, { ex: 86400 });
            }
        } catch {
            // intentionally ignored
        }

        return {
            shortCode,
            customAlias: params.customAlias ?? null,
            createdAt: new Date(),
        };
    }

    private generateCode(): string {
        return generateShortCode(7).trim();
    }

    async getUserUrls(userId: string) {
        return this.repo.getUrlsByUserId(userId);
    }

    async getUrlByCode(code: string, userId: string) {
        const url = await this.repo.findOwnedByCode(code, userId);

        if (!url) {
            return null;
        }

        return {
            shortCode: url.shortCode,
            longUrl: url.longUrl,
            customAlias: url.customAlias,
            createdAt: url.createdAt,
            expiresAt: url.expiresAt,
        };
    }

    async updateUrl(
        code: string,
        userId: string,
        params: {
            longUrl?: string;
            expiresAt?: Date | null;
        },
    ) {
        const url = await this.repo.findOwnedByCode(code, userId);
        if (!url) return null;

        if (url.expiresAt && url.expiresAt <= new Date()) {
            throw new Error('Cannot update expired URL');
        }

        let nextLongUrl: string | undefined;
        if (params.longUrl !== undefined) {
            const validated = validateUrl(params.longUrl);
            nextLongUrl = validated.toString();
        }

        await this.repo.updateUrlById(url.id, {
            longUrl: nextLongUrl,
            expiresAt: params.expiresAt !== undefined ? params.expiresAt : (url.expiresAt ?? null),
        });

        try {
            await redisCache.del(`short:${url.shortCode}`);
            if (url.customAlias) {
                await redisCache.del(`alias:${url.customAlias}`);
            }
        } catch {
            // intentionally ignored
        }

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

        // Delete DB record
        await this.repo.deleteById(url.id);

        // Invalidate cache (both possible keys)
        try {
            await redisCache.del(`short:${url.shortCode}`);
            if (url.customAlias) {
                await redisCache.del(`alias:${url.customAlias}`);
            }
        } catch {
            // intentionally ignored
        }

        return true;
    }
}
