import { useQuery } from "@tanstack/react-query";
import { getAnalytics } from "@/api/analytics.api";

export function useAnalytics(code: string) {
    return useQuery({
        queryKey: ["analytics", code],
        queryFn: () => getAnalytics(code)
    });
}
