import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { registerRoutes } from './routes';
import { errorHandler } from './middleware/error.middleware';
import { env } from './config/env';

export function createApp() {
    const app = express();

    app.use(
        cors({
            origin: (origin, callback) => {
                if (!origin) return callback(null, true);
                const allowed = [env.CORS_ORIGIN];
                if (allowed.includes(origin)) {
                    return callback(null, true);
                }
                callback(new Error('Not allowed by CORS'));
            },
            credentials: true,
        }),
    );

    app.use(express.json());
    app.use(cookieParser());
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", env.CORS_ORIGIN],
                },
            },
        })
    );

    registerRoutes(app);

    app.use(errorHandler);

    return app;
}
