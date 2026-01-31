import dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`❌ [CONFIG] Missing required env var: ${key}`);
    }
    return value;
}

export const env = {
    PORT: Number(process.env.PORT || 3000),
    NODE_ENV: process.env.NODE_ENV || 'development',

    // Database & Redis
    DATABASE_URL: required('DATABASE_URL'),
    REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',

    // Security
    JWT_SECRET: required('JWT_SECRET'),
    JWT_EXPIRES_IN_SECONDS: Number(process.env.JWT_EXPIRES_IN_SECONDS || 3600),
    SESSION_EXPIRES_IN_SECONDS: Number(process.env.SESSION_EXPIRES_IN_SECONDS || 86400),

    // CORS & Cookies
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

// --- Production Guardrails ---
if (env.NODE_ENV === 'production') {
    // 1. Prevent local Redis in production (Prevents silent analytics loss)
    if (env.REDIS_URL.includes('127.0.0.1') || env.REDIS_URL.includes('localhost')) {
        throw new Error(
            '❌ [FATAL] Production environment detected with local Redis URL. ' +
            'This effectively disables analytics persistence. Set a real REDIS_URL.'
        );
    }

    // 2. Prevent weak secrets
    if (env.JWT_SECRET.length < 16) {
        throw new Error('❌ [FATAL] JWT_SECRET is too short for production. Must be at least 16 characters.');
    }
}
