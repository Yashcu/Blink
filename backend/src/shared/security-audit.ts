import { logger } from './logger';
import { Request } from 'express';

export enum SecurityEventType {
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    LOGIN_FAILURE = 'LOGIN_FAILURE',
    LOGOUT = 'LOGOUT',
    REGISTRATION = 'REGISTRATION',
    TOKEN_REFRESH = 'TOKEN_REFRESH',
    SESSION_HIJACK_ATTEMPT = 'SESSION_HIJACK_ATTEMPT',
    PASSWORD_CHANGE = 'PASSWORD_CHANGE',
    ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
    SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

interface SecurityEventBase {
    type: SecurityEventType;
    timestamp: Date;
    ip: string;
    userAgent: string | undefined;
}

interface SecurityEventWithUser extends SecurityEventBase {
    userId: string;
    email?: string;
}

interface SecurityEventWithoutUser extends SecurityEventBase {
    userId?: never;
    email?: string;
}

type SecurityEvent = SecurityEventWithUser | SecurityEventWithoutUser;

function getClientIp(req: Request): string {
    const rawIp = req.headers['x-forwarded-for'];
    if (typeof rawIp === 'string') {
        return rawIp.split(',')[0].trim();
    }
    if (Array.isArray(rawIp)) {
        return rawIp[0];
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
}

function getUserAgent(req: Request): string | undefined {
    return req.headers['user-agent'];
}

/**
 * Logs a security event with structured data for audit trails.
 * These logs should be monitored by a SIEM in production.
 */
export function logSecurityEvent(
    event: Omit<SecurityEvent, 'timestamp' | 'ip' | 'userAgent'>,
    req: Request
): void {
    const fullEvent: SecurityEvent = {
        ...event,
        timestamp: new Date(),
        ip: getClientIp(req),
        userAgent: getUserAgent(req),
    };

    // Log at different levels based on event type
    const isFailure = [
        SecurityEventType.LOGIN_FAILURE,
        SecurityEventType.SESSION_HIJACK_ATTEMPT,
        SecurityEventType.ACCOUNT_LOCKED,
        SecurityEventType.SUSPICIOUS_ACTIVITY,
    ].includes(event.type);

    const logData = {
        ...fullEvent,
        // Redact sensitive data
        userAgent: fullEvent.userAgent?.substring(0, 200),
    };

    if (isFailure) {
        logger.warn(logData, `Security Event: ${event.type}`);
    } else {
        logger.info(logData, `Security Event: ${event.type}`);
    }
}

/**
 * Convenience functions for common security events
 */
export const securityAudit = {
    loginSuccess: (userId: string, email: string, req: Request) =>
        logSecurityEvent({ type: SecurityEventType.LOGIN_SUCCESS, userId, email }, req),

    loginFailure: (email: string | undefined, req: Request, _reason?: string) =>
        logSecurityEvent(
            { type: SecurityEventType.LOGIN_FAILURE, userId: 'unknown', email },
            req
        ),

    logout: (userId: string, req: Request) =>
        logSecurityEvent({ type: SecurityEventType.LOGOUT, userId }, req),

    registration: (userId: string, email: string, req: Request) =>
        logSecurityEvent({ type: SecurityEventType.REGISTRATION, userId, email }, req),

    sessionHijackAttempt: (userId: string, req: Request) =>
        logSecurityEvent({ type: SecurityEventType.SESSION_HIJACK_ATTEMPT, userId }, req),

    suspiciousActivity: (req: Request, details: Record<string, unknown>, userId?: string) =>
        logSecurityEvent(
            { type: SecurityEventType.SUSPICIOUS_ACTIVITY, userId: userId || 'unknown', ...details },
            req
        ),
};