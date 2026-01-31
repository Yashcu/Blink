// shared/circuit-breaker.ts
let failureCount = 0;
let circuitOpenUntil = 0;

const FAILURE_THRESHOLD = 5;
const OPEN_DURATION_MS = 30_000; // ← increased from 10s to 30s (more forgiving)

export function recordRedisFailure() {
    failureCount++;
    if (failureCount >= FAILURE_THRESHOLD) {
        circuitOpenUntil = Date.now() + OPEN_DURATION_MS;
    }
}

export function recordRedisSuccess() {
    failureCount = 0;
    circuitOpenUntil = 0; // ← reset immediately on success
}

export function isRedisCircuitOpen(): boolean {
    if (Date.now() >= circuitOpenUntil) {
        circuitOpenUntil = 0; // auto-close when time passes
    }
    return circuitOpenUntil > Date.now();
}
