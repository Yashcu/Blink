import { ValidationError } from './errors';

const MAX_URL_LENGTH = 2048;

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
    if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
        throw new ValidationError('Restricted URL');
    }

    return parsed;
}
