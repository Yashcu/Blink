import { useQuery } from "@tanstack/react-query";
import { listUrls, getUrl } from "@/api/url.api";

export function useUrls() {
    return useQuery({
        queryKey: ["urls"],
        queryFn: listUrls
    });
}

export function useUrl(code: string) {
    return useQuery({
        queryKey: ["url", code],
        queryFn: () => getUrl(code)
    });
}

