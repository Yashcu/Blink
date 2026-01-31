import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { useUrl } from "@/api/url.queries";
import { useUpdateUrl, useDeleteUrl } from "@/api/url.mutations";
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

type EditForm = {
    longUrl?: string;
    expiresAt?: string | null;
};

export default function EditUrl() {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();

    const safeCode = code || "";
    const { data, isLoading, error } = useUrl(safeCode);
    const { mutateAsync: update, isPending: updating } = useUpdateUrl(safeCode);
    const { mutateAsync: remove, isPending: deleting } = useDeleteUrl();

    const form = useForm<EditForm>();

    useEffect(() => {
        if (data) {
            form.reset({
                longUrl: data.longUrl,
                expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString().slice(0, 16) : ""
            });
        }
    }, [data, form]);

    if (!code) return <div className="p-6 text-destructive">Invalid URL segment</div>;
    if (isLoading) return <div className="p-6 text-muted-foreground animate-pulse">Loading...</div>;
    if (error || !data) return <div className="p-6 text-destructive">URL not found</div>;

    const onSubmit = async (formData: EditForm) => {
        try {
            await update({
                longUrl: formData.longUrl,
                expiresAt: formData.expiresAt || null
            });
            navigate("/dashboard");
        } catch (err: any) {
            alert(err.error || "Update failed");
        }
    };

    const onDelete = async () => {
        if (!confirm("Delete this URL permanently?")) return;

        try {
            await remove(code);
            navigate("/dashboard");
        } catch (err: any) {
            alert(err.error || "Delete failed");
        }
    };

    return (
        <div className="flex justify-center">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="text-xl">Edit URL</CardTitle>
                    <CardDescription>
                        Modify or delete your short URL.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="longUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Long URL</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="expiresAt"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Expiration Date (Optional)</FormLabel>
                                        <FormControl>
                                            <Input type="datetime-local" {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-between mt-6">
                                <Button type="button" variant="destructive" onClick={onDelete} disabled={deleting}>
                                    {deleting ? "Deleting..." : "Delete URL"}
                                </Button>
                                <div className="space-x-2">
                                    <Button variant="ghost" asChild type="button">
                                        <Link to="/dashboard">Cancel</Link>
                                    </Button>
                                    <Button type="submit" disabled={updating}>
                                        {updating ? "Saving..." : "Save Changes"}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
