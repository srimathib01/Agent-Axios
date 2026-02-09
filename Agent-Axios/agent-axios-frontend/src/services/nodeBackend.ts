/**
 * Node.js Backend Service
 * Handles real-time vulnerability analysis with streaming
 */

const API_BASE = import.meta.env.VITE_NODE_BACKEND_URL || 'http://localhost:3000/api';

export interface StreamEvent {
  type: 'token' | 'tool_start' | 'tool_end' | 'custom' | 'done' | 'error' | 'session_created';
  content?: string;
  toolName?: string;
  toolInput?: any;
  toolOutput?: any;
  error?: string;
  data?: any;
}

export interface ConversationInfo {
  conversationId: string;
  userId: string;
  agentType: string;
  message: string;
  startedAt: string;
}

export class NodeBackendService {
  /**
   * Start a new conversation
   */
  async startConversation(userId: string): Promise<ConversationInfo> {
    const response = await fetch(`${API_BASE}/conversation/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, agentType: 'langgraph' }),
    });

    if (!response.ok) {
      throw new Error(`Failed to start conversation: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Send message with streaming (Server-Sent Events)
   */
  async *sendMessageStream(
    conversationId: string,
    message: string
  ): AsyncGenerator<StreamEvent> {
    const response = await fetch(`${API_BASE}/conversation/message-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, message }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode chunk
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();

            if (data === '[DONE]') {
              yield { type: 'done' };
              return;
            }

            try {
              const event = JSON.parse(data);
              yield event as StreamEvent;
            } catch (e) {
              console.error('Failed to parse SSE data:', data, e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * End conversation
   */
  async endConversation(conversationId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/conversation/${conversationId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to end conversation: ${response.statusText}`);
    }
  }

  /**
   * Analyze repository (convenience method)
   */
  async *analyzeRepository(
    repoUrl: string,
    userId: string = `user_${Date.now()}`
  ): AsyncGenerator<StreamEvent> {
    // Start conversation
    const conversation = await this.startConversation(userId);
    
    yield {
      type: 'session_created',
      data: conversation,
    };

    // Send analysis request
    const message = `Analyze this repository for security vulnerabilities: ${repoUrl}

Please:
1. Clone the repository
2. Build the codebase index
3. Analyze the repository structure
4. Search for vulnerable code patterns
5. Query the CVE database for relevant vulnerabilities
6. Validate any matches using GPT-4
7. Record all confirmed findings
8. Generate a comprehensive vulnerability report

Provide detailed progress updates throughout the analysis.`;

    try {
      // Stream analysis
      for await (const event of this.sendMessageStream(conversation.conversationId, message)) {
        yield event;
        
        if (event.type === 'done') {
          break;
        }
      }
    } finally {
      // Clean up conversation
      await this.endConversation(conversation.conversationId);
    }
  }
}

export const nodeBackendService = new NodeBackendService();
