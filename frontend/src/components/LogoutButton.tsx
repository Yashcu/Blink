import { useAuthStore } from "../store/auth.store";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function LogoutButton() {
    const logout = useAuthStore((s) => s.logout);

    return (
        <Button variant="ghost" size="icon-sm" onClick={logout} aria-label="Log out">
            <LogOut className="h-4 w-4" />
        </Button>
    );
}