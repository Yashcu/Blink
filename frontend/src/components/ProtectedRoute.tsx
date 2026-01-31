import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import type { ReactNode } from "react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
    const { user, loading } = useAuthStore();

    if (loading) {
        return <div className="p-6">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
