import { apiFetch } from "@/api/client";

export type AnalyticsResponse = {
    totalClicks: number;
    lastAccessed: string | null;
    countries: { code: string; count: number }[];
    devices: Record<string, number>;
    osStats: { os: string; count: number }[];
    browserStats: { browser: string; count: number }[];
    bots: number;
    url: {
        shortCode: string;
        customAlias: string | null;
        longUrl: string;
    };
};


export function getAnalytics(code: string) {
    return apiFetch<AnalyticsResponse>(`/api/analytics/${code}`);
}