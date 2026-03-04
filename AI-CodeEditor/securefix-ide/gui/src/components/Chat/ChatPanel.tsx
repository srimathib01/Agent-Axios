import React, { useRef, useEffect } from 'react';
import { useAppSelector } from '../../store';
import { selectMessages, selectIsLoading } from '../../store/chatSlice';
import { selectSelectedVulnerability } from '../../store/vulnerabilitySlice';
import { useMessaging } from '../../hooks/useMessaging';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

const ChatPanel: React.FC = () => {
  const messages = useAppSelector(selectMessages);
  const isLoading = useAppSelector(selectIsLoading);
  const selectedVuln = useAppSelector(selectSelectedVulnerability);
  const { sendChatMessage } = useMessaging();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickActions = [
    { label: 'Explain', action: 'explain', prompt: 'Explain this vulnerability and why it is dangerous.' },
    { label: 'OWASP', action: 'owasp', prompt: 'Show OWASP best practices for preventing this vulnerability.' },
    { label: 'Optimize', action: 'optimize', prompt: 'Suggest a more efficient fix for this vulnerability.' },
    { label: 'Test Cases', action: 'test_cases', prompt: 'Generate test cases to verify the security fix.' },
  ];

  const getVulnContext = () => {
    if (!selectedVuln) return undefined;
    return {
      currentFile: selectedVuln.location?.fileUri,
      selectedVulnerability: selectedVuln.id,
      vulnerability: {
        id: selectedVuln.id,
        cwe: selectedVuln.cwe?.id || '',
        cweName: selectedVuln.cwe?.name || '',
        severity: selectedVuln.severity,
        description: selectedVuln.description,
        recommendation: selectedVuln.recommendation,
        file_path: selectedVuln.location?.fileUri || '',
        codeSnippet: selectedVuln.codeSnippet || '',
        startLine: selectedVuln.location?.startLine,
        endLine: selectedVuln.location?.endLine,
        owasp: selectedVuln.owasp?.category,
      },
    };
  };

  const handleQuickAction = (prompt: string) => {
    sendChatMessage(prompt, getVulnContext());
  };

  const handleSendMessage = (message: string) => {
    sendChatMessage(message, getVulnContext());
  };

  const severityColor = selectedVuln?.severity === 'critical' ? '#ef4444'
    : selectedVuln?.severity === 'high' ? '#f97316'
    : selectedVuln?.severity === 'medium' ? '#eab308'
    : '#3b82f6';

  return (
    <div className="h-full flex flex-col">
      {/* Vulnerability context indicator */}
      {selectedVuln ? (
        <div
          className="px-4 py-2 border-b text-xs flex items-center gap-2.5"
          style={{ borderColor: 'var(--vscode-panel-border)', borderLeftColor: severityColor, borderLeftWidth: '3px' }}
        >
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: severityColor }} />
          <span className="font-mono font-medium" style={{ color: severityColor }}>
            CWE-{selectedVuln.cwe?.id}
          </span>
          <span className="opacity-40">|</span>
          <span className="truncate" style={{ color: 'var(--vscode-foreground)' }}>
            {selectedVuln.description?.slice(0, 55)}{(selectedVuln.description?.length || 0) > 55 ? '...' : ''}
          </span>
        </div>
      ) : (
        <div className="px-4 py-2 border-b text-xs flex items-center gap-2" style={{ borderColor: 'var(--vscode-panel-border)', color: 'var(--vscode-descriptionForeground)' }}>
          <span className="opacity-60">&#9432;</span>
          Select a vulnerability for context-aware responses
        </div>
      )}

      {/* Quick actions */}
      <div className="px-4 py-2 border-b flex flex-wrap gap-1.5" style={{ borderColor: 'var(--vscode-panel-border)' }}>
        {quickActions.map((action) => (
          <button
            key={action.action}
            className="quick-action-btn"
            onClick={() => handleQuickAction(action.prompt)}
            disabled={isLoading}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--vscode-button-background)', opacity: 0.8 }}>
              <span className="text-xl" style={{ color: 'var(--vscode-button-foreground)' }}>AI</span>
            </div>
            <h3 className="text-sm font-semibold mb-1.5" style={{ color: 'var(--vscode-foreground)' }}>
              Security Assistant
            </h3>
            <p className="text-xs max-w-[220px] leading-relaxed" style={{ color: 'var(--vscode-descriptionForeground)' }}>
              Ask questions about vulnerabilities, request explanations, or get help with security fixes.
            </p>
          </div>
        ) : (
          <>
            <MessageList messages={messages} />
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default ChatPanel;
