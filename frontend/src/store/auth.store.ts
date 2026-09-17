import { create } from "zustand";
import { me, logout as apiLogout, type User } from "@/api/auth.api";

export type { User };

type AuthState = {
    user: User | null;
    loading: boolean;
    loadUser: () => Promise<void>;
    logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    loading: true,

    loadUser: async () => {
        set({ loading: true });
        try {
            const user = await me();
            set({ user, loading: false });
        } catch (err: any) {
            localStorage.removeItem("auth_token");
            set({ user: null, loading: false });
        }
    },

    logout: async () => {
        try {
            await apiLogout();
        } finally {
            localStorage.removeItem("auth_token");
            set({ user: null });
            window.location.href = "/login";
        }
    }
}));
