/**
 * Normalizes a short code or alias for consistent storage and lookup.
 * Trims whitespace and converts to lowercase.
 *
 * @param value - Raw code/alias string
 * @returns Normalized lowercase string
 */
export function normalizeCode(value: string): string {
    return value.trim().toLowerCase();
}
