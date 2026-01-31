import { apiFetch } from "@/api/client";

export type UrlItem = {
    shortCode: string;
    longUrl: string;
    customAlias?: string | null;
    createdAt: string;
    expiresAt?: string | null;
};

export function listUrls() {
    return apiFetch<UrlItem[]>("/api/urls");
}

export function createUrl(data: {
    longUrl: string;
    customAlias?: string;
}) {
    return apiFetch<{ shortCode: string }>("/api/urls", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

export function getUrl(code: string) {
    return apiFetch<{
        shortCode: string;
        longUrl: string;
        customAlias?: string | null;
        createdAt: string;
        expiresAt?: string | null;
    }>(`/api/urls/${code}`);
}

export function updateUrl(
    code: string,
    data: { longUrl?: string; expiresAt?: string | null }
) {
    return apiFetch(`/api/urls/${code}`, {
        method: "PATCH",
        body: JSON.stringify(data)
    });
}

export function deleteUrl(code: string) {
    return apiFetch<void>(`/api/urls/${code}`, {
        method: "DELETE"
    });
}
