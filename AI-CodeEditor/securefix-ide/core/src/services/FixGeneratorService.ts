/**
 * FixGeneratorService
 *
 * Constructs security-aware prompts with code context,
 * manages streaming from backend, and parses fix output.
 *
 * Connects to the SecureFix AI Fix Engine backend (Phase 2.3)
 * Default: http://localhost:8000 (FastAPI backend)
 */

import type { Vulnerability } from '../types/vulnerability.js';
import type { CodeContext, FrameworkInfo } from '../types/code-context.js';
import type { SearchReplaceBlock } from '../types/diff-zone.js';

export interface FixGeneratorConfig {
  /** Backend URL (default: http://localhost:8000) */
  backendUrl: string;
  /** Optional API key for authentication */
  apiKey?: string;
  /** WebSocket URL override (defaults to backendUrl with ws:// protocol) */
  wsUrl?: string;
}

export interface FixStreamCallbacks {
  onChunk: (content: string, done: boolean) => void;
  onComplete: (fullContent: string, blocks: SearchReplaceBlock[]) => void;
  onError: (error: Error) => void;
}

export interface FixGenerationMetadata {
  generationTimeMs?: number;
  promptTokens?: number;
  completionTokens?: number;
}

export class FixGeneratorService {
  private config: FixGeneratorConfig;
  private activeConnections: Map<string, WebSocket> = new Map();

  constructor(config: FixGeneratorConfig) {
    // Default to the AI Fix Engine backend
    this.config = {
      backendUrl: config.backendUrl || 'http://localhost:8000',
      apiKey: config.apiKey,
      wsUrl: config.wsUrl
    };
  }

  /**
   * Generate a fix using streaming WebSocket connection
   * Connects to: /api/fix/ws/fix
   */
  async generateFix(
    vulnerability: Vulnerability,
    codeContext: CodeContext,
    callbacks: FixStreamCallbacks
  ): Promise<void> {
    const wsUrl = this.config.wsUrl || this.config.backendUrl.replace('http', 'ws');
    // Connect to the AI Fix Engine WebSocket endpoint
    const ws = new WebSocket(`${wsUrl}/api/fix/ws/fix`);
    const connectionId = vulnerability.id;

    let fullContent = '';

    ws.onopen = () => {
      // Send fix request with context (matching backend FixRequest schema)
      const request = {
        type: 'fix_request',
        vulnerability: {
          id: vulnerability.id,
          cwe: typeof vulnerability.cwe === 'object' ? vulnerability.cwe.id : vulnerability.cwe,
          severity: vulnerability.severity,
          description: vulnerability.description,
          recommendation: vulnerability.recommendation,
          owasp: vulnerability.owasp?.category
        },
        codeContext: {
          file_path: codeContext.fileUri,
          start_line: codeContext.startLine,
          end_line: codeContext.endLine,
          vulnerable_code: codeContext.vulnerableCode,
          surrounding_code: codeContext.surroundingCode,
          imports: codeContext.imports,
          language: codeContext.language,
          framework: codeContext.framework?.name
        }
      };

      ws.send(JSON.stringify(request));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'fix_chunk') {
        fullContent += data.content || '';
        callbacks.onChunk(data.content || '', data.done);

        if (data.done) {
          // Backend provides parsed blocks, but also parse locally as fallback
          const blocks = data.search_blocks && data.replace_blocks
            ? data.search_blocks.map((search: string, i: number) => ({
                search,
                replace: data.replace_blocks[i] || ''
              }))
            : this.parseSearchReplaceBlocks(fullContent);

          callbacks.onComplete(data.full_content || fullContent, blocks);
          ws.close();
          this.activeConnections.delete(connectionId);
        }
      } else if (data.type === 'fix_error') {
        callbacks.onError(new Error(data.message));
        ws.close();
        this.activeConnections.delete(connectionId);
      }
    };

    ws.onerror = (_event) => {
      callbacks.onError(new Error('WebSocket connection error'));
      this.activeConnections.delete(connectionId);
    };

    ws.onclose = () => {
      this.activeConnections.delete(connectionId);
    };

    this.activeConnections.set(connectionId, ws);
  }

  /**
   * Cancel an ongoing fix generation
   */
  cancelFix(vulnerabilityId: string): void {
    const ws = this.activeConnections.get(vulnerabilityId);
    if (ws) {
      ws.close();
      this.activeConnections.delete(vulnerabilityId);
    }
  }

  /**
   * Parse search/replace blocks from LLM output
   *
   * Expected format:
   * <<<SEARCH
   * original code here
   * >>>
   * <<<REPLACE
   * fixed code here
   * >>>
   */
  parseSearchReplaceBlocks(content: string): SearchReplaceBlock[] {
    const blocks: SearchReplaceBlock[] = [];
    const regex = /<<<SEARCH\n([\s\S]*?)\n>>>\n<<<REPLACE\n([\s\S]*?)\n>>>/g;

    let match;
    while ((match = regex.exec(content)) !== null) {
      blocks.push({
        search: match[1].replace(/\r\n/g, '\n').replace(/^\n+|\n+$/g, ''),
        replace: match[2].replace(/\r\n/g, '\n').replace(/^\n+|\n+$/g, '')
      });
    }

    return blocks;
  }

  /**
   * Build the prompt for fix generation
   */
  buildPrompt(
    vulnerability: Vulnerability,
    codeContext: CodeContext
  ): string {
    const frameworkHints = codeContext.framework
      ? this.getFrameworkHints(codeContext.framework)
      : '';

    return `You are a security expert. Fix the following vulnerability with minimal code changes.
Preserve existing logic and coding style.

## Vulnerability Information
- CWE: ${vulnerability.cwe.id} - ${vulnerability.cwe.name}
- Severity: ${vulnerability.severity.toUpperCase()}
- Description: ${vulnerability.description}
${vulnerability.owasp ? `- OWASP Category: ${vulnerability.owasp.category} - ${vulnerability.owasp.name}` : ''}

## Recommendation
${vulnerability.recommendation}

## Code Context
Language: ${codeContext.language}
File: ${codeContext.fileUri}
Vulnerable lines: ${codeContext.startLine}-${codeContext.endLine}
${frameworkHints}

### Imports
\`\`\`
${codeContext.imports.join('\n')}
\`\`\`

### Surrounding Code
\`\`\`${codeContext.language}
${codeContext.surroundingCode}
\`\`\`

### Vulnerable Code
\`\`\`${codeContext.language}
${codeContext.vulnerableCode}
\`\`\`

## Output Format
Provide the fix using search/replace blocks for precise application:

<<<SEARCH
exact original code to find
>>>
<<<REPLACE
fixed secure code
>>>

Important:
- Make minimal changes to fix the vulnerability
- Maintain existing code style and indentation
- Only include the exact code that needs to change in SEARCH blocks
- Do not add unnecessary comments or refactoring`;
  }

  /**
   * Get framework-specific security hints
   */
  private getFrameworkHints(framework: FrameworkInfo): string {
    return `
### Framework: ${framework.name}
Security Patterns:
${framework.securityPatterns.map(p => `- ${p}`).join('\n')}`;
  }

  /**
   * Chat with AI about a vulnerability
   * Connects to: /api/fix/ws/chat
   */
  async chat(
    message: string,
    context: {
      vulnerability?: Vulnerability;
      currentFile?: string;
      recentFix?: string;
    },
    callbacks: {
      onChunk: (content: string, done: boolean) => void;
      onComplete: (fullContent: string) => void;
      onError: (error: Error) => void;
    }
  ): Promise<void> {
    const wsUrl = this.config.wsUrl || this.config.backendUrl.replace('http', 'ws');
    const ws = new WebSocket(`${wsUrl}/api/fix/ws/chat`);
    const connectionId = `chat_${Date.now()}`;

    let fullContent = '';

    ws.onopen = () => {
      const request = {
        type: 'chat_message',
        content: message,
        context: {
          vulnerability: context.vulnerability ? {
            id: context.vulnerability.id,
            cwe: typeof context.vulnerability.cwe === 'object'
              ? context.vulnerability.cwe.id
              : context.vulnerability.cwe,
            severity: context.vulnerability.severity,
            description: context.vulnerability.description,
            file_path: context.vulnerability.filePath
          } : undefined,
          current_file: context.currentFile,
          recent_fix: context.recentFix
        }
      };

      ws.send(JSON.stringify(request));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'chat_chunk') {
        fullContent += data.content || '';
        callbacks.onChunk(data.content || '', data.done);

        if (data.done) {
          callbacks.onComplete(data.full_content || fullContent);
          ws.close();
          this.activeConnections.delete(connectionId);
        }
      } else if (data.type === 'chat_error') {
        callbacks.onError(new Error(data.message));
        ws.close();
        this.activeConnections.delete(connectionId);
      }
    };

    ws.onerror = () => {
      callbacks.onError(new Error('Chat WebSocket connection error'));
      this.activeConnections.delete(connectionId);
    };

    ws.onclose = () => {
      this.activeConnections.delete(connectionId);
    };

    this.activeConnections.set(connectionId, ws);
  }

  /**
   * Execute a quick action (explain, owasp, alternative, test_cases, impact)
   * Connects to: /api/fix/ws/chat
   */
  async quickAction(
    action: 'explain' | 'owasp' | 'alternative' | 'test_cases' | 'impact',
    vulnerability: Vulnerability,
    callbacks: {
      onChunk: (content: string, done: boolean) => void;
      onComplete: (fullContent: string) => void;
      onError: (error: Error) => void;
    }
  ): Promise<void> {
    const wsUrl = this.config.wsUrl || this.config.backendUrl.replace('http', 'ws');
    const ws = new WebSocket(`${wsUrl}/api/fix/ws/chat`);
    const connectionId = `action_${action}_${Date.now()}`;

    let fullContent = '';

    ws.onopen = () => {
      const request = {
        type: 'quick_action',
        action,
        vulnerability: {
          id: vulnerability.id,
          cwe: typeof vulnerability.cwe === 'object' ? vulnerability.cwe.id : vulnerability.cwe,
          severity: vulnerability.severity,
          description: vulnerability.description,
          file_path: vulnerability.filePath
        }
      };

      ws.send(JSON.stringify(request));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'chat_chunk') {
        fullContent += data.content || '';
        callbacks.onChunk(data.content || '', data.done);

        if (data.done) {
          callbacks.onComplete(data.full_content || fullContent);
          ws.close();
          this.activeConnections.delete(connectionId);
        }
      } else if (data.type === 'chat_error') {
        callbacks.onError(new Error(data.message));
        ws.close();
        this.activeConnections.delete(connectionId);
      }
    };

    ws.onerror = () => {
      callbacks.onError(new Error('Quick action WebSocket connection error'));
      this.activeConnections.delete(connectionId);
    };

    ws.onclose = () => {
      this.activeConnections.delete(connectionId);
    };

    this.activeConnections.set(connectionId, ws);
  }

  /**
   * Dispose and clean up
   */
  dispose(): void {
    for (const ws of this.activeConnections.values()) {
      ws.close();
    }
    this.activeConnections.clear();
  }
}
