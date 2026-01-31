import { useForm } from "react-hook-form";
import { useCreateUrl } from "@/api/url.mutations";
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

type CreateUrlForm = {
    longUrl: string;
    customAlias?: string;
};

export default function CreateUrl() {
    const navigate = useNavigate();
    const { mutateAsync, isPending } = useCreateUrl();

    const form = useForm<CreateUrlForm>();

    const onSubmit = async (data: CreateUrlForm) => {
        try {
            await mutateAsync({
                longUrl: data.longUrl,
                customAlias: data.customAlias || undefined
            });

            navigate("/dashboard");
        } catch (err: any) {
            form.setError("root", {
                message: err.error || "Failed to create URL",
            });
        }
    };

    return (
        <div className="flex justify-center">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="text-xl">Create New URL</CardTitle>
                    <CardDescription>
                        Shorten a long link to share it easily.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="longUrl"
                                rules={{ required: "Long URL is required" }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Long URL</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://example.com/very/long/url" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="customAlias"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Custom Alias (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="my-custom-link" {...field} />
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

                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" asChild type="button">
                                    <Link to="/dashboard">Cancel</Link>
                                </Button>
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? "Creating..." : "Create URL"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div >
    );
}
