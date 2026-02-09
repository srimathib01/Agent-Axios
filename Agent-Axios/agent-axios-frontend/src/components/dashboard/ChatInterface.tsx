import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, GitBranch, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./ChatMessage";
import { AnalysisProgress } from "./AnalysisProgress";
import { AgentEventStream, type AgentEvent } from "./AgentEventStream";
import { toast } from "sonner";
import { 
  createAnalysis,
  subscribeToAnalysis,
  unsubscribeFromAnalysis,
  getAnalysisResults,
  type Analysis,
  type AnalysisType,
  type ProgressUpdate,
  type AnalysisComplete,
} from "@/services/api";

// Helper function to extract GitHub URL from text
function extractGitHubUrl(text: string): string | null {
  const githubUrlRegex = /https?:\/\/github\.com\/[\w-]+\/[\w.-]+/;
  const match = text.match(githubUrlRegex);
  return match ? match[0] : null;
}

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  analysisId?: number;
};

type AnalysisState = {
  id: number;
  progress: number;
  stage: string;
  status: string;
  message?: string;
};

type ActiveAnalysis = {
  state: AnalysisState;
  events: AgentEvent[];
};

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content: "👋 Welcome! I'm your AI-powered CVE analysis assistant. Paste a GitHub repository URL to get started with a comprehensive security analysis.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<ActiveAnalysis | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, isAnalyzing]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      if (activeAnalysis) {
        unsubscribeFromAnalysis(activeAnalysis.state.id);
      }
    };
  }, [activeAnalysis]);

  const handleSend = async () => {
    if (!input.trim() || isAnalyzing) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput("");
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Check if input contains a GitHub URL
    const githubUrl = extractGitHubUrl(userInput);
    
    if (githubUrl) {
      // Start real analysis
      await startAnalysis(githubUrl, userInput);
    } else {
      // Handle general questions
      setTimeout(() => {
        const response: Message = {
          id: Date.now(),
          role: "assistant",
          content: "I can help you analyze GitHub repositories for CVE vulnerabilities! Please paste a GitHub repository URL to get started. For example:\n\n`https://github.com/user/repository`\n\nI support three analysis types:\n- **SHORT** (2-3 min): Quick scan\n- **MEDIUM** (5-10 min): Standard audit with AI validation ⭐\n- **HARD** (15-40 min): Deep comprehensive scan",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, response]);
      }, 500);
    }
  };

  const startAnalysis = async (repoUrl: string, userInput: string) => {
    setIsAnalyzing(true);

    // Determine analysis type from user input
    let analysisType: AnalysisType = 'SHORT'; // Default
    const inputLower = userInput.toLowerCase();
    if (inputLower.includes('quick') || inputLower.includes('short') || inputLower.includes('fast')) {
      analysisType = 'SHORT';
    } else if (inputLower.includes('deep') || inputLower.includes('hard') || inputLower.includes('comprehensive')) {
      analysisType = 'HARD';
    }

    try {
      // Create analysis
      const analysis = await createAnalysis(repoUrl, analysisType);
      
      const initialResponse: Message = {
        id: Date.now(),
        role: "assistant",
        content: `🚀 Analysis started for **${repoUrl}**\n\nAnalysis Type: **${analysisType}**\nAnalysis ID: ${analysis.analysis_id}\n\nConnecting to analysis agent...`,
        timestamp: new Date(),
        analysisId: analysis.analysis_id,
      };
      setMessages(prev => [...prev, initialResponse]);

      setActiveAnalysis({
        state: {
          id: analysis.analysis_id,
          progress: 0,
          stage: 'pending',
          status: 'pending',
          message: 'Initializing...'
        },
        events: []
      });

      toast.success("Analysis started!", {
        description: `Scanning ${repoUrl}...`,
      });

      // Subscribe to analysis updates
      subscribeToAnalysis(analysis.analysis_id, {
        onProgress: (data: ProgressUpdate) => {
          console.log('🔄 Progress Update Received:', data);
          setActiveAnalysis(prev => {
            if (!prev) return null;
            return {
              ...prev,
              state: {
                ...prev.state,
                progress: data.progress,
                stage: data.stage,
                status: 'running',
                message: data.message
              },
              events: [
                ...prev.events,
                {
                  id: `progress-${Date.now()}`,
                  type: 'progress',
                  timestamp: data.timestamp || new Date().toISOString(),
                  data: { stage: data.stage, message: data.message, progress: data.progress }
                }
              ]
            };
          });
          console.log('✅ State updated:', { progress: data.progress, stage: data.stage });
        },
        onResult: (data) => {
          const msg: Message = {
            id: Date.now(),
            role: "assistant",
            content: `🔍 Found vulnerability: **${data.cve_id}**\n- File: \`${data.file_path}\`\n- Severity: **${data.severity}**\n- Confidence: ${(data.confidence_score * 100).toFixed(1)}%`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, msg]);
        },
        onComplete: async (data: AnalysisComplete) => {
          setIsAnalyzing(false);
          setActiveAnalysis(null);
          
          try {
            // Add small delay to ensure database is updated
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Retry logic for fetching results
            let results;
            let retries = 3;
            while (retries > 0) {
              try {
                results = await getAnalysisResults(analysis.analysis_id);
                break;
              } catch (error: any) {
                if (error.message.includes('not completed yet') && retries > 1) {
                  console.log(`Retrying... (${retries - 1} attempts left)`);
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  retries--;
                } else {
                  throw error;
                }
              }
            }
            
            if (results) {
              const completionMsg: Message = {
                id: Date.now(),
                role: "assistant",
                content: `🎉 **Analysis Complete!**\n\n**Summary:**\n- Total Files: ${results.summary.total_files}\n- Code Chunks: ${results.summary.total_chunks}\n- Vulnerabilities Found: ${results.summary.total_findings}\n- Confirmed: ${results.summary.confirmed_vulnerabilities}\n- False Positives: ${results.summary.false_positives}\n\n**Severity Breakdown:**\n${Object.entries(results.summary.severity_breakdown).map(([severity, count]) => `- ${severity}: ${count}`).join('\n')}\n\n**Duration:** ${Math.round(data.duration_seconds)}s\n\n📥 Downloading your detailed report...`,
                timestamp: new Date(),
                analysisId: analysis.analysis_id,
              };
              setMessages(prev => [...prev, completionMsg]);

              // Auto-download report if vulnerabilities were found
              if (results.summary.total_findings > 0) {
                try {
                  toast.info('Generating report...', {
                    description: 'Please wait while we prepare your report',
                  });
                  
                  // Import the exportReport function
                  const { exportReport } = await import('@/services/api');
                  
                  // Wait a bit for PDF generation
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  
                  const blob = await exportReport(analysis.analysis_id, 'pdf');
                  
                  // Create download link
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `vulnerability-report-${analysis.analysis_id}.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  window.URL.revokeObjectURL(url);
                  
                  toast.success('Report downloaded!', {
                    description: `Found ${results.summary.total_findings} vulnerabilities`,
                  });
                } catch (downloadError) {
                  console.error('Error downloading report:', downloadError);
                  toast.warning('Report generation in progress', {
                    description: 'You can download it from the Reports page',
                  });
                }
              } else {
                toast.success("Analysis complete!", {
                  description: 'No vulnerabilities found',
                });
              }
            }
          } catch (error) {
            console.error('Error fetching results:', error);
            
            // Fallback message if we can't fetch results
            const fallbackMsg: Message = {
              id: Date.now(),
              role: "assistant",
              content: `🎉 **Analysis Complete!**\n\n**Summary:**\n- Duration: ${Math.round(data.duration_seconds)}s\n- Total Findings: ${data.total_findings}\n\nAnalysis ID: ${analysis.analysis_id}\n\nYou can view the full report in the Reports section.`,
              timestamp: new Date(),
              analysisId: analysis.analysis_id,
            };
            setMessages(prev => [...prev, fallbackMsg]);
            
            toast.success("Analysis complete!", {
              description: `Completed in ${Math.round(data.duration_seconds)}s`,
            });
          }
        },
      });

    } catch (error: any) {
      setIsAnalyzing(false);
      setActiveAnalysis(null);
      
      const errorMsg: Message = {
        id: Date.now(),
        role: "assistant",
        content: `❌ Failed to start analysis: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);

      toast.error("Failed to start analysis", {
        description: error.message,
      });
    }
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-gradient-to-b from-background to-secondary/10">
      <ScrollArea ref={scrollAreaRef} className="flex-1 custom-scrollbar">
        <div className="max-w-5xl mx-auto p-4 lg:p-8 space-y-6">
          {messages.length === 1 && (
            <div className="text-center py-12 lg:py-16 animate-fade-in-up">
              <div className="w-20 h-20 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl ring-4 ring-primary/10 animate-pulse-glow">
                <Sparkles className="w-10 h-10 text-primary animate-pulse" />
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text mb-3">
                Start Your Security Analysis
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-base lg:text-lg leading-relaxed">
                Paste a GitHub repository URL or ask me about CVE vulnerabilities in your codebase
              </p>

              <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                <button 
                  onClick={() => handleQuickAction("Analyze github.com/example/repo")}
                  className="group p-5 bg-gradient-to-br from-card to-card/80 border-2 border-border/50 rounded-2xl hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300 flex-shrink-0 group-hover:scale-110">
                      <GitBranch className="w-6 h-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground mb-1.5 text-base">Analyze Repository</div>
                      <div className="text-sm text-muted-foreground leading-snug">Scan a GitHub repo for vulnerabilities</div>
                    </div>
                  </div>
                </button>

                <button 
                  onClick={() => handleQuickAction("What are the most critical CVEs this month?")}
                  className="group p-5 bg-gradient-to-br from-card to-card/80 border-2 border-border/50 rounded-2xl hover:border-accent/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl flex items-center justify-center group-hover:from-accent/20 group-hover:to-accent/10 transition-all duration-300 flex-shrink-0 group-hover:scale-110">
                      <Sparkles className="w-6 h-6 text-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground mb-1.5 text-base">Ask About CVEs</div>
                      <div className="text-sm text-muted-foreground leading-snug">Get info on specific vulnerabilities</div>
                    </div>
                  </div>
                </button>

                <button 
                  onClick={() => handleQuickAction("Generate a security report")}
                  className="group p-5 bg-gradient-to-br from-card to-card/80 border-2 border-border/50 rounded-2xl hover:border-success/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-success/10 to-success/5 rounded-xl flex items-center justify-center group-hover:from-success/20 group-hover:to-success/10 transition-all duration-300 flex-shrink-0 group-hover:scale-110">
                      <FileText className="w-6 h-6 text-success" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground mb-1.5 text-base">Generate Report</div>
                      <div className="text-sm text-muted-foreground leading-snug">Create detailed security report</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {isAnalyzing && activeAnalysis && (
            <div className="space-y-4">
              <AnalysisProgress 
                progress={activeAnalysis.state.progress}
                stage={activeAnalysis.state.stage}
                status={activeAnalysis.state.status}
                message={activeAnalysis.state.message}
              />
              {activeAnalysis.events.length > 0 && (
                <AgentEventStream events={activeAnalysis.events} />
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t-2 border-border/50 bg-gradient-to-b from-card to-card/80 p-4 lg:p-6 flex-shrink-0 shadow-lg backdrop-blur-sm">
        <div className="max-w-5xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 relative group">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-resize textarea
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onKeyDown={handleKeyDown}
                placeholder="Paste a GitHub URL or ask a question..."
                className="min-h-[56px] max-h-[120px] resize-none bg-secondary/50 border-2 border-border hover:border-primary/50 focus:border-primary transition-all duration-200 rounded-2xl shadow-sm"
                disabled={isAnalyzing}
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isAnalyzing}
              className="bg-gradient-to-br from-primary to-primary/90 hover:from-primary-hover hover:to-primary text-primary-foreground h-[56px] px-6 lg:px-8 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 flex-shrink-0 rounded-2xl group"
            >
              {isAnalyzing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                  <span className="sr-only">Send message</span>
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center font-medium">
            <kbd className="px-2 py-1 bg-secondary/50 rounded border border-border text-[10px] font-mono">Enter</kbd> to send • <kbd className="px-2 py-1 bg-secondary/50 rounded border border-border text-[10px] font-mono">Shift + Enter</kbd> for new line
          </p>
        </div>
      </div>
    </div>
  );
}
