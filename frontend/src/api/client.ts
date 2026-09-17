import axios from "axios";
import { BACKEND_URL } from "@/config/env";
import { toast } from "sonner";

export const api = axios.create({
    baseURL: BACKEND_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
    },
});

api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const status = error.response?.status;
        const backendError = error.response?.data;

        if (status === 401) {
            if (!window.location.pathname.startsWith("/login") &&
                !window.location.pathname.startsWith("/register")) {
                window.location.href = "/login";
            }
        }

        if (status === 429) {
            toast.error("Too many requests. Please slow down.");
        }

        const message = backendError?.error || error.message || "An unexpected error occurred";
        const code = backendError?.code || "UNKNOWN_ERROR";

        return Promise.reject({ status, error: message, code });
    }
);

export const apiFetch = async <T>(path: string, options?: any): Promise<T> => {
    const method = options?.method || "GET";
    const data = options?.body ? JSON.parse(options.body) : undefined;

    return api.request<any, T>({
        url: path,
        method,
        data,
    });
};