import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: env.NODE_ENV !== 'production' ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
    } : undefined,
    // Sensitive fields to mask in logs
    redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'token', 'user.password_hash'],
        remove: true
    }
});