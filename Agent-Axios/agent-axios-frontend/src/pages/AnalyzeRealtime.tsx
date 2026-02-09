import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  GitBranch,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileSearch,
  Database,
  Brain,
  Bug,
  FileText,
  Zap,
  Activity,
  Code2,
  Lock,
  Play,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PageLayout } from '@/components/layout/PageLayout';
import { nodeBackendService, type StreamEvent } from '@/services/nodeBackend';

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

export default function AnalyzeRealtime() {
  const [repoUrl, setRepoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [events, setEvents] = useState<AnalysisEvent[]>([]);
  const [aiResponse, setAiResponse] = useState('');
  const [vulnerabilityCount, setVulnerabilityCount] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const eventIdRef = useRef(1);
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

  const handleStartAnalysis = async () => {
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
          
          // Count vulnerabilities
          if (event.content?.includes('CVE-') || event.content?.includes('vulnerability')) {
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
        }
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      addEvent('error', `Analysis failed: ${error.message}`, undefined, 'error');
      setCurrentProgress(0);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStop = () => {
    setIsAnalyzing(false);
    addEvent('message', '⚠️ Analysis stopped by user', undefined, 'error');
  };

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Real-time Vulnerability Analysis
            </h1>
          </div>
          <p className="text-muted-foreground">
            Powered by LangGraph ReAct Agent with streaming tool execution
          </p>
        </motion.div>

        {/* Input Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Repository Analysis</CardTitle>
            <CardDescription>
              Enter a GitHub repository URL to start autonomous vulnerability detection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="https://github.com/username/repository"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  disabled={isAnalyzing}
                  onKeyPress={(e) => e.key === 'Enter' && !isAnalyzing && handleStartAnalysis()}
                  className="text-base"
                />
              </div>
              <Button
                onClick={isAnalyzing ? handleStop : handleStartAnalysis}
                disabled={!repoUrl.trim() && !isAnalyzing}
                className="min-w-[140px]"
                variant={isAnalyzing ? 'destructive' : 'default'}
              >
                {isAnalyzing ? (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Stop Analysis
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Analysis
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Progress Section */}
        {(isAnalyzing || isComplete) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6"
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Progress value={currentProgress} className="flex-1" />
                  <span className="text-sm font-medium">{Math.round(currentProgress)}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  variant={isComplete ? 'default' : isAnalyzing ? 'secondary' : 'outline'}
                  className="text-sm"
                >
                  {isComplete ? (
                    <><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</>
                  ) : isAnalyzing ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Analyzing</>
                  ) : (
                    'Ready'
                  )}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Vulnerabilities Found</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {vulnerabilityCount}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Events Stream */}
        {events.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Live Analysis Stream
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                ref={scrollRef}
                className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
              >
                <AnimatePresence>
                  {events.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border',
                        event.status === 'completed' && 'bg-green-50 border-green-200',
                        event.status === 'active' && 'bg-blue-50 border-blue-200',
                        event.status === 'error' && 'bg-red-50 border-red-200'
                      )}
                    >
                      <div
                        className={cn(
                          'p-1.5 rounded-md mt-0.5',
                          event.status === 'completed' && 'bg-green-500 text-white',
                          event.status === 'active' && 'bg-blue-500 text-white',
                          event.status === 'error' && 'bg-red-500 text-white'
                        )}
                      >
                        {event.status === 'active' && event.type === 'tool' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : event.status === 'error' ? (
                          <XCircle className="w-4 h-4" />
                        ) : event.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          event.icon
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{event.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {event.timestamp.toLocaleTimeString()}
                          {event.toolName && ` • ${event.toolName}`}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Response */}
        {aiResponse && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Analysis Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg">
                  {aiResponse}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
