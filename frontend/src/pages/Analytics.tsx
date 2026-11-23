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
import {
  ArrowLeft,
  ExternalLink,
  MousePointerClick,
  Calendar,
  User,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

export default function AnalyticsPage() {
  const { code } = useParams<{ code: string }>();
  if (!code) return <div className="p-8 text-center text-muted-foreground">Invalid URL Code</div>;

  const { data, isLoading, error, refetch, isRefetching } = useAnalytics(code);

  if (isLoading)
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="text-muted-foreground font-medium">Loading analytics…</div>
        </div>
      </div>
    );

  if (error || !data)
    return (
      <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-3 bg-destructive/10 text-destructive rounded-full">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold">Analytics Not Found</h2>
        <p className="text-muted-foreground">
          The link might depend on an old ID or hasn't been created yet.
        </p>
        <Button asChild variant="outline">
          <Link to="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );

  const shortLink = `${BACKEND_URL}/${data.url.customAlias || data.url.shortCode}`;

  const devices = Object.entries(data.devices || {}).map(([type, count]) => ({
    type,
    count: Number(count),
  }));

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            asChild
            className="rounded-md"
          >
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
            <div className="flex items-center text-sm text-muted-foreground gap-2 mt-1">
              <span className="font-mono-ui bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                {data.url.customAlias || data.url.shortCode}
              </span>
              <span>•</span>
              <a
                href={shortLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center hover:text-foreground transition-colors"
              >
                Visit Link{" "}
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
          />
          {isRefetching ? "Refreshing…" : "Refresh Data"}
        </Button>
      </div>

      {/* Overview Cards — varied widths for rhythm */}
      <div className="grid gap-3 sm:grid-cols-3">
        <OverviewCard
          title="Total Clicks"
          value={data.totalClicks}
          icon={MousePointerClick}
        />
        <OverviewCard
          title="Last Accessed"
          value={
            data.lastAccessed
              ? new Date(data.lastAccessed).toLocaleString()
              : "Never"
          }
          icon={Calendar}
          subtext="Local time"
        />
        <OverviewCard
          title="Bot Traffic"
          value={data.bots}
          icon={User}
          subtext="Filtered from totals"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {/* Device Chart — main visual moment */}
        <Card className="lg:col-span-4 border-border bg-card/50 shadow-sm">
          <CardHeader>
            <CardTitle>Device Distribution</CardTitle>
            <CardDescription>Visitor device types</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center min-h-[280px] items-center">
            {devices.length > 0 ? (
              <DeviceChart data={devices} />
            ) : (
              <div className="text-muted-foreground text-sm flex flex-col items-center gap-2">
                <MousePointerClick className="h-8 w-8 opacity-20" />
                No device data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Operating Systems Table */}
        <Card className="lg:col-span-3 border-border bg-card/50 shadow-sm">
          <CardHeader>
            <CardTitle>Operating Systems</CardTitle>
            <CardDescription>Top platforms used by visitors</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead>OS</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="w-[80px] text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.osStats.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No data available yet
                    </TableCell>
                  </TableRow>
                ) : (
                  data.osStats.map((o) => (
                    <TableRow key={o.os} className="border-border/50">
                      <TableCell className="font-medium">{o.os}</TableCell>
                      <TableCell className="text-right font-mono-ui tabular-nums">
                        {o.count}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground font-mono-ui tabular-nums">
                        {data.totalClicks > 0
                          ? `${((o.count / data.totalClicks) * 100).toFixed(1)}%`
                          : "0%"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Country Stats */}
      <Card className="border-border bg-card/50 shadow-sm">
        <CardHeader>
          <CardTitle>Locations</CardTitle>
          <CardDescription>Where your clicks are coming from</CardDescription>
        </CardHeader>
        <CardContent>
          {data.countries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No location data yet
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.countries.map((c) => (
                <div
                  key={c.country}
                  className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full text-sm border border-border"
                >
                  <span className="font-medium">{c.country || "Unknown"}</span>
                  <span className="bg-primary/10 text-primary px-2 rounded text-xs font-bold font-mono-ui tabular-nums">
                    {c.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OverviewCard({
  title,
  value,
  icon: Icon,
  subtext,
}: {
  title: string;
  value: string | number;
  icon: any;
  subtext?: string;
}) {
  return (
    <Card className="border-border bg-card/50 shadow-sm hover:bg-card/80 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {subtext && (
          <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
        )}
      </CardContent>
    </Card>
  );
}