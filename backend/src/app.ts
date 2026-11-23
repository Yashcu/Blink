import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import hpp from 'hpp';
import pinoHttp from 'pino-http';
import { registerRoutes } from './routes';
import { errorHandler } from './middleware/error.middleware';
import { env } from './config/env';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { logger } from './shared/logger';
import { verifyRequestSource } from './middleware/security.middleware';
import { rateLimiter } from './rate-limit/rate-limiter';

export function createApp() {
    const app = express();

    app.use(requestIdMiddleware);
    app.use(pinoHttp({
        logger,
        genReqId: (req) => req.headers['x-request-id'] as string,
        // Don't log request/response bodies in production
        quietReqLogger: env.isProduction,
        // Custom log level for successful responses
        customLogLevel: (_req, res, err) => {
            if (res.statusCode >= 500 || err) return 'error';
            if (res.statusCode >= 400) return 'warn';
            return env.isProduction ? 'info' : 'debug';
        },
        // Redact sensitive headers
        redact: {
            paths: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-session-fingerprint"]'],
            remove: true,
        },
    }));

    app.set('trust proxy', 1);
    const cspDirectives: Record<string, string[]> = {
        defaultSrc: ['\'none\''],
        scriptSrc: ['\'self\''],
        styleSrc: ['\'self\''],
        imgSrc: ['\'self\'', 'data:'],
        fontSrc: ['\'self\''],
        connectSrc: ['\'self\''],
        frameAncestors: ['\'none\''],
        formAction: ['\'self\''],
        baseUri: ['\'self\''],
        objectSrc: ['\'none\''],
    };

    if (env.isProduction) {
        cspDirectives.upgradeInsecureRequests = [];
    }

    app.use(helmet({
        // Prevent clickjacking
        frameguard: { action: 'deny' },
        // Control referrer information
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        // Strict Content Security Policy
        contentSecurityPolicy: {
            directives: cspDirectives,
        },
        // HSTS - only in production
        hsts: env.isProduction ? {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
        } : false,
        // Disable X-Powered-By header
        hidePoweredBy: true,
        // X-Content-Type-Options
        noSniff: true,
        // X-DNS-Prefetch-Control
        dnsPrefetchControl: { allow: false },
        // X-Download-Options (IE)
        ieNoOpen: true,
        // X-Permitted-Cross-Domain-Policies
        permittedCrossDomainPolicies: { permittedPolicies: 'none' },
        // Cross-Origin-Embedder-Policy
        crossOriginEmbedderPolicy: env.isProduction ? { policy: 'require-corp' } : false,
        // Cross-Origin-Opener-Policy
        crossOriginOpenerPolicy: { policy: 'same-origin' },
        // Cross-Origin-Resource-Policy
        crossOriginResourcePolicy: { policy: 'same-origin' },
    }));
    app.use(compression());
    app.use(hpp());
    const allowedOrigins = (env.CORS_ORIGIN || '')
        .split(',')
        .map((o) => o.trim().replace(/\/$/, ''))
        .filter(Boolean);

    // In production, never allow wildcard or dynamic origins
    if (env.isProduction && (allowedOrigins.includes('*') || allowedOrigins.length === 0)) {
        throw new Error('❌ [FATAL] CORS_ORIGIN must be explicitly configured in production. Wildcard (*) is not allowed.');
    }

    app.use(cors({
        origin: (origin, callback) => {
            // Allow non-browser requests (no origin header) like mobile apps, curl, etc.
            if (!origin) return callback(null, true);

            const normalized = origin.replace(/\/$/, '');

            // Check against explicitly allowed origins
            if (allowedOrigins.includes(normalized)) {
                return callback(null, true);
            }

            // In development, allow localhost variations and Vercel preview deployments
            if (!env.isProduction) {
                const isLocalhost = normalized.startsWith('http://localhost:') ||
                    normalized.startsWith('http://127.0.0.1:') ||
                    normalized.startsWith('http://[::1]:');
                const isVercelPreview = normalized.endsWith('.vercel.app');

                if (isLocalhost || isVercelPreview) {
                    return callback(null, true);
                }
            }

            // Log rejected CORS attempts for security monitoring
            console.warn(`[CORS] Rejected origin: ${origin}`);
            callback(new Error(`Origin ${origin} not allowed by CORS`));
        },
        credentials: true,
        // Only expose necessary headers
        exposedHeaders: ['x-request-id', 'retry-after'],
        // Cache preflight for 24 hours
        maxAge: 86400,
    }));
    app.use(express.json({ limit: '10kb' }));
    app.use(express.urlencoded({ extended: true, limit: '10kb' }));
    app.use(cookieParser());
    app.use(verifyRequestSource);

    app.use(async (req, res, next) => {
        // Global limit: 100 requests per minute per IP
        const result = await rateLimiter(req.ip || 'unknown', 100, 60);
        if (!result.success) {
            return res.status(429).json({ error: 'Global rate limit exceeded. Slow down.' });
        }
        next();
    });

    registerRoutes(app);

    app.use(errorHandler);

    return app;
}