import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUrl, updateUrl, deleteUrl } from "@/api/url.api";

export function useCreateUrl() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createUrl,
        onSuccess: () => {
            // 🔄 refresh dashboard data
            queryClient.invalidateQueries({ queryKey: ["urls"] });
        }
    });
}

export function useUpdateUrl(code: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { longUrl?: string; expiresAt?: string | null }) =>
            updateUrl(code, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["urls"] });
            queryClient.invalidateQueries({ queryKey: ["url", code] });
        }
    });
}

export function useDeleteUrl() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteUrl,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["urls"] });
        }
    });
}
