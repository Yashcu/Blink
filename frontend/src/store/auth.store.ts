import { create } from "zustand";
import { me, logout as apiLogout } from "@/api/auth.api";

export type User = {
    id: string;
    email: string;
    createdAt: string;
};

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
        try {
            const user = await me();
            set({ user, loading: false });
        } catch (err: any) {
            // 401 or any failure → logged out
            set({ user: null, loading: false });
        }
    },

    logout: async () => {
        try {
            await apiLogout();
        } finally {
            set({ user: null });
        }
    }
}));
