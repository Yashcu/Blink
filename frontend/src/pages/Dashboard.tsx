import { useState, useMemo, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useUrls } from "@/api/url.queries";
import { useCreateUrl } from "@/api/url.mutations";
import { formatDate, buildShortUrl, getStatus } from "@/lib/helper";
import { Link } from "react-router-dom";
import {
  Copy,
  MoreHorizontal,
  BarChart2,
  Edit,
  Plus,
  Search,
  Activity,
  AlertCircle,
  QrCode,
  X,
  Link2,
  Loader2,
  Command,
  Check,
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
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import QRCode from "react-qr-code";

type CreateUrlForm = {
  longUrl: string;
  customAlias?: string;
};

export default function Dashboard() {
  const { data, isLoading, error, refetch } = useUrls();
  const { mutateAsync: createUrl, isPending: isCreating } = useCreateUrl();
  const [searchTerm, setSearchTerm] = useState("");
  const [qrModal, setQrModal] = useState<{
    isOpen: boolean;
    url: string;
    code: string;
  } | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const form = useForm<CreateUrlForm>();

  const onCreateSubmit = async (data: CreateUrlForm) => {
    try {
      await createUrl({
        longUrl: data.longUrl,
        customAlias: data.customAlias || undefined,
      });
      toast.success("Link created", { duration: 1500 });
      form.reset();
      setCreateModalOpen(false);
      refetch();
    } catch (err: any) {
      form.setError("root", {
        message: err.error || "Failed to create URL",
      });
    }
  };

  const copyToClipboard = useCallback(async (shortUrl: string, code: string) => {
    await navigator.clipboard.writeText(shortUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  }, []);

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

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  if (error)
    return (
      <div className="p-8 text-center text-destructive">Failed to load links.</div>
    );

  return (
    <div className="space-y-6">
      {/* HEADER — with Create link button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-muted-foreground text-sm">
            {stats.total} link{stats.total !== 1 ? "s" : ""} • {stats.active} active
          </p>
        </div>
        <Button
          size="lg"
          className="gap-2 rounded-md px-5"
          onClick={() => setCreateModalOpen(true)}
        >
          <Plus className="h-4 w-4" /> Create link
        </Button>
      </div>

      {/* STATS ROW — compact, equal height */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          title="Total"
          value={stats.total}
          icon={Link2}
        />
        <StatCard
          title="Active"
          value={stats.active}
          icon={Activity}
        />
        <StatCard
          title="Expired"
          value={stats.expired}
          icon={AlertCircle}
        />
      </div>

      {/* MAIN CONTENT — Links Table */}
      <Card className="border-border bg-card/50 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-base font-semibold text-card-foreground">
            Your Links
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Search links..."
              className="pl-9 bg-background/50 pr-20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search links"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono-ui text-muted-foreground/60 bg-muted rounded">
              <Command className="h-3 w-3" aria-hidden="true" />
              <span>K</span>
            </kbd>
          </div>
        </div>

        <div className="p-0">
          {/* LOADING SKELETON — no animation, just muted blocks */}
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-muted rounded-md" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                  </div>
                  <div className="h-8 w-20 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative mb-4">
                <svg
                  className="w-24 h-24 text-muted/30 mx-auto"
                  viewBox="0 0 64 64"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect x="8" y="16" width="48" height="32" rx="4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 4" />
                  <path d="M16 24h32M16 32h24M16 40h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
                  <circle cx="48" cy="40" r="6" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M51 37l-3 3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {searchTerm && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-24 h-24 text-primary/20" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                      <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="2" strokeDasharray="125.6" strokeDashoffset="30" />
                    </svg>
                  </div>
                )}
              </div>
              <h3 className="text-base font-medium">{searchTerm ? "No matches found" : "No links yet"}</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-xs">
                {searchTerm
                  ? "Try a different search term or clear the filter."
                  : "Create your first link to get started."}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="w-[260px]">Short Link</TableHead>
                    <TableHead className="hidden md:table-cell">Destination</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[120px] text-right">Created</TableHead>
                    <TableHead className="w-[60px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((url) => {
                    const shortUrl = buildShortUrl(url);
                    const isActive = getStatus(url.expiresAt) === "Active";
                    const displayCode = url.customAlias || url.shortCode;
                    const isCopied = copiedCode === displayCode;

                    return (
                      <TableRow
                        key={url.shortCode}
                        className="border-border/50 hover:bg-muted/30"
                      >
                        <TableCell className="align-top py-3">
                          <div className="flex items-start gap-3">
                            <span className="text-primary font-mono-ui text-sm shrink-0" aria-label="Link indicator">▸</span>
                            <div className="min-w-0 flex-1">
                              <a
                                href={shortUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline font-mono-ui text-sm block truncate"
                                title={shortUrl}
                              >
                                {displayCode}
                              </a>
                              <div className="flex items-center gap-2 mt-1">
                                <button
                                  onClick={() => copyToClipboard(shortUrl, displayCode)}
                                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors relative"
                                  aria-label={`Copy ${displayCode}`}
                                >
                                  <Copy className="h-3 w-3" />
                                  {isCopied && (
                                    <span className="absolute -top-6 left-0 text-[10px] text-success bg-success/10 px-1.5 py-0.5 rounded whitespace-nowrap animate-fade-in">
                                      <Check className="h-2.5 w-2.5 mr-0.5 inline-block" />
                                      Copied
                                    </span>
                                  )}
                                </button>
                                <span className="text-xs text-muted-foreground font-mono-ui">
                                  {formatDate(url.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell align-top py-3 max-w-[320px]">
                          <div
                            className="truncate text-muted-foreground text-sm font-mono-ui"
                            title={url.longUrl}
                          >
                            {url.longUrl}
                          </div>
                        </TableCell>
                        <TableCell className="align-top py-3">
                          <Badge
                            variant={isActive ? "success" : "warning"}
                            className="text-xs"
                          >
                            {getStatus(url.expiresAt)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right align-top py-3 font-mono-ui text-xs text-muted-foreground">
                          {formatDate(url.createdAt)}
                        </TableCell>
                        <TableCell className="text-right align-top py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="h-8 w-8 hover:bg-muted"
                                aria-label={`Actions for ${displayCode}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem asChild>
                                <Link
                                  to={`/analytics/${url.shortCode}`}
                                  className="cursor-pointer"
                                >
                                  <BarChart2 className="mr-2 h-4 w-4" /> Analytics
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link
                                  to={`/urls/${url.shortCode}/edit`}
                                  className="cursor-pointer"
                                >
                                  <Edit className="mr-2 h-4 w-4" /> Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  setQrModal({
                                    isOpen: true,
                                    url: shortUrl,
                                    code: displayCode,
                                  })
                                }
                                className="cursor-pointer"
                              >
                                <QrCode className="mr-2 h-4 w-4" /> QR Code
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => copyToClipboard(shortUrl, displayCode)}
                                className="cursor-pointer"
                              >
                                <Copy className="mr-2 h-4 w-4" /> Copy Link
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
                  <p className="text-xs text-muted-foreground font-mono-ui">
                    Page {currentPage} of {totalPages} • {filteredData.length} links
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      aria-label="Previous page"
                    >
                      <span className="text-xs">←</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      aria-label="Next page"
                    >
                      <span className="text-xs">→</span>
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* CREATE LINK MODAL */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={() => setCreateModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-title"
        >
          <div
            className="bg-card border border-border rounded-xl shadow-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 id="create-title" className="text-base font-semibold">Create Link</h3>
                <p className="text-sm text-muted-foreground">Enter a destination URL. Optionally add a custom short code.</p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="longUrl"
                  rules={{ required: "Destination URL is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/very/long/url"
                          {...field}
                          type="url"
                          autoComplete="url"
                          disabled={isCreating}
                        />
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
                      <FormLabel>Custom Code (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="my-link"
                          {...field}
                          maxLength={32}
                          pattern="[a-zA-Z0-9_-]*"
                          title="Letters, numbers, hyphens, underscores only"
                          disabled={isCreating}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave empty to auto-generate. 32 chars max, alphanumeric + _ -
                      </p>
                    </FormItem>
                  )}
                />

                {form.formState.errors.root && (
                  <div className="text-sm text-destructive" role="alert">
                    {form.formState.errors.root.message}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setCreateModalOpen(false)}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating…
                      </>
                    ) : (
                      "Create Link"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      )}

      {/* QR CODE MODAL — no framer motion, simple */}
      {qrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={() => setQrModal(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-title"
        >
          <div
            className="bg-card border border-border rounded-xl shadow-xl p-6 w-full max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 id="qr-title" className="text-base font-semibold">QR Code</h3>
                <p className="text-sm text-muted-foreground font-mono-ui">{qrModal.code}</p>
              </div>
              <button
                onClick={() => setQrModal(null)}
                className="text-muted-foreground hover:text-foreground p-1"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-white p-4 rounded-lg mx-auto w-fit">
              <QRCode value={qrModal.url} size={180} />
            </div>
            <div className="mt-4">
              <Button
                onClick={() => setQrModal(null)}
                variant="outline"
                className="w-full"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: any;
}) {
  return (
    <Card className="border-border bg-card/50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <div className="text-2xl font-semibold text-foreground mt-1 tabular-nums">
            {value}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}