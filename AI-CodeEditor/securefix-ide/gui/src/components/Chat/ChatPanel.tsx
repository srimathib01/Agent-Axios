import React, { useRef, useEffect } from 'react';
import { useAppSelector } from '../../store';
import { selectMessages, selectIsLoading } from '../../store/chatSlice';
import { useMessaging } from '../../hooks/useMessaging';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

const ChatPanel: React.FC = () => {
  const messages = useAppSelector(selectMessages);
  const isLoading = useAppSelector(selectIsLoading);
  const { sendChatMessage } = useMessaging();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickActions = [
    { label: '💡 Explain', action: 'explain', prompt: 'Explain this vulnerability and why it is dangerous.' },
    { label: '🔒 OWASP', action: 'owasp', prompt: 'Show OWASP best practices for preventing this vulnerability.' },
    { label: '⚡ Optimize', action: 'optimize', prompt: 'Suggest a more efficient fix for this vulnerability.' },
    { label: '🧪 Test Cases', action: 'test_cases', prompt: 'Generate test cases to verify the security fix.' },
  ];

  const handleQuickAction = (prompt: string) => {
    sendChatMessage(prompt);
  };

  const handleSendMessage = (message: string) => {
    sendChatMessage(message);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Quick actions */}
      <div className="px-4 py-2 border-b flex flex-wrap gap-2" style={{ borderColor: 'var(--vscode-panel-border)' }}>
        {quickActions.map((action) => (
          <button
            key={action.action}
            className="text-xs px-2 py-1 rounded transition-colors"
            style={{
              backgroundColor: 'var(--vscode-button-secondaryBackground)',
              color: 'var(--vscode-button-secondaryForeground)',
            }}
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
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-lg font-medium mb-2">AI Security Assistant</h3>
            <p className="text-sm max-w-xs">
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
