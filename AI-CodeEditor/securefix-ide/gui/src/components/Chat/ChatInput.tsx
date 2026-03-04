import React, { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="px-4 py-3 border-t"
      style={{ borderColor: 'var(--vscode-panel-border)' }}
    >
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about vulnerabilities or security..."
          className="input flex-1 resize-none min-h-[36px] max-h-[120px]"
          rows={1}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="btn h-9 w-9 flex items-center justify-center p-0 flex-shrink-0"
          disabled={!message.trim() || isLoading}
        >
          {isLoading ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 8L7 2M7 2L13 8M7 2V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="rotate(90 8 8)"/>
            </svg>
          )}
        </button>
      </div>
      <div className="text-[10px] mt-1.5 flex items-center gap-1" style={{ color: 'var(--vscode-descriptionForeground)' }}>
        <kbd className="px-1 py-0.5 rounded text-[9px]" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>Enter</kbd>
        <span>send</span>
        <span className="mx-1 opacity-30">|</span>
        <kbd className="px-1 py-0.5 rounded text-[9px]" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>Shift+Enter</kbd>
        <span>new line</span>
      </div>
    </form>
  );
};

export default ChatInput;
