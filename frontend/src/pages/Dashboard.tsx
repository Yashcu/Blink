import { useState, useMemo } from "react";
import { useUrls } from "@/api/url.queries";
import { formatDate, buildShortUrl, getStatus } from "@/lib/helper";
import { Link } from "react-router-dom";
import { Copy, MoreHorizontal, BarChart2, Edit, ExternalLink, Plus, Search, Link2, Activity, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

export default function Dashboard() {
    const { data, isLoading, error } = useUrls();
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const copyToClipboard = async (shortUrl: string, code: string) => {
        await navigator.clipboard.writeText(shortUrl);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 1500);
    };

    const stats = useMemo(() => {
        if (!data) return { total: 0, active: 0, expired: 0 };
        return {
            total: data.length,
            active: data.filter(u => getStatus(u.expiresAt) === "Active").length,
            expired: data.filter(u => getStatus(u.expiresAt) === "Expired").length
        };
    }, [data]);

    const filteredData = useMemo(() => {
        if (!data) return [];
        if (!searchTerm) return data;
        const lowerTerm = searchTerm.toLowerCase();
        return data.filter(u =>
            u.shortCode.toLowerCase().includes(lowerTerm) ||
            u.customAlias?.toLowerCase().includes(lowerTerm) ||
            u.longUrl.toLowerCase().includes(lowerTerm)
        );
    }, [data, searchTerm]);

    if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading workspace...</div>;
    if (error) return <div className="p-8 text-center text-destructive bg-destructive/10 rounded-lg border border-destructive/20">Failed to load URLs.</div>;

    return (
        <div className="space-y-8">
            {/* HEADER & ACTIONS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">Dashboard</h1>
                    <p className="text-muted-foreground">Manage your links and view performance.</p>
                </div>
                <Button asChild size="lg" className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all rounded-full px-6">
                    <Link to="/urls/new">
                        <Plus className="mr-2 h-4 w-4" /> Create New URL
                    </Link>
                </Button>
            </div>

            {/* STATS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard title="Total Links" value={stats.total} icon={Link2} color="text-blue-400" />
                <StatsCard title="Active Links" value={stats.active} icon={Activity} color="text-emerald-400" />
                <StatsCard title="Expired Links" value={stats.expired} icon={AlertCircle} color="text-amber-400" />
            </div>

            {/* MAIN CONTENT AREA */}
            <Card className="border-border bg-card/50 backdrop-blur-xl shadow-inner shadow-white/5 overflow-hidden">
                <div className="p-6 border-b border-border flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 className="text-lg font-semibold text-card-foreground">Your Links</h2>
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search links..."
                            className="pl-9 bg-background/20 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="p-0">
                    {filteredData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="rounded-full bg-muted/50 p-4 mb-4">
                                <Search className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-1">No links found</h3>
                            <p className="text-muted-foreground text-sm max-w-xs">{searchTerm ? `No results for "${searchTerm}"` : "Create your first short link to get started."}</p>
                            {!searchTerm && (
                                <Button asChild variant="link" className="text-primary mt-2">
                                    <Link to="/urls/new">Create One Now</Link>
                                </Button>
                            )}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow className="hover:bg-transparent border-border">
                                    <TableHead className="text-muted-foreground w-[280px]">Short Link</TableHead>
                                    <TableHead className="text-muted-foreground hidden md:table-cell">Original URL</TableHead>
                                    <TableHead className="text-muted-foreground">Created</TableHead>
                                    <TableHead className="text-muted-foreground">Status</TableHead>
                                    <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence initial={false}>
                                    {filteredData.map((url) => {
                                        const shortUrl = buildShortUrl(url);
                                        const isActive = getStatus(url.expiresAt) === "Active";

                                        return (
                                            <motion.tr
                                                key={url.shortCode}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                layout
                                                className="border-border hover:bg-muted/30 transition-colors group"
                                            >
                                                <TableCell className="font-medium align-top py-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className={`mt-1 p-1.5 rounded-md ${isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                            <ExternalLink className="h-3.5 w-3.5" />
                                                        </div>
                                                        <div>
                                                            <a href={shortUrl} target="_blank" rel="noreferrer" className="text-primary hover:text-primary/80 hover:underline font-semibold block mb-0.5">
                                                                {url.customAlias || url.shortCode}
                                                            </a>
                                                            <button
                                                                onClick={() => copyToClipboard(shortUrl, url.shortCode)}
                                                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                                                            >
                                                                {copiedCode === url.shortCode ? (
                                                                    <span className="text-emerald-400">Copied!</span>
                                                                ) : (
                                                                    <>Click to copy <Copy className="h-2.5 w-2.5" /></>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell align-top py-4 max-w-sm">
                                                    <div className="truncate text-muted-foreground text-sm" title={url.longUrl}>
                                                        {url.longUrl}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground align-top py-4 text-sm">
                                                    {formatDate(url.createdAt)}
                                                </TableCell>
                                                <TableCell className="align-top py-4">
                                                    <Badge variant="outline" className={`${isActive
                                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                        : "bg-destructive/10 text-destructive border-destructive/20"
                                                        } text-xs font-normal`}>
                                                        <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-destructive'} animate-pulse`}></span>
                                                        {getStatus(url.expiresAt)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right align-top py-4">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="bg-card border-border text-card-foreground">
                                                            <DropdownMenuItem asChild>
                                                                <Link to={`/analytics/${url.shortCode}`} className="cursor-pointer flex items-center gap-2 hover:bg-muted focus:bg-muted">
                                                                    <BarChart2 className="h-4 w-4" /> Analytics
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem asChild>
                                                                <Link to={`/urls/${url.shortCode}/edit`} className="cursor-pointer flex items-center gap-2 hover:bg-muted focus:bg-muted">
                                                                    <Edit className="h-4 w-4" /> Edit
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem asChild>
                                                                <a href={shortUrl} target="_blank" rel="noreferrer" className="cursor-pointer flex items-center gap-2 hover:bg-muted focus:bg-muted">
                                                                    <ExternalLink className="h-4 w-4" /> Visit
                                                                </a>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </motion.tr>
                                        );
                                    })}
                                </AnimatePresence>
                            </TableBody>
                        </Table>
                    )}
                </div>
            </Card>
        </div>
    );
}

function StatsCard({ title, value, icon: Icon, color }: { title: string, value: number, icon: any, color: string }) {
    return (
        <Card className="border-border bg-card/40 backdrop-blur-lg">
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <div className="text-2xl font-bold text-foreground mt-1">{value}</div>
                </div>
                <div className={`p-3 rounded-xl bg-background/50 ${color}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </CardContent>
        </Card>
    );
}
