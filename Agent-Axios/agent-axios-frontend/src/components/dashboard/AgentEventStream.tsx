import { useEffect, useRef } from "react";
import { Wrench, CheckCircle2, MessageSquare, Zap, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";

export type AgentEvent = {
  id: string;
  type: 'tool_call' | 'tool_result' | 'agent_response' | 'progress';
  timestamp: string;
  data: any;
};

interface AgentEventStreamProps {
  events: AgentEvent[];
}

export function AgentEventStream({ events }: AgentEventStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'tool_call':
        return <Wrench className="w-4 h-4" />;
      case 'tool_result':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'agent_response':
        return <MessageSquare className="w-4 h-4" />;
      case 'progress':
        return <Zap className="w-4 h-4" />;
      default:
        return <FileCode className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'tool_call':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'tool_result':
        return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'agent_response':
        return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      case 'progress':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      default:
        return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const formatEventContent = (event: AgentEvent) => {
    switch (event.type) {
      case 'tool_call':
        return (
          <div>
            <div className="font-semibold mb-1">
              🔧 Calling: <code className="text-sm px-1.5 py-0.5 bg-black/20 rounded">{event.data.tool}</code>
            </div>
            {event.data.args && Object.keys(event.data.args).length > 0 && (
              <div className="text-xs text-muted-foreground mt-1 pl-2 border-l-2 border-current/20">
                {Object.entries(event.data.args).slice(0, 2).map(([key, value]: [string, any]) => (
                  <div key={key}>
                    <span className="opacity-70">{key}:</span>{' '}
                    <span className="font-mono">{typeof value === 'string' ? value.substring(0, 50) : JSON.stringify(value).substring(0, 50)}</span>
                    {(typeof value === 'string' ? value.length : JSON.stringify(value).length) > 50 && '...'}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'tool_result':
        return (
          <div>
            <div className="font-semibold mb-1">
              ✅ Completed: <code className="text-sm px-1.5 py-0.5 bg-black/20 rounded">{event.data.tool}</code>
            </div>
            {event.data.result_preview && (
              <div className="text-xs text-muted-foreground mt-1 pl-2 border-l-2 border-current/20 line-clamp-2">
                {event.data.result_preview}
              </div>
            )}
          </div>
        );
      
      case 'agent_response':
        return (
          <div>
            <div className="font-semibold mb-1">💬 Agent:</div>
            <div className="text-sm text-foreground/90 line-clamp-3 pl-2 border-l-2 border-current/20">
              {event.data.response}
            </div>
          </div>
        );
      
      case 'progress':
        return (
          <div>
            <div className="font-semibold">
              {event.data.stage && (
                <span className="capitalize">{event.data.stage.replace(/_/g, ' ')}</span>
              )}
            </div>
            {event.data.message && (
              <div className="text-xs text-muted-foreground mt-0.5">{event.data.message}</div>
            )}
          </div>
        );
      
      default:
        return <div className="text-sm">{JSON.stringify(event.data)}</div>;
    }
  };

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="bg-card border-2 border-border/50 rounded-2xl p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/50">
        <Zap className="w-5 h-5 text-primary animate-pulse" />
        <h3 className="font-bold text-sm">Agent Activity Stream</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {events.length} event{events.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div 
        ref={scrollRef}
        className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2"
      >
        {events.map((event) => (
          <div
            key={event.id}
            className={cn(
              "p-3 rounded-lg border transition-all duration-200",
              getEventColor(event.type)
            )}
          >
            <div className="flex items-start gap-2">
              <div className={cn("mt-0.5 flex-shrink-0", getEventColor(event.type))}>
                {getEventIcon(event.type)}
              </div>
              <div className="flex-1 min-w-0">
                {formatEventContent(event)}
              </div>
              <div className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                {new Date(event.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
