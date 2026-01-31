import { env } from './env';

if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
}
if (!env.NODE_ENV) {
    throw new Error('NODE_ENV is required');
}

export const authConfig = {
    jwtSecret: env.JWT_SECRET,
    jwtExpiresInSeconds: Number(env.JWT_EXPIRES_IN_SECONDS ?? 900), // 15 min

    sessionExpiresInSeconds: Number(
        env.SESSION_EXPIRES_IN_SECONDS ?? 60 * 60 * 24 * 7, // 7 days
    ),

    cookie: {
        name: 'auth',
        secure: env.NODE_ENV === 'production',
        sameSite: env.NODE_ENV === 'production' ? ('strict' as const) : ('lax' as const),
        httpOnly: true,
        path: '/',
        maxAge: Number(env.SESSION_EXPIRES_IN_SECONDS ?? 604800) * 1000, // ms
        partitioned: env.NODE_ENV === 'production',
        domain: env.COOKIE_DOMAIN,
    },
};

// Helper to get cookie options (reusable)
export function getCookieOptions(overrides: Partial<typeof authConfig.cookie> = {}) {
    return {
        ...authConfig.cookie,
        ...overrides,
    };
}
