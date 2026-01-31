import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import type { ReactNode } from "react";

export function PublicRoute({ children }: { children: ReactNode }) {
    const { user, loading } = useAuthStore();

    // Still checking auth → wait
    if (loading) {
        return <div className="p-6">Loading...</div>;
    }

    // Already logged in → go to dashboard
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    // Not logged in → allow access
    return <>{children}</>;
}
