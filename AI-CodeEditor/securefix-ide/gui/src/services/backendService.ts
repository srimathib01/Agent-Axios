/**
 * BackendService - Direct connection to the SecureFix AI Fix Engine backend.
 * Handles WebSocket streaming for fix generation and HTTP for apply/reject.
 */

const DEFAULT_BACKEND_URL = 'http://localhost:8000';

interface FixCallbacks {
  onChunk: (content: string) => void;
  onComplete: (data: {
    fullContent: string;
    searchBlocks: string[];
    replaceBlocks: string[];
  }) => void;
  onError: (error: string) => void;
}

interface ChatCallbacks {
  onChunk: (content: string) => void;
  onComplete: (fullContent: string) => void;
  onError: (error: string) => void;
}

/**
 * Parse SEARCH/REPLACE blocks from LLM output (client-side fallback).
 * Handles both <<<SEARCH\n...\n>>>\n<<<REPLACE\n...\n>>> format.
 */
function parseSearchReplaceBlocks(content: string): { searchBlocks: string[]; replaceBlocks: string[] } {
  const searchBlocks: string[] = [];
  const replaceBlocks: string[] = [];

  // Try paired SEARCH/REPLACE blocks
  const pairedRegex = /<<<SEARCH\s*\n([\s\S]*?)\n>>>\s*\n<<<REPLACE\s*\n([\s\S]*?)\n>>>/g;
  let match;
  while ((match = pairedRegex.exec(content)) !== null) {
    searchBlocks.push(match[1].trim());
    replaceBlocks.push(match[2].trim());
  }

  // If paired didn't work, try extracting them separately
  if (searchBlocks.length === 0) {
    const searchRegex = /<<<SEARCH\s*\n([\s\S]*?)\n>>>/g;
    const replaceRegex = /<<<REPLACE\s*\n([\s\S]*?)\n>>>/g;

    let sm;
    while ((sm = searchRegex.exec(content)) !== null) {
      searchBlocks.push(sm[1].trim());
    }
    let rm;
    while ((rm = replaceRegex.exec(content)) !== null) {
      replaceBlocks.push(rm[1].trim());
    }
  }

  return { searchBlocks, replaceBlocks };
}

class BackendService {
  private baseUrl: string;
  private wsUrl: string;
  private activeConnections: Map<string, WebSocket> = new Map();
  private activeFixId: string | null = null;
  private lastFixRequestTime = 0;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || DEFAULT_BACKEND_URL;
    this.wsUrl = this.baseUrl.replace(/^http/, 'ws');
  }

  /**
   * Generate a fix via WebSocket streaming.
   * Connects to /api/fix/ws/fix
   * Prevents duplicate connections with debounce + lock.
   */
  generateFix(
    vulnerability: Record<string, unknown>,
    codeContext: Record<string, unknown>,
    callbacks: FixCallbacks
  ): () => void {
    const now = Date.now();

    // Hard debounce: ignore calls within 2 seconds of the last one
    if (now - this.lastFixRequestTime < 2000) {
      console.log('[BackendService] Ignoring duplicate fix request (debounce)');
      return () => {};
    }

    // If a fix is already in progress, ignore (don't cancel-and-restart)
    if (this.activeFixId) {
      console.log('[BackendService] Fix already in progress, ignoring duplicate');
      return () => {};
    }

    this.lastFixRequestTime = now;

    const wsUrl = `${this.wsUrl}/api/fix/ws/fix`;
    console.log('[BackendService] Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);
    const connectionId = `fix_${now}`;
    this.activeFixId = connectionId;

    let fullContent = '';

    ws.onopen = () => {
      // Double check this is still the active fix (could have been cancelled)
      if (this.activeFixId !== connectionId) {
        console.log('[BackendService] Fix was superseded, closing');
        ws.close();
        return;
      }

      console.log('[BackendService] WebSocket connected, sending fix request');
      const request = {
        type: 'fix_request',
        vulnerability: {
          cwe: vulnerability.cwe || '',
          severity: vulnerability.severity || 'medium',
          description: vulnerability.description || '',
          recommendation: vulnerability.recommendation || '',
          owasp: vulnerability.owasp || '',
        },
        codeContext: {
          file_path: codeContext.fileUri || codeContext.file_path || '',
          start_line: codeContext.startLine || codeContext.start_line || 1,
          end_line: codeContext.endLine || codeContext.end_line || 1,
          vulnerable_code: codeContext.vulnerableCode || codeContext.vulnerable_code || '',
          surrounding_code: codeContext.surroundingCode || codeContext.surrounding_code || '',
          imports: codeContext.imports || [],
          language: codeContext.language || 'javascript',
        },
      };
      ws.send(JSON.stringify(request));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'fix_chunk') {
          if (data.content) {
            fullContent += data.content;
            callbacks.onChunk(data.content);
          }
          if (data.done) {
            // Use backend blocks if available, otherwise parse client-side
            let searchBlocks = data.search_blocks || [];
            let replaceBlocks = data.replace_blocks || [];

            // Client-side fallback parsing if backend returned empty
            if (searchBlocks.length === 0 || replaceBlocks.length === 0) {
              const rawContent = data.full_content || fullContent;
              console.log('[BackendService] Backend returned empty blocks, parsing client-side from', rawContent.length, 'chars');
              const parsed = parseSearchReplaceBlocks(rawContent);
              searchBlocks = parsed.searchBlocks;
              replaceBlocks = parsed.replaceBlocks;
            }

            console.log('[BackendService] Fix complete. Search blocks:', searchBlocks.length, 'Replace blocks:', replaceBlocks.length);

            callbacks.onComplete({
              fullContent: data.full_content || fullContent,
              searchBlocks,
              replaceBlocks,
            });

            this.activeFixId = null;
            ws.close();
            this.activeConnections.delete(connectionId);
          }
        } else if (data.type === 'fix_error') {
          console.error('[BackendService] Fix error:', data.message);
          callbacks.onError(data.message || 'Fix generation failed');
          this.activeFixId = null;
          ws.close();
          this.activeConnections.delete(connectionId);
        }
      } catch (err) {
        console.error('[BackendService] Parse error:', err);
        callbacks.onError(`Failed to parse response: ${err}`);
      }
    };

    ws.onerror = () => {
      console.error('[BackendService] WebSocket connection failed');
      callbacks.onError('Cannot connect to backend at ' + this.baseUrl + '. Make sure the backend server is running.');
      this.activeFixId = null;
      this.activeConnections.delete(connectionId);
    };

    ws.onclose = () => {
      if (this.activeFixId === connectionId) {
        this.activeFixId = null;
      }
      this.activeConnections.delete(connectionId);
    };

    this.activeConnections.set(connectionId, ws);

    // Return cancel function
    return () => {
      this.activeFixId = null;
      ws.close();
      this.activeConnections.delete(connectionId);
    };
  }

  /**
   * Apply an accepted fix by calling POST /api/fix/apply
   */
  async applyFix(
    filePath: string,
    searchBlock: string,
    replaceBlock: string,
    vulnerabilityId?: string
  ): Promise<{ status: string; message: string }> {
    const response = await fetch(`${this.baseUrl}/api/fix/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_path: filePath,
        search_block: searchBlock,
        replace_block: replaceBlock,
        vulnerability_id: vulnerabilityId,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `Apply failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Reject a fix by calling POST /api/fix/reject
   */
  async rejectFix(
    vulnerabilityId: string,
    reason: string = 'User rejected'
  ): Promise<{ status: string; message: string }> {
    const response = await fetch(`${this.baseUrl}/api/fix/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vulnerability_id: vulnerabilityId,
        reason,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `Reject failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Chat with AI via WebSocket streaming.
   * Connects to /api/fix/ws/chat
   */
  chat(
    message: string,
    context: Record<string, unknown>,
    callbacks: ChatCallbacks
  ): () => void {
    const ws = new WebSocket(`${this.wsUrl}/api/fix/ws/chat`);
    const connectionId = `chat_${Date.now()}`;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'chat_message',
        content: message,
        context,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'chat_chunk') {
          if (data.content) {
            callbacks.onChunk(data.content);
          }
          if (data.done) {
            callbacks.onComplete(data.full_content || '');
            ws.close();
            this.activeConnections.delete(connectionId);
          }
        } else if (data.type === 'chat_error') {
          callbacks.onError(data.message || 'Chat error');
          ws.close();
          this.activeConnections.delete(connectionId);
        }
      } catch (err) {
        callbacks.onError(`Failed to parse chat response: ${err}`);
      }
    };

    ws.onerror = () => {
      callbacks.onError('Chat WebSocket connection error');
      this.activeConnections.delete(connectionId);
    };

    ws.onclose = () => {
      this.activeConnections.delete(connectionId);
    };

    this.activeConnections.set(connectionId, ws);

    return () => {
      ws.close();
      this.activeConnections.delete(connectionId);
    };
  }

  dispose(): void {
    for (const ws of this.activeConnections.values()) {
      ws.close();
    }
    this.activeConnections.clear();
    this.activeFixId = null;
  }
}

// Singleton instance
export const backendService = new BackendService();
export default backendService;
