import { BACKEND_URL } from "../config/env";

export function buildShortUrl(url: any) {
    return `${BACKEND_URL}/api/${(url.customAlias || url.shortCode).trim()}`;
}

export function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

export function getStatus(expiresAt?: string | null) {
    if (!expiresAt) return "Active";

    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    if (diff < 24 * 60 * 60 * 1000) return "Expiring soon";
    return "Active";
}