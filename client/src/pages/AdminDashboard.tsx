import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  Download,
  Eye,
  Trash2,
  Search,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending">("all");
  const [sortBy, setSortBy] = useState<"connectedAt" | "businessName" | "phoneNumber">(
    "connectedAt"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Check if user is admin
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to access this page.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Only administrators can view the admin dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch data
  const businessesQuery = trpc.admin.listBusinesses.useQuery({
    page,
    limit,
    sortBy,
    sortOrder,
    statusFilter,
    searchQuery: searchQuery || undefined,
  });

  const statsQuery = trpc.admin.getStatistics.useQuery();
  const disconnectMutation = trpc.admin.disconnectBusiness.useMutation();
  const [isExporting, setIsExporting] = useState(false);

  const handleDisconnect = async (wabaId: string) => {
    if (!confirm("Are you sure you want to disconnect this business?")) return;

    try {
      await disconnectMutation.mutateAsync({ wabaId });
      toast.success("Business disconnected successfully");
      businessesQuery.refetch();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to disconnect";
      toast.error(errorMsg);
    }
  };

  const handleExport = async (format: "json" | "csv") => {
    setIsExporting(true);
    try {
      // Fetch export data
      const response = await fetch(
        `/api/trpc/admin.exportBusinesses?input=${encodeURIComponent(
          JSON.stringify({ statusFilter, format })
        )}`
      );
      const data = await response.json();

      if (data.result?.data) {
        const element = document.createElement("a");
        const file = new Blob([data.result.data], {
          type: format === "csv" ? "text/csv" : "application/json",
        });
        element.href = URL.createObjectURL(file);
        element.download = `businesses-export.${format}`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);

        toast.success(`Exported as ${format.toUpperCase()}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Export failed";
      toast.error(errorMsg);
    } finally {
      setIsExporting(false);
    }
  };

  const stats = statsQuery.data;
  const businesses = businessesQuery.data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
          <p className="text-lg text-slate-600">Manage and monitor all onboarded businesses</p>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="border-0 shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Total Businesses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.totalBusinesses}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.recentConnections} in last 7 days
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-emerald-600 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Approved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">{stats.approvedCount}</div>
                <p className="text-xs text-slate-500 mt-1">{stats.approvalRate}% approval rate</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">{stats.pendingCount}</div>
                <p className="text-xs text-slate-500 mt-1">Awaiting Meta approval</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Rejected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{stats.rejectedCount}</div>
                <p className="text-xs text-slate-500 mt-1">Need resubmission</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.activeCount}</div>
                <p className="text-xs text-slate-500 mt-1">Currently connected</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Controls */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Businesses</CardTitle>
            <CardDescription>View and manage all onboarded WhatsApp Business Accounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, phone, or WABA ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v as "all" | "approved" | "pending");
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Fully Approved</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy(v as "connectedAt" | "businessName" | "phoneNumber")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="connectedAt">Sort by Date</SelectItem>
                  <SelectItem value="businessName">Sort by Name</SelectItem>
                  <SelectItem value="phoneNumber">Sort by Phone</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "asc" | "desc")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest First</SelectItem>
                  <SelectItem value="asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("json")}
                disabled={isExporting}
              >
                <Download className="mr-2 h-4 w-4" />
                Export JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("csv")}
                disabled={isExporting}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Businesses Table */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-0">
            {businessesQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : businesses?.items && businesses.items.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="font-semibold">Business Name</TableHead>
                        <TableHead className="font-semibold">Phone Number</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Connected</TableHead>
                        <TableHead className="font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {businesses.items.map((business) => (
                        <TableRow key={business.wabaId} className="border-b border-slate-100">
                          <TableCell className="font-medium text-slate-900">
                            <div>
                              <div className="font-semibold">{business.businessName || "N/A"}</div>
                              <div className="text-xs text-slate-500 mt-1">{business.websiteUrl}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm text-slate-600">
                            <div>
                              <div>{business.phoneNumber}</div>
                              <div className="text-xs text-slate-500 mt-1 font-mono">{business.wabaId}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                business.displayNameStatus === "approved"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : business.displayNameStatus === "rejected"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-amber-100 text-amber-800"
                              }
                            >
                              {business.displayNameStatus === "approved"
                                ? "Fully Approved"
                                : business.displayNameStatus === "rejected"
                                  ? "Rejected"
                                  : "Pending Review"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {new Date(business.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Navigate to business details page
                                window.location.href = `/admin/business/${business.wabaId}`;
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDisconnect(business.wabaId)}
                              disabled={disconnectMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {businesses.pagination && (
                  <div className="flex items-center justify-between p-4 border-t border-slate-200">
                    <div className="text-sm text-slate-600">
                      Showing {(page - 1) * limit + 1} to{" "}
                      {Math.min(page * limit, businesses.pagination.total)} of{" "}
                      {businesses.pagination.total} businesses
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">
                          Page {page} of {businesses.pagination.totalPages}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.min(businesses.pagination.totalPages, page + 1))}
                        disabled={page === businesses.pagination.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-slate-300 mb-4" />
                <p className="text-slate-600">No businesses found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
