import { Bot, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

interface ChatMessageProps {
  message: Message;
}

// Simple markdown-like formatting
const formatContent = (content: string) => {
  return content
    .split('\n')
    .map((line, i) => {
      // Code blocks
      if (line.startsWith('`') && line.endsWith('`')) {
        const code = line.slice(1, -1);
        return (
          <code key={i} className="px-2 py-1 bg-secondary/50 rounded text-sm font-mono border border-border">
            {code}
          </code>
        );
      }
      // Bold text
      if (line.includes('**')) {
        const parts = line.split('**');
        return (
          <span key={i}>
            {parts.map((part, j) => (
              j % 2 === 0 ? part : <strong key={j} className="font-semibold">{part}</strong>
            ))}
          </span>
        );
      }
      // Bullet points
      if (line.trim().startsWith('- ')) {
        return (
          <div key={i} className="flex gap-2 ml-2">
            <span className="text-primary mt-1">•</span>
            <span>{line.slice(2)}</span>
          </div>
        );
      }
      // Regular text
      return line ? <p key={i} className="m-0">{line}</p> : <br key={i} />;
    });
};

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "flex gap-3 animate-fade-in-up",
        isAssistant ? "justify-start" : "justify-end"
      )}
    >
      {isAssistant && (
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-primary/20">
          <div className="relative">
            <Bot className="w-5 h-5 text-primary-foreground" />
            <Sparkles className="w-2.5 h-2.5 text-accent-foreground absolute -top-1 -right-1 animate-pulse" />
          </div>
        </div>
      )}

      <div
        className={cn(
          "max-w-[85%] rounded-2xl p-4 shadow-lg transition-all duration-200 hover:shadow-xl",
          isAssistant
            ? "bg-gradient-to-br from-card to-card/95 border border-border/50 hover:border-primary/30"
            : "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-primary/20"
        )}
      >
        <div className={cn(
          "text-sm leading-relaxed space-y-1",
          isAssistant ? "text-foreground" : "text-primary-foreground"
        )}>
          {formatContent(message.content)}
        </div>
        <div
          className={cn(
            "text-[10px] mt-3 font-medium flex items-center gap-1",
            isAssistant ? "text-muted-foreground" : "text-primary-foreground/70"
          )}
        >
          <div className="w-1 h-1 rounded-full bg-current opacity-50" />
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {!isAssistant && (
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center flex-shrink-0 shadow-md ring-2 ring-border">
          <User className="w-5 h-5 text-foreground" />
        </div>
      )}
    </div>
  );
}
