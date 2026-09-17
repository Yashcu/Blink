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
        genReqId: (req) => req.headers['x-request-id'] as string
    }));

    app.set('trust proxy', 1);
    app.use(helmet({
        frameguard: { action: 'deny' },
        referrerPolicy: { policy: 'same-origin' },
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ['\'self\''],
                scriptSrc: ['\'self\''],
                styleSrc: ['\'self\''],
                imgSrc: ['\'self\''],
                fontSrc: ['\'self\''],
                connectSrc: ['\'self\''],
            },
        },
    }));
    app.use(compression());
    app.use(hpp());
    const allowedOrigins = (env.CORS_ORIGIN || '')
        .split(',')
        .map((o) => o.trim().replace(/\/$/, ''))
        .filter(Boolean);

    app.use(cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            const normalized = origin.replace(/\/$/, '');
            if (allowedOrigins.includes(normalized) || allowedOrigins.includes('*')) {
                return callback(null, true);
            }
            if (!env.isProduction || normalized.endsWith('.vercel.app')) {
                return callback(null, true);
            }
            callback(new Error(`Origin ${origin} not allowed by CORS`));
        },
        credentials: true,
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