import { Request } from 'express';

const FINGERPRINT_PREFIX = 'fp-';
const FALLBACK_PREFIX = 'fallback-';
const MAX_UA_LENGTH = 200;
const MAX_ACCEPT_LANG_LENGTH = 100;
const MAX_ACCEPT_ENC_LENGTH = 100;

/**
 * Generates a session fingerprint from request characteristics.
 * This helps detect session hijacking by binding sessions to client properties.
 * The fingerprint is deterministic based on headers (no timestamp) so it can be validated across requests.
 *
 * @param req - Express request object (optional for testing)
 * @returns Fingerprint string (e.g., "fp-abc123") or fallback for non-request contexts
 */
export function generateSessionFingerprint(req?: Request): string {
    if (!req) {
        // Fallback for non-request contexts (e.g., tests)
        return `${FALLBACK_PREFIX}${Math.random().toString(36).substring(7)}`;
    }

    const userAgent = (req.headers['user-agent'] || 'unknown').substring(0, MAX_UA_LENGTH);
    const acceptLanguage = (req.headers['accept-language'] || 'unknown').substring(0, MAX_ACCEPT_LANG_LENGTH);
    const acceptEncoding = (req.headers['accept-encoding'] || 'unknown').substring(0, MAX_ACCEPT_ENC_LENGTH);

    // Create a hash of the fingerprint components
    const components = [userAgent, acceptLanguage, acceptEncoding].join('|');

    // Simple hash function (not cryptographic, just for fingerprinting)
    let hash = 0;
    for (let i = 0; i < components.length; i++) {
        const char = components.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }

    return `${FINGERPRINT_PREFIX}${Math.abs(hash).toString(36)}`;
}

/**
 * Validates if the request fingerprint matches the session fingerprint.
 * Returns true if they match (or if session has no fingerprint - backward compat).
 *
 * @param sessionFingerprint - Fingerprint stored with the session (null = allow all)
 * @param req - Current request to validate
 * @returns true if valid, false if mismatch (potential hijacking)
 */
export function validateSessionFingerprint(sessionFingerprint: string | null, req: Request): boolean {
    // If session has no fingerprint (backward compatibility), allow
    if (!sessionFingerprint) {
        return true;
    }

    const currentFingerprint = generateSessionFingerprint(req);
    return sessionFingerprint === currentFingerprint;
}