// config/env.ts
function required(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required env var: ${name}`);
    }
    return value;
}

export const env = {
    PORT: Number(process.env.PORT ?? required('PORT')),
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    JWT_SECRET: required('JWT_SECRET'),
    JWT_EXPIRES_IN_SECONDS: Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 3600),
    SESSION_EXPIRES_IN_SECONDS: Number(process.env.SESSION_EXPIRES_IN_SECONDS ?? 86400),
    REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || undefined,
};

if (env.NODE_ENV === 'production' && env.REDIS_URL.includes('127.0.0.1')) {
    console.warn('⚠️ Using local Redis in production environment – this is not recommended');
}
