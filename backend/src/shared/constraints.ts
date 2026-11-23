/**
 * Authentication-related constraints.
 * Based on RFC standards and security best practices.
 */
export const AUTH_CONSTRAINTS = {
    /** RFC 5321 - maximum email length */
    EMAIL_MAX_LENGTH: 254,
    /** Minimum password length for security */
    PASSWORD_MIN_LENGTH: 8,
    /** Maximum password length (bcrypt safe limit) */
    PASSWORD_MAX_LENGTH: 72,
} as const;

/**
 * URL-related constraints for aliases and short codes.
 */
export const URL_CONSTRAINTS = {
    /** Minimum custom alias length */
    ALIAS_MIN_LENGTH: 3,
    /** Maximum custom alias length */
    ALIAS_MAX_LENGTH: 50,
} as const;
