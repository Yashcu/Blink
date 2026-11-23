import { ValidationError } from './errors';

const MAX_URL_LENGTH = 2048;
const PRIVATE_IP_REGEX = /^172\.(1[6-9]|2[0-9]|3[0-1])\./;
const LOCALHOST_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

/**
 * Validates and sanitizes a URL for shortening.
 * Prevents SSRF by blocking localhost, private IPs, and non-HTTP(S) protocols.
 *
 * @param raw - Raw URL string from user input
 * @returns Parsed URL object (validated)
 * @throws ValidationError if URL is invalid, too long, or targets restricted hosts
 */
export function validateUrl(raw: string): URL {
    if (!raw) {
        throw new ValidationError('longUrl required');
    }

    let parsed: URL;
    try {
        parsed = new URL(raw);
    } catch {
        throw new ValidationError('Invalid URL');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new ValidationError('Invalid URL protocol');
    }

    if (raw.length > MAX_URL_LENGTH) {
        throw new ValidationError('URL too long');
    }

    const { hostname } = parsed;
    const isLocalhost = LOCALHOST_HOSTNAMES.has(hostname);
    const isPrivateIP =
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        PRIVATE_IP_REGEX.test(hostname);

    if (isLocalhost || isPrivateIP) {
        throw new ValidationError('Restricted URL');
    }

    return parsed;
}
