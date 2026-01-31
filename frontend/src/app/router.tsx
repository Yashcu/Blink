import { Routes, Route, Navigate } from "react-router-dom";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import CreateUrl from "@/pages/CreateUrl";
import EditUrl from "@/pages/EditUrl";
import Analytics from "@/pages/Analytics";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { PublicRoute } from "../components/PublicRoute";
import { Layout } from "../components/Layout";

export function AppRouter() {
    return (
        <Routes>
            {/* PUBLIC (only when logged OUT) */}
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                }
            />

            <Route
                path="/register"
                element={
                    <PublicRoute>
                        <Register />
                    </PublicRoute>
                }
            />

            {/* PROTECTED (only when logged IN) */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <Dashboard />
                        </Layout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/urls/new"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <CreateUrl />
                        </Layout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/urls/:code/edit"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <EditUrl />
                        </Layout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/analytics/:code"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <Analytics />
                        </Layout>
                    </ProtectedRoute>
                }
            />

            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="*" element={<div>404</div>} />
        </Routes>
    );
}
