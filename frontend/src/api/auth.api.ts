import { apiFetch } from "@/api/client";

export type User = {
    id: string;
    email: string;
    createdAt?: string;
};

export interface AuthResponse {
    success: boolean;
    message?: string;
    token?: string;
    user?: User;
}

export function register(email: string, password: string) {
    return apiFetch<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password })
    });
}

export function login(email: string, password: string) {
    return apiFetch<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
    });
}

export function logout() {
    localStorage.removeItem("auth_token");
    return apiFetch<void>("/api/auth/logout", {
        method: "POST"
    });
}

export async function me(): Promise<User> {
    const res = await apiFetch<any>("/api/auth/me");
    if (res?.user) return res.user;
    if (res?.data?.userId) return { id: res.data.userId, email: res.data.email || "" };
    if (res?.data) return res.data;
    return res;
}
