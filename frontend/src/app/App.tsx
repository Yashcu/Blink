import { useEffect } from "react";
import { AppRouter } from "./router";
import { useAuthStore } from "@/store/auth.store";
import { Toaster } from "sonner";

export default function App() {
  const loadUser = useAuthStore((s) => s.loadUser);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppRouter />
      <Toaster position="bottom-right" theme="dark" richColors />
    </div>
  );
}