import { Home, Star, User, Plus, Shield, TrendingUp, FileText, Settings, FolderGit2, Loader2, Scan } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRepositories } from "@/hooks/useRepositories";
import { useEffect, useState } from "react";
import { getDashboardOverview } from "@/services/api";

const navigationItems = [
  { id: 1, title: "Dashboard", icon: Home, path: "/dashboard" },
  { id: 2, title: "New Analysis", icon: Scan, path: "/analyze" },
  { id: 3, title: "Repositories", icon: FolderGit2, path: "/repositories" },
  { id: 4, title: "Reports", icon: FileText, path: "/reports" },
  { id: 5, title: "Settings", icon: Settings, path: "/settings" },
];

export function DashboardSidebar() {
  const { open } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();
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

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <div className="h-16 px-4 border-b border-sidebar-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
            <Shield className="w-4 h-4 text-primary-foreground" />
          </div>
          {open && (
            <span className="font-semibold text-sidebar-foreground truncate">CVE Analyzer</span>
          )}
        </div>
        <SidebarTrigger className="flex-shrink-0" />
      </div>

      <SidebarContent className="flex flex-col h-[calc(100vh-4rem)]">
        {/* New Analysis Button */}
        <div className="p-3 flex-shrink-0">
          <Button 
            onClick={() => navigate("/analyze")}
            className="w-full bg-primary hover:bg-primary-hover text-primary-foreground shadow-sm transition-all justify-start"
            size={open ? "default" : "icon"}
          >
            <Plus className={`w-4 h-4 ${open ? "mr-2" : ""}`} />
            {open && "New Analysis"}
          </Button>
        </div>

        {/* Navigation Items */}
        <div className="px-3 pb-3 flex-shrink-0">
          <SidebarMenu>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton 
                    onClick={() => navigate(item.path)}
                    className={`transition-colors ${
                      isActive 
                        ? "bg-sidebar-accent text-sidebar-foreground font-medium" 
                        : "hover:bg-sidebar-accent/50"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${open ? "mr-3" : ""} flex-shrink-0`} />
                    {open && <span className="truncate">{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </div>

        {/* Stats Section */}
        {open && (
          <div className="px-3 pb-3 flex-shrink-0">
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-4 border border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-sidebar-foreground">Overview</span>
              </div>
              {statsLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="h-7 bg-muted animate-pulse rounded mb-1" />
                    <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                  </div>
                  <div>
                    <div className="h-7 bg-muted animate-pulse rounded mb-1" />
                    <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-2xl font-bold text-sidebar-foreground">{stats.analyses}</div>
                    <div className="text-xs text-muted-foreground">Analyses</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-sidebar-foreground">{stats.repositories}</div>
                    <div className="text-xs text-muted-foreground">Repositories</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 px-3">
          <div className="space-y-4 pb-4">
            {/* Starred Repositories */}
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center gap-2 px-2">
                <Star className="w-4 h-4 flex-shrink-0" />
                {open && <span>Starred Repositories</span>}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {reposLoading ? (
                  <div className="px-2 py-4">
                    {open ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="space-y-1">
                            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                            <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
                    )}
                  </div>
                ) : starredRepos.length > 0 ? (
                  <SidebarMenu>
                    {starredRepos.map((repo) => (
                      <SidebarMenuItem key={repo.id}>
                        <SidebarMenuButton 
                          onClick={() => navigate(`/repositories/${repo.id}`)}
                          className="hover:bg-sidebar-accent transition-colors h-auto py-2"
                        >
                          {open ? (
                            <div className="flex flex-col gap-1 flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium truncate">{repo.name}</span>
                                <span className="text-xs text-muted-foreground shrink-0">{repo.stars} ⭐</span>
                              </div>
                              {repo.lastScan && (
                                <span className="text-xs text-muted-foreground">
                                  Last scan: {new Date(repo.lastScan).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Star className="w-4 h-4 fill-primary text-primary" />
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                ) : (
                  <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                    {open ? 'No starred repositories' : <Star className="w-4 h-4 mx-auto opacity-30" />}
                  </div>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        </ScrollArea>

        {/* User Profile */}
        <div className="p-3 border-t border-sidebar-border flex-shrink-0">
          <div className="bg-sidebar-accent rounded-lg p-3">
            {authLoading ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted animate-pulse rounded-full flex-shrink-0" />
                {open && (
                  <div className="flex-1 space-y-1">
                    <div className="h-4 bg-muted animate-pulse rounded w-24" />
                    <div className="h-3 bg-muted animate-pulse rounded w-16" />
                  </div>
                )}
              </div>
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.firstName} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-primary" />
                  )}
                </div>
                {open && (
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-sidebar-foreground truncate">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                {open && (
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-sidebar-foreground">Guest</div>
                    <div className="text-xs text-muted-foreground">Not logged in</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
