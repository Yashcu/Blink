import { redisClient } from './redis.client';
import { isRedisCircuitOpen, recordRedisFailure, recordRedisSuccess } from '../shared/circuit-breaker';

type CacheValue = string | number | object | Buffer;

export const redisCache = {
    async get(key: string): Promise<string | null> {
        if(isRedisCircuitOpen()) return null;

        try {
            const result = await redisClient.get(key);
            recordRedisSuccess();
            return result;
        } catch {
            recordRedisFailure();
            return null;
        }
    },

    async set(
        key: string,
        value: CacheValue,
        options: { ex?: number; nx?: boolean } = {},
    ): Promise<void> {
        if(isRedisCircuitOpen()) return;

        try {
            let valueStr: string;
            if (typeof value === 'object' && value !== null) {
                valueStr = JSON.stringify(value);
            } else {
                valueStr = String(value);
            }

            if (options.ex !== undefined && options.nx === true) {
                await redisClient.set(key, valueStr, 'EX', options.ex, 'NX');
            } else if (options.ex !== undefined) {
                await redisClient.set(key, valueStr, 'EX', options.ex);
            } else if (options.nx === true) {
                await redisClient.set(key, valueStr, 'NX');
            } else {
                await redisClient.set(key, valueStr);
            }
            recordRedisSuccess();
        } catch (error) {
            recordRedisFailure();
        }
    },

    async del(key: string | string[]): Promise<void> {
        if (isRedisCircuitOpen()) return;

        try {
            if (Array.isArray(key)) {
                if (key.length === 0) return;
                await redisClient.del(...key);
            } else {
                await redisClient.del(key);
            }
            recordRedisSuccess();
        } catch (error) {
            recordRedisFailure();
        }
    },

    async exists(key: string): Promise<boolean> {
        if (isRedisCircuitOpen()) return false;

        try {
            const result = await redisClient.exists(key);
            recordRedisSuccess();
            return result === 1;
        } catch (error) {
            recordRedisFailure();
            return false;
        }
    },
};
