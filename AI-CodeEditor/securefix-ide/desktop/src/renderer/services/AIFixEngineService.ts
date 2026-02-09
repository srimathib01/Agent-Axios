/**
 * AI Fix Engine Service
 *
 * Bridges the GUI messages to the AI Fix Engine backend via the SecureFixCore.
 * Handles fix generation, chat, and quick actions with WebSocket streaming.
 */

import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event';
import {
  SecureFixCore,
  FixGeneratorService,
  DiffService,
  type Vulnerability,
  type CodeContext,
  type DiffZone,
  type GuiToCoreMessage,
  type CoreToGuiMessage,
  createDiffZone,
} from '@securefix/core';
import { getAIFixEngineConfig, checkBackendHealth } from './aiFixEngineConfig';
import { readFileContent, writeFileContent } from './repositoryService';

/**
 * AI Fix Engine Service
 *
 * Manages the connection between the frontend GUI and the AI Fix Engine backend.
 * Handles streaming fix generation, chat, and quick actions.
 */
export class AIFixEngineService {
  private fixGenerator: FixGeneratorService;
  private diffService: DiffService;
  private vulnerabilityCache: Map<string, Vulnerability> = new Map();
  private diffZoneCache: Map<string, DiffZone> = new Map();
  private unlistenFunctions: UnlistenFn[] = [];
  private isInitialized = false;

  constructor() {
    const config = getAIFixEngineConfig();

    this.fixGenerator = new FixGeneratorService({
      backendUrl: config.httpUrl,
      wsUrl: config.wsUrl,
      apiKey: config.apiKey,
    });

    this.diffService = new DiffService();
  }

  /**
   * Initialize the service and set up message listeners
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Listen for GUI -> Core messages
    const unlistenGuiToCore = await listen<GuiToCoreMessage>('gui-to-core', (event) => {
      this.handleMessage(event.payload);
    });
    this.unlistenFunctions.push(unlistenGuiToCore);

    this.isInitialized = true;
    console.log('[AIFixEngineService] Initialized');
  }

  /**
   * Handle incoming messages from GUI
   */
  async handleMessage(message: GuiToCoreMessage): Promise<void> {
    console.log('[AIFixEngineService] Received message:', message.type);

    switch (message.type) {
      case 'request_fix':
        await this.handleFixRequest(message);
        break;

      case 'chat_message':
        await this.handleChatMessage(message);
        break;

      case 'quick_action':
        await this.handleQuickAction(message);
        break;

      case 'apply_fix':
        await this.handleApplyFix(message.diffZoneId);
        break;

      case 'reject_fix':
        await this.handleRejectFix(message.diffZoneId);
        break;

      default:
        // Other messages are handled elsewhere
        break;
    }
  }

  /**
   * Handle fix generation request
   */
  private async handleFixRequest(message: GuiToCoreMessage & { type: 'request_fix' }): Promise<void> {
    const { vulnerabilityId, codeContext } = message;

    // Get vulnerability from cache
    const vulnerability = this.vulnerabilityCache.get(vulnerabilityId);
    if (!vulnerability) {
      this.sendToGui({
        id: `err-${Date.now()}`,
        timestamp: Date.now(),
        type: 'fix_error',
        vulnerabilityId,
        error: 'Vulnerability not found. Please refresh the vulnerability list.',
      });
      return;
    }

    // Check backend health before attempting
    const isHealthy = await checkBackendHealth();
    if (!isHealthy) {
      this.sendToGui({
        id: `err-${Date.now()}`,
        timestamp: Date.now(),
        type: 'fix_error',
        vulnerabilityId,
        error: 'AI Fix Engine backend is not running. Please start the backend server.',
      });
      return;
    }

    // Generate fix with streaming
    await this.fixGenerator.generateFix(
      vulnerability,
      codeContext,
      {
        onChunk: (content, done) => {
          this.sendToGui({
            id: `chunk-${Date.now()}`,
            timestamp: Date.now(),
            type: 'fix_stream_chunk',
            vulnerabilityId,
            content,
            done,
          });
        },

        onComplete: async (fullContent, blocks) => {
          // Read original file content for proper diff
          let originalContent = codeContext.vulnerableCode;
          try {
            const file = await readFileContent(codeContext.fileUri);
            // Extract the specific lines that are vulnerable
            const lines = file.content.split('\n');
            const startIdx = Math.max(0, codeContext.startLine - 1);
            const endIdx = Math.min(lines.length, codeContext.endLine);
            originalContent = lines.slice(startIdx, endIdx).join('\n');
          } catch (err) {
            console.warn('[AIFixEngineService] Could not read file for diff:', err);
          }

          // Create suggested content from blocks
          let suggestedContent = originalContent;
          for (const block of blocks) {
            if (block.search && block.replace !== undefined) {
              suggestedContent = suggestedContent.replace(block.search, block.replace);
            }
          }

          // Create DiffZone
          const diffZone = createDiffZone(
            codeContext.fileUri,
            codeContext.startLine,
            codeContext.endLine,
            originalContent,
            suggestedContent,
            vulnerabilityId
          );

          // Cache the diff zone
          this.diffZoneCache.set(diffZone.id, diffZone);

          // Compute diff for UI
          const diffResult = this.diffService.computeDiff(
            diffZone.originalContent,
            diffZone.suggestedContent
          );

          this.sendToGui({
            id: `complete-${Date.now()}`,
            timestamp: Date.now(),
            type: 'fix_complete',
            vulnerabilityId,
            diffZone,
            diffResult,
          });
        },

        onError: (error) => {
          this.sendToGui({
            id: `err-${Date.now()}`,
            timestamp: Date.now(),
            type: 'fix_error',
            vulnerabilityId,
            error: error.message,
          });
        },
      }
    );
  }

  /**
   * Handle chat message
   */
  private async handleChatMessage(message: GuiToCoreMessage & { type: 'chat_message' }): Promise<void> {
    const { content, context, id } = message;

    // Get vulnerability from context if provided
    let vulnerability: Vulnerability | undefined;
    if (context?.selectedVulnerability) {
      vulnerability = this.vulnerabilityCache.get(context.selectedVulnerability);
    }

    // Check backend health
    const isHealthy = await checkBackendHealth();
    if (!isHealthy) {
      this.sendToGui({
        id: `chat-err-${Date.now()}`,
        timestamp: Date.now(),
        type: 'chat_response_chunk',
        replyTo: id,
        content: 'AI Fix Engine backend is not running. Please start the backend server.',
        done: true,
      });
      return;
    }

    await this.fixGenerator.chat(
      content,
      {
        vulnerability,
        currentFile: context?.currentFile,
        recentFix: context?.recentFix,
      },
      {
        onChunk: (chunkContent, done) => {
          this.sendToGui({
            id: `chat-chunk-${Date.now()}`,
            timestamp: Date.now(),
            type: 'chat_response_chunk',
            replyTo: id,
            content: chunkContent,
            done,
          });
        },

        onComplete: (fullContent) => {
          this.sendToGui({
            id: `chat-complete-${Date.now()}`,
            timestamp: Date.now(),
            type: 'chat_response_complete',
            replyTo: id,
            content: fullContent,
          });
        },

        onError: (error) => {
          this.sendToGui({
            id: `chat-err-${Date.now()}`,
            timestamp: Date.now(),
            type: 'error',
            error: error.message,
            code: 'CHAT_ERROR',
          });
        },
      }
    );
  }

  /**
   * Handle quick action (explain, owasp, alternative, test_cases, impact)
   */
  private async handleQuickAction(message: GuiToCoreMessage & { type: 'quick_action' }): Promise<void> {
    const { action, vulnerabilityId, id } = message;

    const vulnerability = this.vulnerabilityCache.get(vulnerabilityId);
    if (!vulnerability) {
      this.sendToGui({
        id: `action-err-${Date.now()}`,
        timestamp: Date.now(),
        type: 'error',
        error: 'Vulnerability not found',
        code: 'NOT_FOUND',
      });
      return;
    }

    // Check backend health
    const isHealthy = await checkBackendHealth();
    if (!isHealthy) {
      this.sendToGui({
        id: `action-err-${Date.now()}`,
        timestamp: Date.now(),
        type: 'chat_response_chunk',
        replyTo: id,
        content: 'AI Fix Engine backend is not running. Please start the backend server.',
        done: true,
      });
      return;
    }

    // Map action to backend action type
    const actionMap: Record<string, 'explain' | 'owasp' | 'alternative' | 'test_cases' | 'impact'> = {
      explain: 'explain',
      owasp: 'owasp',
      optimize: 'alternative',
      alternative: 'alternative',
      test_cases: 'test_cases',
      impact: 'impact',
    };

    const backendAction = actionMap[action] || 'explain';

    await this.fixGenerator.quickAction(
      backendAction,
      vulnerability,
      {
        onChunk: (content, done) => {
          this.sendToGui({
            id: `action-chunk-${Date.now()}`,
            timestamp: Date.now(),
            type: 'chat_response_chunk',
            replyTo: id,
            content,
            done,
          });
        },

        onComplete: (fullContent) => {
          this.sendToGui({
            id: `action-complete-${Date.now()}`,
            timestamp: Date.now(),
            type: 'chat_response_complete',
            replyTo: id,
            content: fullContent,
          });
        },

        onError: (error) => {
          this.sendToGui({
            id: `action-err-${Date.now()}`,
            timestamp: Date.now(),
            type: 'error',
            error: error.message,
            code: 'QUICK_ACTION_ERROR',
          });
        },
      }
    );
  }

  /**
   * Handle apply fix
   */
  private async handleApplyFix(diffZoneId: string): Promise<void> {
    const diffZone = this.diffZoneCache.get(diffZoneId);
    if (!diffZone) {
      this.sendToGui({
        id: `apply-err-${Date.now()}`,
        timestamp: Date.now(),
        type: 'error',
        error: 'DiffZone not found',
        code: 'NOT_FOUND',
      });
      return;
    }

    try {
      // Read the full file
      const file = await readFileContent(diffZone.fileUri);
      const lines = file.content.split('\n');

      // Replace the vulnerable lines with the fixed content
      const beforeLines = lines.slice(0, diffZone.startLine - 1);
      const afterLines = lines.slice(diffZone.endLine);
      const fixedLines = diffZone.suggestedContent.split('\n');

      const newContent = [...beforeLines, ...fixedLines, ...afterLines].join('\n');

      // Write the file
      await writeFileContent(diffZone.fileUri, newContent);

      // Update diff zone status
      diffZone.status = 'applied';
      diffZone.appliedAt = new Date();

      this.sendToGui({
        id: `applied-${Date.now()}`,
        timestamp: Date.now(),
        type: 'fix_applied',
        diffZoneId,
        vulnerabilityId: diffZone.vulnerabilityId,
      });

      // Remove from cache
      this.diffZoneCache.delete(diffZoneId);

    } catch (error) {
      this.sendToGui({
        id: `apply-err-${Date.now()}`,
        timestamp: Date.now(),
        type: 'error',
        error: error instanceof Error ? error.message : 'Failed to apply fix',
        code: 'APPLY_ERROR',
      });
    }
  }

  /**
   * Handle reject fix
   */
  private async handleRejectFix(diffZoneId: string): Promise<void> {
    const diffZone = this.diffZoneCache.get(diffZoneId);

    if (diffZone) {
      diffZone.status = 'rejected';
      diffZone.rejectedAt = new Date();
    }

    this.sendToGui({
      id: `rejected-${Date.now()}`,
      timestamp: Date.now(),
      type: 'fix_rejected',
      diffZoneId,
      vulnerabilityId: diffZone?.vulnerabilityId || '',
    });

    // Remove from cache
    this.diffZoneCache.delete(diffZoneId);
  }

  /**
   * Send message to GUI via Tauri event
   */
  private sendToGui(message: CoreToGuiMessage): void {
    emit('core-to-gui', message).catch(console.error);
  }

  /**
   * Update vulnerability cache
   */
  setVulnerabilities(vulnerabilities: Vulnerability[]): void {
    this.vulnerabilityCache.clear();
    for (const vuln of vulnerabilities) {
      this.vulnerabilityCache.set(vuln.id, vuln);
    }
    console.log(`[AIFixEngineService] Cached ${vulnerabilities.length} vulnerabilities`);
  }

  /**
   * Get a vulnerability by ID
   */
  getVulnerability(id: string): Vulnerability | undefined {
    return this.vulnerabilityCache.get(id);
  }

  /**
   * Cancel ongoing fix generation
   */
  cancelFix(vulnerabilityId: string): void {
    this.fixGenerator.cancelFix(vulnerabilityId);
  }

  /**
   * Check if backend is healthy
   */
  async checkHealth(): Promise<boolean> {
    return checkBackendHealth();
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    for (const unlisten of this.unlistenFunctions) {
      unlisten();
    }
    this.unlistenFunctions = [];
    this.fixGenerator.dispose();
    this.vulnerabilityCache.clear();
    this.diffZoneCache.clear();
    this.isInitialized = false;
    console.log('[AIFixEngineService] Disposed');
  }
}

// Singleton instance
let serviceInstance: AIFixEngineService | null = null;

/**
 * Get the AI Fix Engine service singleton
 */
export function getAIFixEngineService(): AIFixEngineService {
  if (!serviceInstance) {
    serviceInstance = new AIFixEngineService();
  }
  return serviceInstance;
}

export default AIFixEngineService;
