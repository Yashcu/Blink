import { useAuthStore } from "../store/auth.store";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
    const logout = useAuthStore((s) => s.logout);

    return (
        <Button variant="ghost" onClick={logout}>
            Logout
        </Button>
    );
}
