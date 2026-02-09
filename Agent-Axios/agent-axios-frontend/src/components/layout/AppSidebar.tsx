import { 
  Home, 
  Shield, 
  FolderGit2, 
  FileText, 
  Settings, 
  Scan,
  Star,
  TrendingUp,
  Plus,
  Loader2,
  ChevronRight,
  Activity,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRepositories } from "@/hooks/useRepositories";
import { useEffect, useState } from "react";
import { getDashboardOverview } from "@/services/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigationItems = [
  { id: 1, title: "Dashboard", icon: Home, path: "/dashboard" },
  { id: 2, title: "New Analysis", icon: Scan, path: "/analyze" },
  // { id: 3, title: "Real-Time Analysis", icon: Activity, path: "/analyze-realtime" },
  { id: 4, title: "Repositories", icon: FolderGit2, path: "/repositories" },
  { id: 5, title: "Reports", icon: FileText, path: "/reports" },
  { id: 6, title: "Settings", icon: Settings, path: "/settings" },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { repositories, isLoading: reposLoading } = useRepositories({ autoLoad: true });
  const [stats, setStats] = useState({ analyses: 0, repositories: 0 });
  const [statsLoading, setStatsLoading] = useState(false);

  // Load dashboard stats
  useEffect(() => {
    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const response = await getDashboardOverview();
        if (response.success && response.data) {
          setStats({
            analyses: response.data.scans?.total || 0,
            repositories: response.data.repositories?.total || 0,
          });
        }
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };
    loadStats();
  }, []);

  // Get starred repositories
  const starredRepos = repositories?.filter(repo => repo.starred).slice(0, 5) || [];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-sm">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 overflow-hidden">
            <span className="font-semibold text-sidebar-foreground">Agent Axios</span>
            <p className="text-xs text-muted-foreground">CVE Analysis Platform</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Quick Action */}
        <SidebarGroup>
          <SidebarGroupContent>
            <Button 
              onClick={() => navigate("/analyze")}
              className="w-full justify-start bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Analysis
            </Button>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton 
                      onClick={() => navigate(item.path)}
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Stats Overview */}
        <SidebarGroup>
          <SidebarGroupLabel>
            <TrendingUp className="mr-2 h-4 w-4" />
            Overview
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {statsLoading ? (
              <div className="px-3 py-2 space-y-2">
                <div className="h-12 bg-muted animate-pulse rounded-md" />
                <div className="h-12 bg-muted animate-pulse rounded-md" />
              </div>
            ) : (
              <div className="grid gap-2 px-3 py-2">
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-2xl font-bold text-foreground">{stats.analyses}</div>
                  <div className="text-xs text-muted-foreground">Total Analyses</div>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-2xl font-bold text-foreground">{stats.repositories}</div>
                  <div className="text-xs text-muted-foreground">Repositories</div>
                </div>
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Starred Repositories */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>
            <Star className="mr-2 h-4 w-4" />
            Starred Repositories
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <ScrollArea className="h-[200px]">
              {reposLoading ? (
                <div className="px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : starredRepos.length > 0 ? (
                <SidebarMenu>
                  {starredRepos.map((repo) => (
                    <SidebarMenuItem key={repo.id}>
                      <SidebarMenuButton 
                        onClick={() => navigate(`/repositories/${repo.id}`)}
                        className="h-auto py-2"
                      >
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{repo.name}</span>
                            <Star className="h-3 w-3 fill-primary text-primary" />
                          </div>
                          {repo.lastScan && (
                            <span className="text-xs text-muted-foreground">
                              Last scan: {new Date(repo.lastScan).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              ) : (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No starred repositories
                </div>
              )}
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-12">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar} alt={`${user?.firstName} ${user?.lastName}`} />
                    <AvatarFallback>
                      {user?.firstName?.substring(0, 1).toUpperCase()}
                      {user?.lastName?.substring(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start flex-1 overflow-hidden">
                    <span className="text-sm font-medium truncate">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  );
}
