import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  sendChatMessage, 
  getChatHistory,
  streamChatResponse,
  type ChatMessage,
  type SendMessageRequest,
} from '@/services/api';
import { toast } from 'sonner';

interface UseChatOptions {
  sessionId?: string;
  onMessageSent?: (message: ChatMessage) => void;
  onMessageReceived?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(options.sessionId);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Load chat history on mount or when sessionId changes
  useEffect(() => {
    if (sessionId) {
      loadChatHistory(sessionId);
    }
  }, [sessionId]);

  // Cleanup event source on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const loadChatHistory = async (sessionIdToLoad: string) => {
    setIsLoading(true);
    try {
      const response = await getChatHistory(sessionIdToLoad);
      if (response.success && response.data) {
        setMessages(response.data.messages || []);
      }
    } catch (error: any) {
      console.error('Failed to load chat history:', error);
      toast.error('Failed to load chat history', {
        description: error.message,
      });
      options.onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (message: string, context?: SendMessageRequest['context']) => {
    if (!message.trim()) return;

    setIsSending(true);

    // Add user message to UI immediately
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    options.onMessageSent?.(userMessage);

    try {
      const response = await sendChatMessage({
        message,
        sessionId,
        context,
      });

      if (response.success && response.data) {
        // Replace temp user message with actual one
        const actualUserMessage: ChatMessage = {
          id: response.data.messageId,
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
        };

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date().toISOString(),
        };

        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== userMessage.id);
          return [...filtered, actualUserMessage, assistantMessage];
        });

        options.onMessageReceived?.(assistantMessage);

        // Update session ID if it's a new session
        if (!sessionId && response.data.messageId) {
          setSessionId(response.data.messageId.split('-')[0]);
        }
      }
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message', {
        description: error.message,
      });
      options.onError?.(error);

      // Remove the failed message from UI
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  const streamMessage = useCallback((message: string, context?: SendMessageRequest['context']) => {
    if (!message.trim() || !sessionId) return;

    setIsSending(true);

    // Add user message
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    options.onMessageSent?.(userMessage);

    // Create assistant message placeholder
    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, assistantMessage]);

    // Start streaming
    eventSourceRef.current = streamChatResponse(
      sessionId,
      (data) => {
        if (data.type === 'complete') {
          setIsSending(false);
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
        } else {
          // Update assistant message content
          setMessages(prev => {
            return prev.map(m => {
              if (m.id === assistantMessageId) {
                return {
                  ...m,
                  content: m.content + (data.token || ''),
                };
              }
              return m;
            });
          });
        }
      },
      (error) => {
        setIsSending(false);
        toast.error('Streaming error', {
          description: error.message,
        });
        options.onError?.(error);
      }
    );
  }, [sessionId, options]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSessionId(undefined);
  }, []);

  const retryLastMessage = useCallback(() => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      // Remove last messages (user + assistant)
      setMessages(prev => prev.slice(0, -2));
      sendMessage(lastUserMessage.content);
    }
  }, [messages]);

  return {
    messages,
    isLoading,
    isSending,
    sessionId,
    sendMessage,
    streamMessage,
    clearMessages,
    retryLastMessage,
    loadChatHistory,
  };
}
