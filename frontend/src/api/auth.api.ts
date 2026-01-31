import { apiFetch } from "@/api/client";

export type User = {
    id: string;
    email: string;
    createdAt: string;
};

export function register(email: string, password: string) {
    return apiFetch<void>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password })
    });
}

export function login(email: string, password: string) {
    return apiFetch<void>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
    });
}

export function logout() {
    return apiFetch<void>("/api/auth/logout", {
        method: "POST"
    });
}

export function me() {
    return apiFetch<User>("/api/auth/me");
}
