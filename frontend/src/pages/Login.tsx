import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "../lib/validators";
import { z } from "zod";
import { login } from "@/api/auth.api";
import { useAuthStore } from "@/store/auth.store";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
    const navigate = useNavigate();
    const loadUser = useAuthStore((s) => s.loadUser);

    const form = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = async (data: LoginForm) => {
        try {
            await login(data.email, data.password);
            await loadUser();
            navigate("/dashboard");
        } catch (err: any) {
            form.setError("root", {
                message: err.error || "Login failed",
            });
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-[#0a0a0a] to-black text-foreground">
            <Card className="w-full max-w-sm border-border bg-card/40 backdrop-blur-xl shadow-2xl">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Login</CardTitle>
                    <CardDescription>
                        Enter your credentials to access your account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="m@example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {form.formState.errors.root && (
                                <div className="text-sm text-destructive">
                                    {form.formState.errors.root.message}
                                </div>
                            )}

                            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? "Logging in..." : "Login"}
                            </Button>
                        </form>
                    </Form>
                    <div className="mt-4 text-center text-sm">
                        Don&apos;t have an account?{" "}
                        <Link to="/register" className="underline">
                            Sign up
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
