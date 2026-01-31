import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export const redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    reconnectOnError(err) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
            return true;
        }
        return false;
    },
});

// -- Event Handlers for Observability --

redisClient.on('connect', () => {
    console.log('✅ [REDIS] Connection established');
});

redisClient.on('ready', () => {
    console.log('🚀 [REDIS] Client ready');
});

redisClient.on('error', (err) => {
    // Filter out common "noise" errors during reconnection attempts
    if (
        err.message.includes('ECONNREFUSED') ||
        err.message.includes('ECONNRESET')
    ) {
        return;
    }
    console.error('❌ [REDIS] Error:', err.message);
});

// Initialize connection (fail-safe)
redisClient.connect().catch((err) => {
    console.warn('⚠️ [REDIS] Failed to connect at startup (will retry):', err.message);
});
