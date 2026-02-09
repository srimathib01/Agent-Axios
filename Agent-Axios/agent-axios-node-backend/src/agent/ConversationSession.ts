/**
 * ConversationSession - Stores conversation metadata and state
 */

export interface ConversationSessionOptions {
  userId: string;
  agentType?: string;
  metadata?: Record<string, any>;
}

export class ConversationSession {
  public conversationId: string;
  public userId: string;
  public agentType: string;
  public conversationHistory: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    metadata?: Record<string, any>;
  }>;
  public createdAt: string;
  public metadata: Record<string, any>;

  constructor(options: ConversationSessionOptions) {
    this.conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.userId = options.userId;
    this.agentType = options.agentType || 'langgraph';
    this.conversationHistory = [];
    this.createdAt = new Date().toISOString();
    this.metadata = options.metadata || {};
  }

  /**
   * Add message to conversation history
   */
  addToHistory(
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: Record<string, any>
  ): void {
    this.conversationHistory.push({
      role,
      content,
      timestamp: new Date().toISOString(),
      ...(metadata && { metadata }),
    });
  }

  /**
   * Get conversation history
   */
  getHistory() {
    return this.conversationHistory;
  }

  /**
   * Get session info
   */
  getInfo() {
    return {
      conversationId: this.conversationId,
      userId: this.userId,
      agentType: this.agentType,
      createdAt: this.createdAt,
      messageCount: this.conversationHistory.length,
      metadata: this.metadata,
    };
  }
}
