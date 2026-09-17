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

const INSECURE_JWT_SECRETS = new Set([
    'super-secret-dev-key',
    'change-me-to-a-long-random-secret',
    'your_super_secret_key',
]);

const INSECURE_SALTS = new Set([
    'changeme-in-production',
    'change-me-to-a-random-salt',
    'salt',
]);

// --- Production Guardrails ---
if (env.isProduction) {
    if (env.REDIS_URL.includes('127.0.0.1') || env.REDIS_URL.includes('localhost')) {
        throw new Error(
            '❌ [FATAL] Production environment detected with local Redis URL. ' +
            'This effectively disables analytics persistence. Set a real REDIS_URL.'
        );
    }

    if (INSECURE_JWT_SECRETS.has(env.JWT_SECRET)) {
        throw new Error(
            '❌ [FATAL] JWT_SECRET is a known placeholder. Generate a strong random secret for production.'
        );
    }

    if (INSECURE_SALTS.has(env.IP_HASH_SALT)) {
        throw new Error(
            '❌ [FATAL] IP_HASH_SALT is a placeholder. Set a unique random salt for production.'
        );
    }

    if (env.DATABASE_URL.includes('localhost') || env.DATABASE_URL.includes('127.0.0.1')) {
        throw new Error(
            '❌ [FATAL] Production environment detected with local DATABASE_URL. Set a managed PostgreSQL URL.'
        );
    }
}