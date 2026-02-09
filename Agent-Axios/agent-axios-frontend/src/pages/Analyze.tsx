import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  GitBranch, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  Download,
  ArrowRight,
  FileSearch,
  Database,
  Brain,
  Bug,
  FileText,
  Clock,
  Zap,
  Sparkles,
  Activity,
  Search,
  Code2,
  Scan,
  Target,
  TrendingUp,
  CircleDot,
  Layers,
  Lock,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { nodeBackendService, type StreamEvent } from '@/services/nodeBackend';
import { PageLayout } from '@/components/layout/PageLayout';

interface AnalysisEvent {
  id: number;
  type: 'tool' | 'progress' | 'message' | 'error';
  toolName?: string;
  message: string;
  timestamp: Date;
  icon: React.ReactNode;
  status: 'active' | 'completed' | 'error';
}

const TOOL_ICONS: Record<string, React.ReactNode> = {
  clone_repository: <GitBranch className="w-4 h-4" />,
  build_codebase_index: <Database className="w-4 h-4" />,
  analyze_repository_structure: <FileSearch className="w-4 h-4" />,
  search_codebase_semantically: <Code2 className="w-4 h-4" />,
  search_cve_database: <Shield className="w-4 h-4" />,
  validate_vulnerability_match: <Brain className="w-4 h-4" />,
  record_finding: <Bug className="w-4 h-4" />,
  generate_vulnerability_report: <FileText className="w-4 h-4" />,
  default: <Activity className="w-4 h-4" />,
};

export default function Analyze() {
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [events, setEvents] = useState<AnalysisEvent[]>([]);
  const [vulnerabilityCount, setVulnerabilityCount] = useState(0);
  const [analysisTime, setAnalysisTime] = useState(0);
  const [reportData, setReportData] = useState<any>(null);
  const [aiResponse, setAiResponse] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const eventIdRef = useRef(1);
  const timerRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<Date>();
  const scrollRef = useRef<HTMLDivElement>(null);

  const addEvent = (
    type: AnalysisEvent['type'],
    message: string,
    toolName?: string,
    status: AnalysisEvent['status'] = 'active'
  ) => {
    const icon = toolName ? TOOL_ICONS[toolName] || TOOL_ICONS.default : TOOL_ICONS.default;
    
    setEvents((prev) => [
      ...prev,
      {
        id: eventIdRef.current++,
        type,
        toolName,
        message,
        timestamp: new Date(),
        icon,
        status,
      },
    ]);

    // Auto-scroll to bottom
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  const updateLastEvent = (status: AnalysisEvent['status']) => {
    setEvents((prev) => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[updated.length - 1].status = status;
      }
      return updated;
    });
  };

  const startAnalysis = async () => {
    if (!repoUrl.trim()) {
      alert('Please enter a repository URL');
      return;
    }

    setIsAnalyzing(true);
    setIsComplete(false);
    setCurrentProgress(0);
    setEvents([]);
    setAiResponse('');
    setVulnerabilityCount(0);
    setConversationId(null);
    setReportData(null);
    eventIdRef.current = 1;
    startTimeRef.current = new Date();

    // Start timer
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000);
        setAnalysisTime(elapsed);
      }
    }, 1000);

    try {
      let progressStep = 0;
      const totalSteps = 50; // Estimated total steps

      for await (const event of nodeBackendService.analyzeRepository(repoUrl)) {
        progressStep++;
        const progress = Math.min((progressStep / totalSteps) * 100, 95);
        setCurrentProgress(progress);

        if (event.type === 'session_created') {
          setConversationId(event.data.conversationId);
          addEvent('message', `Started conversation: ${event.data.conversationId}`, undefined, 'completed');
        } else if (event.type === 'tool_start') {
          addEvent('tool', `Executing: ${event.toolName}`, event.toolName, 'active');
          console.log('Tool started:', event.toolName, event.toolInput);
        } else if (event.type === 'tool_end') {
          updateLastEvent('completed');
          console.log('Tool completed:', event.toolName);
        } else if (event.type === 'custom') {
          addEvent('progress', event.content || 'Processing...', undefined, 'active');
          updateLastEvent('completed');
          
          // Count vulnerabilities
          if (event.content?.includes('CVE-') || event.content?.toLowerCase().includes('vulnerability')) {
            setVulnerabilityCount((prev) => prev + 1);
          }
        } else if (event.type === 'token') {
          setAiResponse((prev) => prev + event.content);
        } else if (event.type === 'error') {
          addEvent('error', `Error: ${event.error}`, undefined, 'error');
        } else if (event.type === 'done') {
          setCurrentProgress(100);
          setIsComplete(true);
          addEvent('message', '✅ Analysis completed successfully!', undefined, 'completed');
          
          // Create report data from AI response
          if (aiResponse) {
            setReportData({
              executiveSummary: aiResponse,
              vulnerabilities: [],
              remediationPriority: []
            });
          }
        }
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      addEvent('error', `Analysis failed: ${error.message}`, undefined, 'error');
      setCurrentProgress(0);
    } finally {
      setIsAnalyzing(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const stopAnalysis = () => {
    setIsAnalyzing(false);
    addEvent('message', '⚠️ Analysis stopped by user', undefined, 'error');
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const downloadReport = () => {
    if (!aiResponse && !reportData) {
      alert('No report data available');
      return;
    }

    try {
      // Create a text report
      const reportText = `Security Analysis Report
${'='.repeat(50)}

Repository: ${repoUrl}
Analysis Date: ${new Date().toLocaleString()}
Duration: ${analysisTime}s
Vulnerabilities Found: ${vulnerabilityCount}

${'='.repeat(50)}

ANALYSIS SUMMARY
${'-'.repeat(50)}

${aiResponse || reportData?.executiveSummary || 'No summary available'}

${'='.repeat(50)}

Generated by Agent-Axios
`;

      const blob = new Blob([reportText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'repository';
      link.download = `security-analysis-${repoName}-${Date.now()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    }
  };

  const resetAnalysis = () => {
    setRepoUrl('');
    setIsAnalyzing(false);
    setIsComplete(false);
    setEvents([]);
    setCurrentProgress(0);
    setVulnerabilityCount(0);
    setAnalysisTime(0);
    setReportData(null);
    setAiResponse('');
    setConversationId(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Security Analysis" },
      ]}
    >
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 relative">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      
      {/* Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="container max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-3 mb-6 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <div className="relative">
              <Shield className="w-5 h-5 text-primary" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            </div>
            <span className="text-sm font-medium text-primary">AI-Powered Security</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-foreground via-primary to-secondary bg-clip-text text-transparent">
            Repository Security Analysis
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Advanced vulnerability detection powered by <span className="font-semibold text-primary">Azure GPT-4</span> and autonomous security agents
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            {[
              { icon: <Brain className="w-4 h-4" />, label: "AI Agent" },
              { icon: <Database className="w-4 h-4" />, label: "CVE Database" },
              { icon: <Scan className="w-4 h-4" />, label: "Real-time Scan" },
              { icon: <Lock className="w-4 h-4" />, label: "Secure Analysis" }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * i }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border shadow-sm"
              >
                <div className="text-primary">{feature.icon}</div>
                <span className="text-sm font-medium">{feature.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {!isAnalyzing && !isComplete ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="grid lg:grid-cols-3 gap-6 mb-8">
                {/* Main Input Card */}
                <Card className="lg:col-span-2 shadow-xl border-2 hover:border-primary/50 transition-all duration-300">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-2xl">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <GitBranch className="w-6 h-6 text-primary" />
                      </div>
                      Repository Input
                    </CardTitle>
                    <CardDescription>
                      Enter your GitHub repository URL to start comprehensive security analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          type="url"
                          placeholder="https://github.com/username/repository"
                          value={repoUrl}
                          onChange={(e) => setRepoUrl(e.target.value)}
                          className="h-14 pl-12 text-base border-2 focus-visible:ring-2 focus-visible:ring-primary"
                          onKeyDown={(e) => e.key === 'Enter' && startAnalysis()}
                        />
                      </div>
                      
                      <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        <Activity className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                        <p>Our AI agent will clone, analyze, and scan your repository for known vulnerabilities using the latest CVE database</p>
                      </div>
                    </div>

                    <Button
                      onClick={isAnalyzing ? stopAnalysis : startAnalysis}
                      disabled={!repoUrl.trim() && !isAnalyzing}
                      className="w-full h-14 text-base font-semibold shadow-lg transition-all duration-300 hover:scale-[1.02]"
                      size="lg"
                      variant={isAnalyzing ? 'destructive' : 'default'}
                    >
                      {isAnalyzing ? (
                        <>
                          <XCircle className="mr-2 w-5 h-5" />
                          Stop Analysis
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 w-5 h-5" />
                          Start Security Analysis
                          <ArrowRight className="ml-2 w-5 h-5" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Stats Card */}
                <Card className="shadow-xl bg-gradient-to-br from-primary/10 via-card to-secondary/10">
                  <CardHeader>
                    <CardTitle className="text-lg">Analysis Capabilities</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { icon: <Target className="w-5 h-5" />, label: "CVE Detection", desc: "Known vulnerabilities" },
                      { icon: <Code2 className="w-5 h-5" />, label: "Code Analysis", desc: "Deep semantic scan" },
                      { icon: <Brain className="w-5 h-5" />, label: "AI Validation", desc: "GPT-4 powered" },
                      { icon: <FileText className="w-5 h-5" />, label: "Detailed Report", desc: "PDF generation" }
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * i }}
                        className="flex items-start gap-3 p-3 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50"
                      >
                        <div className="p-2 rounded-md bg-primary/10 text-primary">
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Info Banner */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="max-w-4xl mx-auto"
              >
                <Card className="bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 border-primary/20">
                  <CardContent className="py-4">
                    <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-full bg-primary/20">
                          <Zap className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="font-medium">Fast Analysis</span>
                      </div>
                      <Separator orientation="vertical" className="h-4" />
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-full bg-primary/20">
                          <Shield className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="font-medium">Secure & Private</span>
                      </div>
                      <Separator orientation="vertical" className="h-4" />
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-full bg-primary/20">
                          <TrendingUp className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="font-medium">AI-Powered Accuracy</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          ) : isAnalyzing ? (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid lg:grid-cols-3 gap-6"
            >
              {/* Left Column - Progress & Stats */}
              <div className="lg:col-span-1 space-y-6">
                {/* Progress Card */}
                <Card className="shadow-xl border-2 border-primary/20 overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-primary via-secondary to-primary animate-gradient-x" />
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="relative">
                        <Scan className="w-5 h-5 text-primary animate-pulse" />
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                      </div>
                      Analysis Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Completion</span>
                        <Badge variant="outline" className="font-mono font-bold text-base">
                          {currentProgress}%
                        </Badge>
                      </div>
                      <Progress value={currentProgress} className="h-3" />
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <div className="flex items-center gap-2 text-primary mb-1">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs font-medium">Time</span>
                        </div>
                        <p className="text-2xl font-bold font-mono">{analysisTime}s</p>
                      </div>
                      
                      <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20">
                        <div className="flex items-center gap-2 text-secondary mb-1">
                          <Layers className="w-4 h-4" />
                          <span className="text-xs font-medium">Events</span>
                        </div>
                        <p className="text-2xl font-bold font-mono">{events.length}</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground truncate mb-1">Repository</p>
                      <p className="text-sm font-medium truncate">{repoUrl}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Conversation Info Card */}
                {conversationId && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <Card className="shadow-xl border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Activity className="w-8 h-8 text-blue-500 animate-pulse" />
                            <Sparkles className="w-4 h-4 text-blue-400 absolute -top-1 -right-1" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-blue-600 dark:text-blue-400">Live Session Active</p>
                            <p className="text-xs text-muted-foreground truncate">{conversationId}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>

              {/* Right Column - Events Timeline */}
              <Card className="lg:col-span-2 shadow-xl max-h-[700px] overflow-hidden flex flex-col">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Live Analysis Stream
                  </CardTitle>
                  <CardDescription>
                    Real-time security analysis events and findings
                  </CardDescription>
                </CardHeader>
                <CardContent 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto pt-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                >
                  <div className="space-y-3">
                    <AnimatePresence>
                      {events.map((event, index) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.3 }}
                          className={cn(
                            "flex items-start gap-4 p-4 rounded-xl transition-all duration-300 border-2",
                            event.status === 'active' && "bg-primary/5 border-primary/30 shadow-lg shadow-primary/10",
                            event.status === 'completed' && "bg-muted/30 border-border opacity-70 hover:opacity-100"
                          )}
                        >
                          <div className={cn(
                            "p-2.5 rounded-lg shrink-0 transition-all duration-300",
                            event.status === 'active' && "bg-primary text-primary-foreground shadow-lg shadow-primary/50 scale-110",
                            event.status === 'completed' && "bg-muted text-muted-foreground"
                          )}>
                            {event.status === 'active' ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <div className="w-5 h-5">{event.icon}</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-sm font-semibold leading-tight">
                                {event.message}
                              </p>
                              {event.status === 'active' && (
                                <Badge variant="default" className="shrink-0 animate-pulse">
                                  Active
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="font-mono">{event.timestamp.toLocaleTimeString()}</span>
                              {event.toolName && (
                                <>
                                  <span>•</span>
                                  <span className="capitalize">{event.toolName.replace(/_/g, ' ')}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="grid lg:grid-cols-5 gap-6">
                {/* Results Summary */}
                <div className="lg:col-span-3 space-y-6">
                  <Card className="shadow-xl border-2 border-green-500/20 overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500" />
                    <CardContent className="pt-8">
                      <div className="text-center space-y-6">
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 200, damping: 15 }}
                          className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-2xl shadow-green-500/50"
                        >
                          <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={3} />
                        </motion.div>

                        <div>
                          <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                            Analysis Complete!
                          </h2>
                          <p className="text-muted-foreground text-lg">
                            Completed in <span className="font-semibold text-foreground">{analysisTime} seconds</span>
                          </p>
                        </div>

                        <Separator />

                        {/* Vulnerability Count */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className={cn(
                            "p-8 rounded-2xl border-2 relative overflow-hidden",
                            vulnerabilityCount > 0 
                              ? "bg-gradient-to-br from-red-500/10 via-orange-500/10 to-yellow-500/10 border-red-500/30" 
                              : "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30"
                          )}
                        >
                          <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
                          <div className="relative z-10">
                            <div className="flex items-center justify-center gap-4 mb-4">
                              {vulnerabilityCount > 0 ? (
                                <AlertTriangle className="w-12 h-12 text-red-500" strokeWidth={2.5} />
                              ) : (
                                <Shield className="w-12 h-12 text-green-500" strokeWidth={2.5} />
                              )}
                              <span className={cn(
                                "text-7xl font-black",
                                vulnerabilityCount > 0 
                                  ? "bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent"
                                  : "bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent"
                              )}>
                                {vulnerabilityCount}
                              </span>
                            </div>
                            <p className="text-xl font-bold mb-2">
                              {vulnerabilityCount === 0 ? 'No Vulnerabilities Found' : 
                               vulnerabilityCount === 1 ? 'Vulnerability Detected' : 'Vulnerabilities Detected'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {vulnerabilityCount > 0 
                                ? 'Security issues requiring attention identified'
                                : 'Your codebase appears to be secure'}
                            </p>
                          </div>
                        </motion.div>

                        {/* Actions */}
                        <div className="space-y-3 pt-4">
                          <Button
                            onClick={downloadReport}
                            disabled={!aiResponse && !reportData}
                            className="w-full h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                            size="lg"
                          >
                            {!aiResponse && !reportData ? (
                              <>
                                <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                                Generating Report...
                              </>
                            ) : (
                              <>
                                <Download className="mr-2 w-5 h-5" />
                                Download Analysis Report (.txt)
                                <FileText className="ml-2 w-5 h-5" />
                              </>
                            )}
                          </Button>

                          <Button
                            onClick={resetAnalysis}
                            variant="outline"
                            className="w-full h-12 text-base border-2 hover:border-primary hover:bg-primary/5"
                            size="lg"
                          >
                            <GitBranch className="mr-2 w-5 h-5" />
                            Analyze Another Repository
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Stats Sidebar */}
                <div className="lg:col-span-2 space-y-6">
                  <Card className="shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-lg">Analysis Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[
                        { label: "Duration", value: `${analysisTime}s`, icon: <Clock className="w-5 h-5 text-primary" /> },
                        { label: "Repository", value: repoUrl.split('/').pop() || 'Unknown', icon: <GitBranch className="w-5 h-5 text-primary" /> },
                        { label: "Events Logged", value: events.length.toString(), icon: <Activity className="w-5 h-5 text-primary" /> },
                        { label: "Status", value: "Completed", icon: <CheckCircle2 className="w-5 h-5 text-green-500" /> }
                      ].map((stat, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * i }}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                        >
                          <div className="flex items-center gap-3">
                            {stat.icon}
                            <span className="text-sm font-medium">{stat.label}</span>
                          </div>
                          <span className="text-sm font-bold truncate max-w-[150px]">{stat.value}</span>
                        </motion.div>
                      ))}
                    </CardContent>
                  </Card>

                  {vulnerabilityCount > 0 && (
                    <Card className="shadow-xl border-red-500/20">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-red-600 dark:text-red-400">
                          <AlertTriangle className="w-5 h-5" />
                          Action Required
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <p>Security vulnerabilities have been detected in your repository.</p>
                        <ul className="space-y-2 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <CircleDot className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>Review the detailed report</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CircleDot className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>Prioritize critical findings</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CircleDot className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>Apply recommended patches</span>
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* AI Response Section */}
              {aiResponse && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6"
                >
                  <Card className="shadow-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-primary" />
                        AI Analysis Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-x-auto">
                          {aiResponse}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </PageLayout>
  );
}
