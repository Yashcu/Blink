import { Link, useLocation } from "react-router-dom";
import { LogoutButton } from "@/components/LogoutButton";
import { Link as LinkIcon } from "lucide-react";

import { motion } from "framer-motion";

export function Layout({ children }: { children: React.ReactNode }) {
    const location = useLocation();

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/30">
            <header className="sticky top-0 z-50 w-full border-b border-border bg-background/50 backdrop-blur-xl supports-[backdrop-filter]:bg-background/20">
                <div className="container mx-auto flex h-16 items-center justify-between px-6 lg:px-8">
                    <div className="flex items-center gap-10">
                        <Link to="/dashboard" className="flex items-center gap-2 group">
                            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all duration-300">
                                <LinkIcon className="h-5 w-5 text-white" />
                            </div>
                            <span className="font-bold text-xl tracking-tight text-foreground/90 group-hover:text-foreground transition-colors">
                                Shorty
                            </span>
                        </Link>
                        <nav className="hidden md:flex items-center gap-1">
                            <NavLink to="/dashboard" label="Overview" active={location.pathname === "/dashboard"} />
                            <NavLink to="/urls/new" label="Create" active={location.pathname === "/urls/new"} />
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <LogoutButton />
                    </div>
                </div>
            </header>
            <main className="flex-1 container mx-auto max-w-screen-xl py-8 px-6 lg:px-8">
                <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                >
                    {children}
                </motion.div>
            </main>
        </div>
    );
}

function NavLink({ to, label, active }: { to: string; label: string; active: boolean }) {
    return (
        <Link
            to={to}
            className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                }`}
        >
            {label}
            {active && (
                <motion.div
                    layoutId="navbar-indicator"
                    className="absolute inset-0 rounded-full bg-foreground/10"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
            )}
        </Link>
    );
}
