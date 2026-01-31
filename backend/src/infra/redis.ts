import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let client: Redis | null = null;

try {
    const r = new Redis(redisUrl, {
        connectTimeout: 50,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
    });

    r.on('error', () => {
        console.warn('[REDIS] connection error – cache disabled');
    });

    r.connect()
        .then(() => {
            console.log('[REDIS] connected');
            client = r;
        })
        .catch(() => {
            console.warn('[REDIS] unavailable at startup – running without cache');
            client = null;
        });
} catch {
    client = null;
}

export const redis = {
    async get(key: string) {
        if (!client) return null;
        try {
            return await client.get(key);
        } catch {
            return null;
        }
    },

    async set(...args: any[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!client) return;
        try {
            await (client as any).set(...args); // eslint-disable-line @typescript-eslint/no-explicit-any
        } catch {
            // intentionally ignored
        }
    },

    async del(key: string) {
        if (!client) return;
        try {
            await client.del(key);
        } catch {
            // intentionally ignored
        }
    },
};
