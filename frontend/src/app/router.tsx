import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { PublicRoute } from "../components/PublicRoute";
import { Layout } from "../components/Layout";

const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const CreateUrl = lazy(() => import("@/pages/CreateUrl"));
const EditUrl = lazy(() => import("@/pages/EditUrl"));
const Analytics = lazy(() => import("@/pages/Analytics"));

const PageLoader = () => (
    <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
);

export function AppRouter() {
    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
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

                {/* PROTECTED */}
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
                <Route path="*" element={<div>404 Not Found</div>} />
            </Routes>
        </Suspense>
    );
}