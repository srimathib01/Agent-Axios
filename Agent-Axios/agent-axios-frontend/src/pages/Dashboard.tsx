import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  Shield, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  FileText,
  Activity,
  ArrowRight,
  GitBranch,
  Bug
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";

const Dashboard = () => {
  const navigate = useNavigate();

  // Mock dashboard data
  const stats = [
    {
      title: "Total Scans",
      value: "24",
      change: "+12%",
      trend: "up",
      icon: Activity,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-950"
    },
    {
      title: "Vulnerabilities Found",
      value: "87",
      change: "+23%",
      trend: "up",
      icon: Bug,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-950"
    },
    {
      title: "Repositories",
      value: "12",
      change: "+3",
      trend: "up",
      icon: GitBranch,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-950"
    },
    {
      title: "Reports Generated",
      value: "18",
      change: "+8",
      trend: "up",
      icon: FileText,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-950"
    }
  ];

  const recentAnalyses = [
    {
      id: 1,
      repo: "flask-security-api",
      vulnerabilities: 3,
      severity: "CRITICAL",
      date: "2 hours ago",
      status: "completed"
    },
    {
      id: 2,
      repo: "react-dashboard-app",
      vulnerabilities: 1,
      severity: "MEDIUM",
      date: "5 hours ago",
      status: "completed"
    },
    {
      id: 3,
      repo: "nodejs-backend",
      vulnerabilities: 5,
      severity: "HIGH",
      date: "1 day ago",
      status: "completed"
    },
    {
      id: 4,
      repo: "python-ml-service",
      vulnerabilities: 2,
      severity: "HIGH",
      date: "2 days ago",
      status: "completed"
    }
  ];

  const severityColors = {
    CRITICAL: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950",
    HIGH: "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950",
    MEDIUM: "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-950",
    LOW: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950"
  };

  return (
    <PageLayout breadcrumbs={[{ label: "Dashboard" }]}>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Security Dashboard</h1>
          <p className="text-muted-foreground">Monitor your application security and vulnerability analysis</p>
        </div>

        {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">
                            {stat.title}
                          </p>
                          <h3 className="text-3xl font-bold text-foreground mb-2">
                            {stat.value}
                          </h3>
                          <div className="flex items-center gap-1 text-sm">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="text-green-600 font-medium">{stat.change}</span>
                            <span className="text-muted-foreground">vs last month</span>
                          </div>
                        </div>
                        <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                          <Icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Action Card */}
              <Card className="p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold mb-2">Start New Security Analysis</h3>
                    <p className="text-indigo-100 mb-4">
                      Scan your repository for vulnerabilities using AI-powered detection
                    </p>
                    <Button 
                      onClick={() => navigate('/analyze')}
                      className="bg-white text-indigo-600 hover:bg-indigo-50"
                    >
                      Start Analysis
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                  <Shield className="w-24 h-24 opacity-20" />
                </div>
              </Card>

              {/* Recent Analyses */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-foreground">Recent Analyses</h2>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate('/reports')}
                  >
                    View All
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {recentAnalyses.map((analysis) => (
                    <div 
                      key={analysis.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => navigate('/reports')}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-2 rounded-lg bg-accent">
                          <GitBranch className="w-5 h-5 text-accent-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground truncate">
                            {analysis.repo}
                          </h4>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {analysis.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Bug className="w-3 h-3" />
                              {analysis.vulnerabilities} issues
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${severityColors[analysis.severity as keyof typeof severityColors]}`}>
                          {analysis.severity}
                        </span>
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Severity Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-foreground mb-6">Vulnerability Severity</h2>
                  <div className="space-y-4">
                    {[
                      { label: "Critical", count: 12, percentage: 14, color: "bg-red-500" },
                      { label: "High", count: 28, percentage: 32, color: "bg-orange-500" },
                      { label: "Medium", count: 31, percentage: 36, color: "bg-yellow-500" },
                      { label: "Low", count: 16, percentage: 18, color: "bg-green-500" }
                    ].map((item, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">{item.label}</span>
                          <span className="text-sm text-muted-foreground">{item.count} ({item.percentage}%)</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div 
                            className={`${item.color} h-2 rounded-full transition-all`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="text-xl font-bold text-foreground mb-6">Quick Stats</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
                          <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium text-foreground">Avg. Scan Time</span>
                      </div>
                      <span className="text-xl font-bold text-foreground">42s</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950">
                          <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="font-medium text-foreground">Security Score</span>
                      </div>
                      <span className="text-xl font-bold text-foreground">78/100</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950">
                          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="font-medium text-foreground">Fixed Issues</span>
                      </div>
                      <span className="text-xl font-bold text-foreground">64</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950">
                          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <span className="font-medium text-foreground">Open Issues</span>
                      </div>
                      <span className="text-xl font-bold text-foreground">23</span>
                    </div>
                  </div>
                </Card>
              </div>
      </div>
    </PageLayout>
  );
};

export default Dashboard;
