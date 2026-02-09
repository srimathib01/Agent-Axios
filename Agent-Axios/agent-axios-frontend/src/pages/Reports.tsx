import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Download, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReports } from "@/hooks/useReports";
import { useRepositories } from "@/hooks/useRepositories";
import { formatDistanceToNow } from "date-fns";
import type { Report, AnalysisStatus } from "@/services/api";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";

const Reports = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AnalysisStatus | "all">("all");
  const [repoFilter, setRepoFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  
  const { 
    reports, 
    isLoading, 
    pagination,
    loadReports,
    downloadReport,
  } = useReports({ autoLoad: true, perPage: 10 });

  const { repositories } = useRepositories({ autoLoad: true });

  // Load reports with filters
  useEffect(() => {
    const filters: any = { page: currentPage };
    
    if (statusFilter !== "all") {
      filters.status = statusFilter;
    }
    
    if (repoFilter !== "all") {
      filters.repoId = parseInt(repoFilter);
    }

    loadReports(filters);
  }, [currentPage, statusFilter, repoFilter]);

  // Filter by search query (client-side)
  const filteredReports = reports.filter(report => {
    if (!searchQuery) return true;
    const repoName = report.repository?.name?.toLowerCase() || '';
    return repoName.includes(searchQuery.toLowerCase());
  });

  const getStatusBadge = (status: AnalysisStatus) => {
    switch (status) {
      case "completed":
        return <Badge variant="secondary" className="gap-1 bg-success/10 text-success border-success/20"><CheckCircle className="w-3 h-3" />Completed</Badge>;
      case "running":
        return <Badge variant="default" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" />Running</Badge>;
      case "failed":
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Failed</Badge>;
      case "pending":
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
      default:
        return null;
    }
  };

  const getReportSeverityStatus = (report: Report): 'critical' | 'warning' | 'safe' => {
    if (!report.total_findings || report.total_findings === 0) return 'safe';
    // This is a simplified calculation - adjust based on your needs
    if (report.total_findings >= 10) return 'critical';
    if (report.total_findings >= 5) return 'warning';
    return 'safe';
  };

  const handleExport = async (analysisId: number) => {
    try {
      await downloadReport(analysisId, 'pdf');
    } catch (error) {
      // Error already handled by hook
    }
  };

  // Calculate summary stats
  const stats = {
    total: pagination.totalItems,
    completed: reports.filter(r => r.status === 'completed').length,
    running: reports.filter(r => r.status === 'running').length,
    failed: reports.filter(r => r.status === 'failed').length,
  };

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Reports" },
      ]}
    >
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Reports</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your vulnerability analysis reports
          </p>
        </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
        
        <Card className="border-success/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{stats.completed}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully analyzed</p>
          </CardContent>
        </Card>
        
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.running}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently scanning</p>
          </CardContent>
        </Card>
        
        <Card className="border-destructive/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats.failed}</div>
            <p className="text-xs text-muted-foreground mt-1">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Select value={repoFilter} onValueChange={setRepoFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by repository" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Repositories</SelectItem>
            {repositories?.map((repo) => (
              <SelectItem key={repo.id} value={repo.id}>
                {repo.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => loadReports({ page: currentPage })}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="space-y-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-6 w-12" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-32" />
                  <Skeleton className="h-9 w-32" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredReports.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No reports found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery || statusFilter !== "all" || repoFilter !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Start by scanning a repository to generate your first report"}
            </p>
            {!searchQuery && statusFilter === "all" && repoFilter === "all" && (
              <Button onClick={() => navigate("/repositories")}>
                Go to Repositories
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <Card key={report.analysis_id} className="hover:border-primary/50 transition-all hover:shadow-sm">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">
                            {report.repository?.name || `Analysis #${report.analysis_id}`}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Calendar className="w-3 h-3" />
                            {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusBadge(report.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-secondary/50 rounded-lg border border-border">
                        <div className="text-xs text-muted-foreground mb-1">Files Scanned</div>
                        <div className="text-2xl font-bold text-foreground">{report.total_files || 0}</div>
                      </div>
                      <div className="p-3 bg-secondary/50 rounded-lg border border-border">
                        <div className="text-xs text-muted-foreground mb-1">Code Chunks</div>
                        <div className="text-2xl font-bold text-foreground">{report.total_chunks || 0}</div>
                      </div>
                      <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
                        <div className="text-xs text-muted-foreground mb-1">Findings</div>
                        <div className="text-2xl font-bold text-warning">{report.total_findings || 0}</div>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <div className="text-xs text-muted-foreground mb-1">Language</div>
                        <div className="text-sm font-bold text-primary truncate">
                          {report.repository?.language || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="flex-1 sm:flex-none"
                        onClick={() => navigate(`/reports/${report.analysis_id}`)}
                        disabled={report.status !== 'completed'}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleExport(report.analysis_id)}
                        disabled={report.status !== 'completed'}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                {Math.min(currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                {pagination.totalItems} reports
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isLoading}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        disabled={isLoading}
                      >
                        {page}
                      </Button>
                    );
                  })}
                  {pagination.totalPages > 5 && (
                    <span className="px-2 text-muted-foreground">...</span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage === pagination.totalPages || isLoading}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </PageLayout>
  );
};

export default Reports;
