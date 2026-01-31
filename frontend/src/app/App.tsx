import { useEffect } from "react";
import { AppRouter } from "./router";
import { useAuthStore } from "@/store/auth.store";

export default function App() {
  const loadUser = useAuthStore((s) => s.loadUser);

  useEffect(() => {
    loadUser();
    document.documentElement.classList.add("dark");
  }, [loadUser]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppRouter />
    </div>
  );
}
