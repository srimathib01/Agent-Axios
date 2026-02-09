import { useState } from "react";
import { Plus, Search, Star, GitFork, Clock, AlertCircle, CheckCircle, Play, Trash2, Edit, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useRepositories } from "@/hooks/useRepositories";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import type { Repository } from "@/services/api";
import { PageLayout } from "@/components/layout/PageLayout";

export default function Repositories() {
  const { 
    repositories, 
    isLoading, 
    pagination,
    loadRepositories,
    addNewRepository,
    updateRepo,
    deleteRepo,
    startScan,
    toggleStar,
  } = useRepositories({ autoLoad: true });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [scanningRepos, setScanningRepos] = useState<Set<string>>(new Set());

  // Add repository form state
  const [newRepoData, setNewRepoData] = useState({
    name: "",
    url: "",
    description: "",
    defaultBranch: "main",
    autoScan: false,
    scanFrequency: "weekly" as "daily" | "weekly" | "monthly",
  });

  // Edit repository form state
  const [editRepoData, setEditRepoData] = useState({
    description: "",
    defaultBranch: "main",
    autoScan: false,
    scanFrequency: "weekly" as "daily" | "weekly" | "monthly",
  });

  // Filter repositories
  const filteredRepositories = repositories?.filter((repo) => {
    const matchesSearch = 
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || repo.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const handleAddRepository = async () => {
    if (!newRepoData.name || !newRepoData.url) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      await addNewRepository({
        name: newRepoData.name,
        url: newRepoData.url,
        description: newRepoData.description,
      });
      toast.success("Repository added successfully");
      setIsAddDialogOpen(false);
      setNewRepoData({
        name: "",
        url: "",
        description: "",
        defaultBranch: "main",
        autoScan: false,
        scanFrequency: "weekly",
      });
    } catch (error: any) {
      // Error already handled by the hook
    }
  };

  const handleEditRepository = async () => {
    if (!selectedRepo) return;

    try {
      await updateRepo(selectedRepo.id, editRepoData);
      toast.success("Repository updated successfully");
      setIsEditDialogOpen(false);
      setSelectedRepo(null);
    } catch (error: any) {
      // Error already handled by the hook
    }
  };

  const handleDeleteRepository = async () => {
    if (!selectedRepo) return;

    try {
      await deleteRepo(selectedRepo.id);
      toast.success("Repository deleted successfully");
      setDeleteConfirmOpen(false);
      setSelectedRepo(null);
    } catch (error: any) {
      // Error already handled by the hook
    }
  };

  const handleStarToggle = async (repo: Repository) => {
    try {
      await toggleStar(repo.id, !repo.starred);
    } catch (error: any) {
      // Error already handled by the hook
    }
  };

  const handleTriggerScan = async (repo: Repository) => {
    setScanningRepos(prev => new Set(prev).add(repo.id));
    try {
      await startScan(repo.id, { branch: repo.defaultBranch });
      toast.success("Scan started successfully", {
        description: `Scanning ${repo.name}...`,
      });
    } catch (error: any) {
      // Error already handled by the hook
    } finally {
      setScanningRepos(prev => {
        const newSet = new Set(prev);
        newSet.delete(repo.id);
        return newSet;
      });
    }
  };

  const openEditDialog = (repo: Repository) => {
    setSelectedRepo(repo);
    setEditRepoData({
      description: repo.description || "",
      defaultBranch: repo.defaultBranch,
      autoScan: repo.autoScan,
      scanFrequency: repo.scanFrequency,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (repo: Repository) => {
    setSelectedRepo(repo);
    setDeleteConfirmOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case "critical":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Repositories" },
      ]}
    >
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Repositories</h1>
            <p className="text-muted-foreground mt-1">
              Manage your connected repositories and trigger security scans
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Repository
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Repository</DialogTitle>
              <DialogDescription>
                Connect a Git repository to start scanning for vulnerabilities
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="repo-name">Repository Name *</Label>
                <Input
                  id="repo-name"
                  placeholder="my-awesome-project"
                  value={newRepoData.name}
                  onChange={(e) => setNewRepoData({ ...newRepoData, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="repo-url">Repository URL *</Label>
                <Input
                  id="repo-url"
                  placeholder="https://github.com/username/repo"
                  value={newRepoData.url}
                  onChange={(e) => setNewRepoData({ ...newRepoData, url: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="repo-description">Description</Label>
                <Input
                  id="repo-description"
                  placeholder="Brief description of the repository"
                  value={newRepoData.description}
                  onChange={(e) => setNewRepoData({ ...newRepoData, description: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="repo-branch">Default Branch</Label>
                <Input
                  id="repo-branch"
                  placeholder="main"
                  value={newRepoData.defaultBranch}
                  onChange={(e) => setNewRepoData({ ...newRepoData, defaultBranch: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="scan-frequency">Scan Frequency</Label>
                <Select
                  value={newRepoData.scanFrequency}
                  onValueChange={(value: "daily" | "weekly" | "monthly") =>
                    setNewRepoData({ ...newRepoData, scanFrequency: value })
                  }
                >
                  <SelectTrigger id="scan-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddRepository}>Add Repository</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search repositories..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="healthy">Healthy</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => loadRepositories()}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Repository Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="h-9 w-9" />
                  <Skeleton className="h-9 w-9" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRepositories.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GitFork className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No repositories found</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by adding your first repository"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Repository
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRepositories.map((repo) => (
            <Card key={repo.id} className="group hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <span className="truncate">{repo.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => handleStarToggle(repo)}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            repo.starred
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      </Button>
                    </CardTitle>
                    <CardDescription className="truncate mt-1">
                      {repo.description || repo.url}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {getStatusIcon(repo.status)}
                  <Badge variant="secondary" className={getStatusColor(repo.status)}>
                    {repo.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Vulnerability Stats */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <div className="font-semibold text-red-600">{repo.vulnerabilities.critical}</div>
                    <div className="text-muted-foreground">Critical</div>
                  </div>
                  <div>
                    <div className="font-semibold text-orange-600">{repo.vulnerabilities.high}</div>
                    <div className="text-muted-foreground">High</div>
                  </div>
                  <div>
                    <div className="font-semibold text-yellow-600">{repo.vulnerabilities.medium}</div>
                    <div className="text-muted-foreground">Medium</div>
                  </div>
                  <div>
                    <div className="font-semibold text-blue-600">{repo.vulnerabilities.low}</div>
                    <div className="text-muted-foreground">Low</div>
                  </div>
                </div>

                {/* Meta Info */}
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <GitFork className="w-3 h-3" />
                      {repo.forks}
                    </span>
                    <span>{repo.language || "Unknown"}</span>
                  </div>
                  {repo.lastScan && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(repo.lastScan), { addSuffix: true })}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleTriggerScan(repo)}
                    disabled={scanningRepos.has(repo.id)}
                  >
                    {scanningRepos.has(repo.id) ? (
                      <>
                        <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 mr-2" />
                        Scan Now
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(repo)}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDeleteDialog(repo)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Repository</DialogTitle>
            <DialogDescription>
              Update repository settings and configuration
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                placeholder="Brief description"
                value={editRepoData.description}
                onChange={(e) => setEditRepoData({ ...editRepoData, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-branch">Default Branch</Label>
              <Input
                id="edit-branch"
                value={editRepoData.defaultBranch}
                onChange={(e) => setEditRepoData({ ...editRepoData, defaultBranch: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-frequency">Scan Frequency</Label>
              <Select
                value={editRepoData.scanFrequency}
                onValueChange={(value: "daily" | "weekly" | "monthly") =>
                  setEditRepoData({ ...editRepoData, scanFrequency: value })
                }
              >
                <SelectTrigger id="edit-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditRepository}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the repository "{selectedRepo?.name}" and all
              associated scan data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRepository}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </PageLayout>
  );
}
