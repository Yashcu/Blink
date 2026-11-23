import { v7 as uuidv7 } from 'uuid';
import { UrlRepository } from '../repositories/url.repository';
import { validateUrl } from '../shared/url.validator';
import { generateShortCode } from '../shared/short-code';
import { redisCache } from '../infra/redis.cache';
import { eventBus, EVENTS } from '../shared/event-bus';

interface UrlResponse {
    shortCode: string;
    longUrl: string;
    customAlias: string | null;
    createdAt?: Date;
    expiresAt?: Date | null;
}

interface CreateUrlParams {
    longUrl: string;
    userId: string;
    customAlias?: string;
}

interface UpdateUrlParams {
    longUrl?: string;
    expiresAt?: Date | null;
}

/**
 * URL service handling shorten, redirect, and management operations.
 * Uses cache-aside pattern for reads, event-driven cache invalidation for writes.
 */
export class UrlService {
    private repo = new UrlRepository();
    private readonly CACHE_TTL_SECONDS = 86400; // 24 hours
    private readonly MAX_CODE_RETRIES = 3;

    // --- READ PATH (Cache-Aside for performance) ---

    /**
     * Resolves a short code to its long URL.
     * Checks Redis cache first, falls back to database, warms cache on miss.
     *
     * @param code - Short code or custom alias
     * @returns Long URL string or null if not found/expired
     */
    async resolve(code: string): Promise<string | null> {
        // 1. Check Cache
        const cached = await redisCache.get(`short:${code}`);
        if (cached) {
            try {
                const data = JSON.parse(cached);
                return data.longUrl;
            } catch {
                // Ignore parse errors, fall through to DB
            }
        }

        // 2. Check DB
        const url = await this.repo.findByShortCode(code);
        if (!url) return null;

        // 3. Warm Cache (Self-healing read)
        await redisCache.set(`short:${code}`, { longUrl: url.longUrl }, { ex: this.CACHE_TTL_SECONDS });

        return url.longUrl;
    }

    /**
     * Gets URL details by code with ownership verification.
     *
     * @param code - Short code or custom alias
     * @param userId - Owner's user ID
     * @returns URL details or null if not found/unauthorized
     */
    async getUrlByCode(code: string, userId: string): Promise<UrlResponse | null> {
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

    /**
     * Gets all URLs owned by a user.
     *
     * @param userId - Owner's user ID
     * @returns Array of user's URLs
     */
    async getUserUrls(userId: string): Promise<UrlResponse[]> {
        return this.repo.getUrlsByUserId(userId);
    }

    // --- WRITE PATHS (Decoupled Side Effects via Event Bus) ---

    /**
     * Creates a new short URL.
     * Generates unique code, stores in DB, emits event for cache warming.
     *
     * @param params - URL creation parameters
     * @returns Created URL details
     * @throws Error if unique code generation fails after retries
     */
    async createUrl(params: CreateUrlParams): Promise<UrlResponse> {
        const url = validateUrl(params.longUrl);
        let shortCode = params.customAlias || this.generateCode();
        let retries = 0;

        while (retries < this.MAX_CODE_RETRIES) {
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
                const pgError = err as { code?: string };
                if (pgError.code === '23505' && !params.customAlias) {
                    shortCode = this.generateCode();
                    retries++;
                    continue;
                }
                throw err;
            }
        }

        if (retries >= this.MAX_CODE_RETRIES) throw new Error('Failed to generate unique code');

        // Emit event for background cache warming
        eventBus.emit(EVENTS.URL.CREATED, {
            shortCode,
            longUrl: url.toString(),
            customAlias: params.customAlias,
        });

        return {
            shortCode,
            longUrl: url.toString(),
            customAlias: params.customAlias ?? null,
            createdAt: new Date(),
        };
    }

    /**
     * Updates an existing URL (longUrl and/or expiresAt).
     * Verifies ownership and non-expiration before updating.
     *
     * @param code - Short code or custom alias
     * @param userId - Owner's user ID
     * @param params - Fields to update
     * @returns Updated URL details or null if not found
     * @throws Error if URL is expired
     */
    async updateUrl(code: string, userId: string, params: UpdateUrlParams): Promise<UrlResponse | null> {
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

        // Emit event for background cache invalidation
        eventBus.emit(EVENTS.URL.UPDATED, {
            shortCode: url.shortCode,
            customAlias: url.customAlias,
        });

        return {
            shortCode: url.shortCode,
            longUrl: nextLongUrl ?? url.longUrl,
            customAlias: url.customAlias,
            expiresAt: params.expiresAt ?? url.expiresAt ?? null,
        };
    }

    /**
     * Deletes a URL by code with ownership verification.
     * Emits event for cache invalidation.
     *
     * @param code - Short code or custom alias
     * @param userId - Owner's user ID
     * @returns true if deleted, false if not found
     */
    async deleteUrl(code: string, userId: string): Promise<boolean> {
        const url = await this.repo.findOwnedByCode(code, userId);
        if (!url) return false;

        await this.repo.deleteById(url.id);

        // Emit event for background cache invalidation
        eventBus.emit(EVENTS.URL.DELETED, {
            shortCode: url.shortCode,
            customAlias: url.customAlias,
        });

        return true;
    }

    private generateCode(): string {
        return generateShortCode(7).trim();
    }
}
