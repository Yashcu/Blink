import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const isProduction = process.env.NODE_ENV === 'production';

export const redisClient = new Redis(redisUrl, {
    lazyConnect: true,
    connectTimeout: 10000,
    enableOfflineQueue: false,
    maxRetriesPerRequest: null, // Required for BullMQ
    retryStrategy: (times) => {
        const delay = isProduction
            ? Math.min(times * 500, 5000) // Cap at 5s
            : Math.min(times * 100, 3000); // Cap at 3s
        return delay;
    },
});

redisClient.on('connect', () => console.log('✅ [REDIS] Connected'));
redisClient.on('ready', () => console.log('🚀 [REDIS] Ready'));
redisClient.on('close', () => console.debug('[REDIS] Connection closed'));
redisClient.on('reconnecting', () => console.debug('[REDIS] Reconnecting...'));

redisClient.on('error', (err) => {
    if (
        err.message.includes('Connection is closed') ||
        err.message.includes('read ECONNRESET') ||
        err.message.includes('Connection timed out') ||
        err.message.includes('connect ECONNREFUSED')
    ) {
        return;
    }
    console.error('[REDIS] Connection error:', err.message);
});

redisClient.connect().catch((err) => {
    console.error('[REDIS] Initial connection failed', err.message);
});
