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
  if (!code) return <div className="p-8 text-center">Invalid URL Code</div>;

  // Hook handles fetching data
  const { data, isLoading, error, refetch, isRefetching } = useAnalytics(code);

  if (isLoading)
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 bg-muted rounded-full" />
          <div className="text-muted-foreground font-medium">
            Gathering insights...
          </div>
        </div>
      </div>
    );

  if (error || !data)
    return (
      <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-4 bg-destructive/10 text-destructive rounded-full">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold">Analytics Not Found</h2>
        <p className="text-muted-foreground">
          The link might depend on an old ID or hasn't been created yet.
        </p>
        <Button asChild variant="outline">
          <Link to="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );

  const shortLink = `${BACKEND_URL}/${data.url.customAlias || data.url.shortCode}`;

  // Transform device object { desktop: 10 } -> array [{ type: 'desktop', count: 10 }]
  const devices = Object.entries(data.devices || {}).map(([type, count]) => ({
    type,
    count: Number(count),
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            asChild
            className="rounded-full shadow-sm"
          >
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <div className="flex items-center text-sm text-muted-foreground gap-2 mt-1">
              <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded text-xs uppercase font-bold">
                {data.url.customAlias || data.url.shortCode}
              </span>
              <span>•</span>
              <a
                href={shortLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center hover:text-foreground transition-colors group"
              >
                Visit Link{" "}
                <ExternalLink className="ml-1 h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="gap-2 shadow-sm active:scale-95 transition-all"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
          />
          {isRefetching ? "Syncing..." : "Refresh Data"}
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
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
          subtext="Automated requests filtered"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Device Chart */}
        <Card className="col-span-3 border-border bg-card/50 backdrop-blur-sm shadow-sm">
          <CardHeader>
            <CardTitle>Device Distribution</CardTitle>
            <CardDescription>Visitors by device type</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center min-h-[300px] items-center">
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
        <Card className="col-span-4 border-border bg-card/50 backdrop-blur-sm shadow-sm">
          <CardHeader>
            <CardTitle>Operating Systems</CardTitle>
            <CardDescription>Top platforms used by visitors</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead>OS</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="w-[100px] text-right">
                    Percent
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.osStats.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-12 text-muted-foreground"
                    >
                      No data available yet
                    </TableCell>
                  </TableRow>
                ) : (
                  data.osStats.map((o) => (
                    <TableRow key={o.os} className="border-border">
                      <TableCell className="font-medium">{o.os}</TableCell>
                      <TableCell className="text-right font-mono">
                        {o.count}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {data.totalClicks > 0
                          ? Math.round((o.count / data.totalClicks) * 100)
                          : 0}
                        %
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Country Stats (Optional - fits nicely below) */}
      <Card className="border-border bg-card/50 backdrop-blur-sm shadow-sm">
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
                  <span className="bg-primary/10 text-primary px-1.5 rounded text-xs font-bold">
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
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {subtext && (
          <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
        )}
      </CardContent>
    </Card>
  );
}
