import { useParams, Link } from "react-router-dom";
import { useAnalytics } from "@/api/analytics.queries";
import { DeviceChart } from "@/components/DeviceChart";
import { BACKEND_URL } from "@/config/env";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ArrowLeft, ExternalLink, MousePointerClick, Calendar, User } from "lucide-react";

export default function AnalyticsPage() {
    const { code } = useParams<{ code: string }>();
    if (!code) return <div>Invalid URL</div>;

    const { data, isLoading, error } = useAnalytics(code);

    if (isLoading) return <div className="p-6">Loading analytics...</div>;
    if (error || !data) return <div className="p-6 text-red-500">Analytics not found</div>;

    const shortLink = `${BACKEND_URL}/api/${data.url.customAlias || data.url.shortCode}`;
    const devices = Object.entries(data.devices).map(
        ([type, count]) => ({ type, count })
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link to="/dashboard">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
                    <div className="flex items-center text-sm text-muted-foreground gap-2">
                        <span>{data.url.customAlias || data.url.shortCode}</span>
                        <span>•</span>
                        <a href={shortLink} target="_blank" rel="noreferrer" className="flex items-center hover:underline">
                            Visit Short Link <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                    </div>
                </div>
            </div>

            {/* OVERVIEW CARDS */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Clicks
                        </CardTitle>
                        <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.totalClicks}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Last Accessed
                        </CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-sm">
                            {data.lastAccessed
                                ? new Date(data.lastAccessed).toLocaleString()
                                : "Never"}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Bot Traffic
                        </CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.bots}</div>
                        <p className="text-xs text-muted-foreground">
                            Identified automated requests
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* DEVICE CHART */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Device Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <DeviceChart data={devices} />
                    </CardContent>
                </Card>

                {/* OPERATING SYSTEMS */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Operating Systems</CardTitle>
                        <CardDescription>Top OS platforms</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>OS</TableHead>
                                    <TableHead className="text-right">Clicks</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.osStats.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center">No data</TableCell>
                                    </TableRow>
                                ) : (
                                    data.osStats.map(o => (
                                        <TableRow key={o.os}>
                                            <TableCell>{o.os}</TableCell>
                                            <TableCell className="text-right">{o.count}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {/* BROWSERS */}
                <Card>
                    <CardHeader>
                        <CardTitle>Browsers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Browser</TableHead>
                                    <TableHead className="text-right">Clicks</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.browserStats.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center">No data</TableCell>
                                    </TableRow>
                                ) : (
                                    data.browserStats.map(b => (
                                        <TableRow key={b.browser}>
                                            <TableCell>{b.browser}</TableCell>
                                            <TableCell className="text-right">{b.count}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* COUNTRIES */}
                <Card>
                    <CardHeader>
                        <CardTitle>Countries</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Country Code</TableHead>
                                    <TableHead className="text-right">Clicks</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.countries.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center">No data</TableCell>
                                    </TableRow>
                                ) : (
                                    data.countries.map(c => (
                                        <TableRow key={c.code}>
                                            <TableCell>{c.code}</TableCell>
                                            <TableCell className="text-right">{c.count}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
