// src/shared/timeout.ts
export async function withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    errorMessage: string,
): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms)),
    ]);
}
