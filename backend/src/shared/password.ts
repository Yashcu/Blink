import argon2 from 'argon2';

// Argon2id parameters (OWASP recommended baseline)
const ARGON2_CONFIG = {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3, // 3 iterations
    parallelism: 1,
} as const;

/**
 * Hashes a password using Argon2id with OWASP-recommended parameters.
 *
 * @param password - Plain text password
 * @returns Argon2id hash string (includes salt and parameters)
 */
export async function hashPassword(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_CONFIG);
}

/**
 * Verifies a password against an Argon2id hash.
 * Timing-safe by design (argon2.verify is constant-time).
 *
 * @param password - Plain text password to verify
 * @param hash - Stored Argon2id hash
 * @returns true if password matches, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
        return await argon2.verify(hash, password);
    } catch {
        return false;
    }
}
