import { useState, useMemo } from "react";
import { useUrls } from "@/api/url.queries";
import { formatDate, buildShortUrl, getStatus } from "@/lib/helper";
import { Link } from "react-router-dom";
import {
  Copy,
  MoreHorizontal,
  BarChart2,
  Edit,
  ExternalLink,
  Plus,
  Search,
  Link2,
  Activity,
  AlertCircle,
  QrCode,
  X,
} from "lucide-react";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import QRCode from "react-qr-code";

export default function Dashboard() {
  const { data, isLoading, error } = useUrls();
  const [searchTerm, setSearchTerm] = useState("");
  const [qrModal, setQrModal] = useState<{
    isOpen: boolean;
    url: string;
    code: string;
  } | null>(null);

  const copyToClipboard = async (shortUrl: string) => {
    await navigator.clipboard.writeText(shortUrl);
    toast.success("Copied to clipboard!", { duration: 1500 });
  };

  const stats = useMemo(() => {
    if (!data) return { total: 0, active: 0, expired: 0 };
    return {
      total: data.length,
      active: data.filter((u) => getStatus(u.expiresAt) === "Active").length,
      expired: data.filter((u) => getStatus(u.expiresAt) === "Expired").length,
    };
  }, [data]);

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!searchTerm) return data;
    const lowerTerm = searchTerm.toLowerCase();
    return data.filter(
      (u) =>
        u.shortCode.toLowerCase().includes(lowerTerm) ||
        (u.customAlias && u.customAlias.toLowerCase().includes(lowerTerm)) ||
        u.longUrl.toLowerCase().includes(lowerTerm),
    );
  }, [data, searchTerm]);

  if (error)
    return (
      <div className="p-8 text-center text-red-500">Failed to load links.</div>
    );

  return (
    <div className="space-y-8 relative">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your links and view performance.
          </p>
        </div>
        <Button
          asChild
          size="lg"
          className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all rounded-full px-6"
        >
          <Link to="/urls/new">
            <Plus className="mr-2 h-4 w-4" /> Create New URL
          </Link>
        </Button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Total Links"
          value={stats.total}
          icon={Link2}
          color="text-blue-400"
          loading={isLoading}
        />
        <StatsCard
          title="Active Links"
          value={stats.active}
          icon={Activity}
          color="text-emerald-400"
          loading={isLoading}
        />
        <StatsCard
          title="Expired Links"
          value={stats.expired}
          icon={AlertCircle}
          color="text-amber-400"
          loading={isLoading}
        />
      </div>

      {/* MAIN CONTENT */}
      <Card className="border-border bg-card/50 backdrop-blur-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-lg font-semibold text-card-foreground">
            Your Links
          </h2>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search links..."
              className="pl-9 bg-background/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="p-0">
          {/* LOADING SKELETON */}
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-10 w-10 bg-muted rounded-md" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-muted rounded" />
                    <div className="h-3 w-32 bg-muted rounded" />
                  </div>
                  <div className="h-8 w-20 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted/50 p-4 mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No links found</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {searchTerm
                  ? "Try a different search term."
                  : "Create your first link to get started."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="w-[300px]">Short Link</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Original URL
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                        className="border-border hover:bg-muted/30 group"
                      >
                        <TableCell className="align-top py-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-1 p-2 rounded-lg ${isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </div>
                            <div>
                              <a
                                href={shortUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline font-semibold text-base block"
                              >
                                {url.customAlias || url.shortCode}
                              </a>
                              <div className="flex items-center gap-3 mt-1">
                                <button
                                  onClick={() => copyToClipboard(shortUrl)}
                                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                                >
                                  <Copy className="h-3 w-3" /> Copy
                                </button>
                                <span className="text-xs text-muted-foreground">
                                  • {formatDate(url.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell align-top py-4 max-w-sm">
                          <div
                            className="truncate text-muted-foreground text-sm max-w-[300px]"
                            title={url.longUrl}
                          >
                            {url.longUrl}
                          </div>
                        </TableCell>
                        <TableCell className="align-top py-4">
                          <Badge
                            variant="outline"
                            className={`${isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}
                          >
                            {getStatus(url.expiresAt)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right align-top py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-muted"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem asChild>
                                <Link
                                  to={`/analytics/${url.shortCode}`}
                                  className="cursor-pointer"
                                >
                                  <BarChart2 className="mr-2 h-4 w-4" />{" "}
                                  Analytics
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link
                                  to={`/urls/${url.shortCode}/edit`}
                                  className="cursor-pointer"
                                >
                                  <Edit className="mr-2 h-4 w-4" /> Edit Link
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  setQrModal({
                                    isOpen: true,
                                    url: shortUrl,
                                    code: url.customAlias || url.shortCode,
                                  })
                                }
                                className="cursor-pointer"
                              >
                                <QrCode className="mr-2 h-4 w-4" /> QR Code
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => copyToClipboard(shortUrl)}
                                className="cursor-pointer"
                              >
                                <Copy className="mr-2 h-4 w-4" /> Copy Link
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

      {/* QR CODE MODAL */}
      <AnimatePresence>
        {qrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-xs relative"
            >
              <button
                onClick={() => setQrModal(null)}
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold">QR Code</h3>
                <p className="text-sm text-muted-foreground">{qrModal.code}</p>
              </div>
              <div className="bg-white p-4 rounded-lg mx-auto w-fit">
                <QRCode value={qrModal.url} size={180} />
              </div>
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={() => setQrModal(null)}
                  variant="outline"
                  className="w-full"
                >
                  Done
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
  color,
  loading,
}: {
  title: string;
  value: number;
  icon: any;
  color: string;
  loading: boolean;
}) {
  return (
    <Card className="border-border bg-card/40 backdrop-blur-lg">
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <div className="h-8 w-16 bg-muted animate-pulse rounded mt-1" />
          ) : (
            <div className="text-2xl font-bold text-foreground mt-1">
              {value}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-background/50 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
