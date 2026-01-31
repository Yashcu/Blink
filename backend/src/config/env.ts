import dotenv from 'dotenv';
import { cleanEnv, str, num, url, makeValidator } from 'envalid';

dotenv.config();

const strMinLength = (minLength: number) =>
    makeValidator((x) => {
        if (!x || x.length < minLength) {
            throw new Error(`Expected string length >= ${minLength}`);
        }
        return x;
    });

export const env = cleanEnv(process.env, {
    NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
    PORT: num({ default: 3000 }),

    // Infrastructure
    DATABASE_URL: url(),
    DB_CA_PEM: str({ default: undefined }),
    REDIS_URL: url(),

    // Security
    // Enforce 16 char minimum, even in dev, to build good habits
    JWT_SECRET: strMinLength(16)(),
    JWT_EXPIRES_IN_SECONDS: num({ default: 3600 }),
    SESSION_EXPIRES_IN_SECONDS: num({ default: 86400 }),

    // CORS & Cookies
    COOKIE_DOMAIN: str({ default: undefined }),
    CORS_ORIGIN: str({ default: 'http://localhost:5173' }),

    // Extra
    IP_HASH_SALT: str({ default: 'changeme-in-production' }),
});

// --- Production Guardrails ---
if (env.isProduction) {
    if (env.REDIS_URL.includes('127.0.0.1') || env.REDIS_URL.includes('localhost')) {
        throw new Error(
            '❌ [FATAL] Production environment detected with local Redis URL. ' +
            'This effectively disables analytics persistence. Set a real REDIS_URL.'
        );
    }
}