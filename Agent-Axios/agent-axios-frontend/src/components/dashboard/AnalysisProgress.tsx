import { useEffect } from "react";
import { CheckCircle2, Loader2, Brain, Sparkles, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalysisProgressProps {
  progress: number;
  stage: string;
  status: string;
  message?: string;
}

export function AnalysisProgress({ progress, stage, status, message }: AnalysisProgressProps) {
  useEffect(() => {
    console.log('📊 AnalysisProgress:', { progress, stage, status, message });
  }, [progress, stage, status, message]);

  const isCompleted = progress >= 100 || status === 'completed';
  const isRunning = status === 'running' && !isCompleted;

  return (
    <div className="bg-gradient-to-br from-card via-card to-secondary/20 border-2 border-primary/20 rounded-2xl p-6 shadow-xl animate-scale-in relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 animate-shimmer opacity-50" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300",
            isCompleted 
              ? "bg-success/20 text-success ring-2 ring-success/30" 
              : "bg-primary/20 text-primary ring-2 ring-primary/30 animate-pulse-glow"
          )}>
            {isCompleted ? (
              <CheckCircle2 className="w-7 h-7" />
            ) : (
              <Brain className="w-7 h-7 animate-pulse" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-xl text-foreground">
              {isCompleted ? '✨ Analysis Complete' : '🤖 AI Agent Active'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isCompleted ? 'Vulnerability scan finished' : 'Agent is autonomously analyzing code'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {Math.round(progress)}%
            </div>
          </div>
        </div>

        {/* Current Stage - Dynamic from backend */}
        {stage && (
          <div className="mb-5 p-4 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-primary animate-pulse" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground mb-1">
                  Current Stage: {stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
                {message && (
                  <div className="text-xs text-muted-foreground">
                    {message}
                  </div>
                )}
              </div>
              {isRunning && (
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="h-4 bg-secondary/50 rounded-full overflow-hidden shadow-inner">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out relative",
                isCompleted 
                  ? "bg-gradient-to-r from-success to-success/80" 
                  : "bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-shimmer"
              )}
              style={{ width: `${Math.min(progress, 100)}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse-soft" />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-muted-foreground font-medium">
              {isCompleted ? 'Analysis finished' : 'Agent is working...'}
            </span>
            <span className="text-foreground font-semibold px-3 py-1 bg-primary/10 rounded-full">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
