import { customAlphabet } from 'nanoid';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const DEFAULT_LENGTH = 7;

const nanoid = customAlphabet(ALPHABET, DEFAULT_LENGTH);

/**
 * Generates a cryptographically secure random short code.
 * Uses nanoid with a custom alphabet (A-Z, a-z, 0-9).
 *
 * @param length - Length of the code (default: 7, ~3.5 trillion combinations)
 * @returns Random short code string
 */
export function generateShortCode(length = DEFAULT_LENGTH): string {
    if (length === DEFAULT_LENGTH) {
        return nanoid();
    }

    return customAlphabet(ALPHABET, length)();
}
