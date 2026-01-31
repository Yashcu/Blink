import { BACKEND_URL } from "@/config/env";

export type ApiError = {
    status: number;
    error?: string;
};

export async function apiFetch<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const res = await fetch(`${BACKEND_URL}${path}`, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
    });

    if (!res.ok) {
        let body: any = {};
        try {
            body = await res.json();
        } catch {
            // ignore
        }

        throw {
            status: res.status,
            error: body.error,
        } satisfies ApiError;
    }

    if (res.status === 204) {
        return undefined as T;
    }

    return res.json() as Promise<T>;
}
