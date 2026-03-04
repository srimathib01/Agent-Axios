import React from 'react';
import type { ChatMessage } from '../../store/chatSlice';

interface MessageListProps {
  messages: ChatMessage[];
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const formatContent = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {content.slice(lastIndex, match.index)}
          </span>
        );
      }

      const lang = match[1] || '';
      const code = match[2];
      parts.push(
        <div key={`code-${match.index}`} className="my-2 rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
          {lang && (
            <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--vscode-descriptionForeground)' }}>
              {lang}
            </div>
          )}
          <pre className="p-3 text-xs font-mono overflow-x-auto" style={{ backgroundColor: 'var(--vscode-textCodeBlock-background)' }}>
            <code>{code}</code>
          </pre>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {content.slice(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : content;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex gap-2.5 animate-slide-up ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          {/* Avatar - AI only */}
          {message.role === 'assistant' && (
            <div className="message-avatar message-avatar-ai flex-shrink-0 mt-0.5">
              AI
            </div>
          )}

          <div className={`max-w-[82%] ${message.role === 'user' ? 'order-first' : ''}`}>
            {/* Bubble */}
            <div
              className={`rounded-lg px-3.5 py-2.5 text-sm ${
                message.role === 'user'
                  ? 'ml-auto'
                  : ''
              }`}
              style={message.role === 'user'
                ? { background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: 'white' }
                : { backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--vscode-foreground)' }
              }
            >
              {/* Content */}
              <div className="whitespace-pre-wrap leading-relaxed">
                {formatContent(message.content)}
                {message.isStreaming && message.content === '' && (
                  <div className="typing-dots py-1">
                    <span /><span /><span />
                  </div>
                )}
                {message.isStreaming && message.content !== '' && (
                  <span className="inline-block w-1.5 h-4 ml-0.5 rounded-sm animate-pulse"
                    style={{ backgroundColor: 'var(--vscode-focusBorder)' }} />
                )}
              </div>
            </div>

            {/* Timestamp */}
            <div className={`text-[10px] mt-1 px-1 ${message.role === 'user' ? 'text-right' : ''}`}
              style={{ color: 'var(--vscode-descriptionForeground)' }}>
              {formatTime(message.timestamp)}
            </div>
          </div>

          {/* Avatar - User only */}
          {message.role === 'user' && (
            <div className="message-avatar message-avatar-user flex-shrink-0 mt-0.5">
              U
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MessageList;
