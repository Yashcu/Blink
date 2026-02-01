import axios from "axios";
import { BACKEND_URL } from "@/config/env";

export const api = axios.create({
    baseURL: BACKEND_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response?.status === 401) {
            if (
                !window.location.pathname.startsWith("/login") &&
                !window.location.pathname.startsWith("/register")
            ) {
                window.location.href = "/login";
            }
        }

        const message =
            error.response?.data?.error ||
            error.message ||
            "An unexpected error occurred";

        return Promise.reject({ status: error.response?.status, error: message });
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