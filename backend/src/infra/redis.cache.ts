import { redisClient } from './redis.client';

type CacheValue = string | number | object | Buffer;

export const redisCache = {
    async get(key: string): Promise<string | null> {
        try {
            return await redisClient.get(key);
        } catch {
            return null;
        }
    },

    async set(
        key: string,
        value: CacheValue,
        options: { ex?: number; nx?: boolean } = {},
    ): Promise<void> {
        try {
            let valueStr: string;
            if (typeof value === 'object' && value !== null) {
                valueStr = JSON.stringify(value);
            } else {
                valueStr = String(value);
            }

            if (options.ex !== undefined && options.nx === true) {
                // SET key value EX seconds NX
                await redisClient.set(key, valueStr, 'EX', options.ex, 'NX');
            } else if (options.ex !== undefined) {
                // SET key value EX seconds
                await redisClient.set(key, valueStr, 'EX', options.ex);
            } else if (options.nx === true) {
                // SET key value NX
                await redisClient.set(key, valueStr, 'NX');
            } else {
                // plain SET key value
                await redisClient.set(key, valueStr);
            }
        } catch {
            // silent best-effort
        }
    },

    async del(key: string | string[]): Promise<void> {
        try {
            if (Array.isArray(key)) {
                if (key.length === 0) return;
                await redisClient.del(...key);
            } else {
                await redisClient.del(key);
            }
        } catch {
            // silent
        }
    },

    async exists(key: string): Promise<boolean> {
        try {
            return (await redisClient.exists(key)) === 1;
        } catch {
            return false;
        }
    },
};
