/**
 * Conversation Manager
 * Orchestrates agent conversations, handles session management, and coordinates streaming
 */

import { ConversationSession } from './ConversationSession';
import { LangGraphBrowserAgent, StreamEvent } from './LangGraphBrowserAgent';
import { RepoService } from '../services/RepoService';
import { CVERetrievalService } from '../services/CVERetrievalService';
import { ValidationService } from '../services/ValidationService';
import { CodebaseIndexingService } from '../services/CodebaseIndexingService';
import { PDFReportGenerator } from '../services/PDFReportGenerator';
import {
  setRepoPath,
  setIndexingService,
  setCVEService,
  setValidationService,
  setPDFGenerator,
} from '../tools';
import logger from '../utils/logger';

export interface ConversationStartOptions {
  userId: string;
  agentType?: string;
  metadata?: Record<string, any>;
}

export interface ConversationInfo {
  conversationId: string;
  userId: string;
  message: string;
  startedAt: string;
}

export class ConversationManager {
  private sessions: Map<string, ConversationSession>;
  private agents: Map<string, LangGraphBrowserAgent>;
  private services: {
    repo: RepoService;
    cve: CVERetrievalService;
    validation: ValidationService;
    indexing: CodebaseIndexingService;
    pdf: PDFReportGenerator;
  };

  constructor() {
    this.sessions = new Map();
    this.agents = new Map();

    // Initialize services
    this.services = {
      repo: new RepoService(),
      cve: new CVERetrievalService(),
      validation: new ValidationService(),
      indexing: new CodebaseIndexingService(),
      pdf: new PDFReportGenerator(),
    };

    // Set global service instances for tools
    setCVEService(this.services.cve);
    setValidationService(this.services.validation);
    setIndexingService(this.services.indexing);
    setPDFGenerator(this.services.pdf);

    // Initialize CVE service
    this.services.cve.initialize().catch((error) => {
      logger.error(`Failed to initialize CVE service: ${error.message}`);
    });

    logger.info('ConversationManager initialized');
  }

  /**
   * Start a new conversation
   */
  async startConversation(options: ConversationStartOptions): Promise<ConversationInfo> {
    try {
      const { userId, agentType = 'langgraph', metadata = {} } = options;

      logger.info(`Starting conversation for user: ${userId}`);

      // Create conversation session
      const session = new ConversationSession({
        userId,
        agentType,
        metadata,
      });

      // Create agent for this session
      const agent = new LangGraphBrowserAgent(session, {
        provider: 'anthropic', // or 'azure' based on config
      });

      // Store session and agent
      this.sessions.set(session.conversationId, session);
      this.agents.set(session.conversationId, agent);

      logger.info(`✓ Conversation started: ${session.conversationId}`);

      return {
        conversationId: session.conversationId,
        userId: session.userId,
        message: 'Conversation started. I can help you analyze repositories for security vulnerabilities.',
        startedAt: session.createdAt,
      };
    } catch (error: any) {
      logger.error(`Failed to start conversation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process message with streaming
   */
  async *processMessageStream(
    conversationId: string,
    message: string
  ): AsyncGenerator<{ chunk: StreamEvent }> {
    try {
      const session = this.sessions.get(conversationId);
      const agent = this.agents.get(conversationId);

      if (!session || !agent) {
        throw new Error(`Conversation not found: ${conversationId}`);
      }

      logger.info(`Processing message for conversation: ${conversationId}`);

      // Stream agent execution
      for await (const event of agent.executeStream(message)) {
        yield { chunk: event };
      }

      logger.info(`✓ Message processed for conversation: ${conversationId}`);
    } catch (error: any) {
      logger.error(`Error processing message: ${error.message}`);
      yield {
        chunk: {
          type: 'error',
          error: error.message,
        },
      };
    }
  }

  /**
   * Process message (non-streaming)
   */
  async processMessage(conversationId: string, message: string): Promise<string> {
    try {
      const session = this.sessions.get(conversationId);
      const agent = this.agents.get(conversationId);

      if (!session || !agent) {
        throw new Error(`Conversation not found: ${conversationId}`);
      }

      logger.info(`Processing message (non-streaming) for: ${conversationId}`);

      const result = await agent.execute(message);

      logger.info(`✓ Message processed: ${conversationId}`);

      return result.output;
    } catch (error: any) {
      logger.error(`Error processing message: ${error.message}`);
      throw error;
    }
  }

  /**
   * End a conversation
   */
  async endConversation(conversationId: string): Promise<void> {
    try {
      logger.info(`Ending conversation: ${conversationId}`);

      // Remove session and agent
      this.sessions.delete(conversationId);
      this.agents.delete(conversationId);

      logger.info(`✓ Conversation ended: ${conversationId}`);
    } catch (error: any) {
      logger.error(`Error ending conversation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get conversation info
   */
  getConversation(conversationId: string): ConversationSession | undefined {
    return this.sessions.get(conversationId);
  }

  /**
   * Get all active conversations
   */
  getActiveConversations(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Get services (for analysis workflows)
   */
  getServices() {
    return this.services;
  }
}
