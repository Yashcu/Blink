// shared/circuit-breaker.ts
// Simple in-memory circuit breaker for Redis failures.
// Prevents cascading failures when Redis is unavailable.

let failureCount = 0;
let circuitOpenUntil = 0;

const FAILURE_THRESHOLD = 5;
const OPEN_DURATION_MS = 30_000; // 30 seconds

/**
 * Records a Redis failure. Opens circuit after threshold reached.
 */
export function recordRedisFailure(): void {
    failureCount++;
    if (failureCount >= FAILURE_THRESHOLD) {
        circuitOpenUntil = Date.now() + OPEN_DURATION_MS;
    }
}

/**
 * Records a Redis success. Resets failure count and closes circuit.
 */
export function recordRedisSuccess(): void {
    failureCount = 0;
    circuitOpenUntil = 0;
}

/**
 * Checks if circuit breaker is open (failing fast).
 * Auto-closes when OPEN_DURATION_MS has elapsed.
 *
 * @returns true if circuit is open, false otherwise
 */
export function isRedisCircuitOpen(): boolean {
    if (Date.now() >= circuitOpenUntil) {
        circuitOpenUntil = 0; // auto-close when time passes
    }
    return circuitOpenUntil > Date.now();
}
