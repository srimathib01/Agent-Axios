import { useCallback, useEffect, useState } from 'react';
import { store } from '../store';
import {
  setVulnerabilities,
  markAsFixed,
  setScanProgress,
  setScanStatus,
  setInitialState,
} from '../store/vulnerabilitySlice';
import {
  addMessage,
  appendToMessage,
  setLoading as setChatLoading,
  setStreamingMessageId,
} from '../store/chatSlice';
import {
  addDiffZone,
  appendFixStreamContent,
  completeFixStream,
  startFixStream,
  applyDiffZone,
  rejectDiffZone,
  setDiffZones,
  clearFixStream,
  setFixStreamError,
} from '../store/diffSlice';
import type { DiffZone } from '../store/diffSlice';
import { backendService } from '../services/backendService';

// Runtime API types
declare global {
  interface Window {
    vscode?: {
      postMessage: (message: unknown) => void;
      getState: () => unknown;
      setState: (state: unknown) => void;
    };
    postMessageToExtension?: (message: unknown) => void;
    // Tauri globals (exposed via withGlobalTauri in tauri.conf.json)
    __TAURI__?: {
      event: {
        emit: (event: string, payload?: unknown) => Promise<void>;
        listen: <T>(event: string, handler: (event: { payload: T }) => void) => Promise<() => void>;
      };
    };
    // Electron API (exposed by preload script)
    electronAPI?: {
      sendMessage: (channel: string, data: unknown) => void;
      onMessage: (channel: string, callback: (data: unknown) => void) => () => void;
    };
    // Flag to track if message listener is already set up (singleton pattern)
    __SECUREFIX_LISTENER_INITIALIZED__?: boolean;
  }
}

// Detect runtime environment - check Tauri first since it's more specific
const isTauri = typeof window !== 'undefined' && !!window.__TAURI__;
const isElectron = typeof window !== 'undefined' && !!window.electronAPI && !isTauri;

interface Message {
  type: string;
  id: string;
  timestamp: number;
  [key: string]: unknown;
}

// Singleton state for the global message listener
// Exported for app-level cleanup (e.g., hot reload, test teardown)
// eslint-disable-next-line import/no-mutable-exports
export let _globalCleanup: (() => void) | null = null;
let listenerInitialized = false;

/**
 * Handle incoming messages from the core/extension layer.
 * This function dispatches actions to the Redux store.
 * Uses the store directly to avoid dependency on component dispatch.
 */
function handleIncomingMessage(message: Message): void {
  console.log('[GUI] Received message:', message.type);

  switch (message.type) {
    case 'initial_state':
      store.dispatch(
        setInitialState({
          vulnerabilities: (message.vulnerabilities as []) || [],
        })
      );
      if (message.diffZones) {
        store.dispatch(setDiffZones(message.diffZones as []));
      }
      break;

    case 'vulnerability_list':
      store.dispatch(setVulnerabilities((message.vulnerabilities as []) || []));
      break;

    case 'scan_progress':
      store.dispatch(setScanProgress(message.progress as number));
      store.dispatch(setScanStatus(message.status as 'idle' | 'scanning' | 'completed' | 'failed'));
      break;

    case 'scan_complete':
      store.dispatch(setScanStatus('completed'));
      if (message.result && (message.result as { vulnerabilities: [] }).vulnerabilities) {
        store.dispatch(setVulnerabilities((message.result as { vulnerabilities: [] }).vulnerabilities));
      }
      break;

    case 'fix_stream_chunk':
      if (message.content) {
        store.dispatch(appendFixStreamContent(message.content as string));
      }
      if (message.done) {
        store.dispatch(completeFixStream());
      }
      break;

    case 'fix_complete':
      if (message.diffZone) {
        store.dispatch(addDiffZone(message.diffZone as any));
      }
      break;

    case 'fix_applied':
      store.dispatch(applyDiffZone(message.diffZoneId as string));
      store.dispatch(markAsFixed(message.vulnerabilityId as string));
      break;

    case 'fix_rejected':
      store.dispatch(rejectDiffZone(message.diffZoneId as string));
      break;

    case 'chat_response_chunk':
      if (message.replyTo) {
        store.dispatch(
          appendToMessage({
            id: message.replyTo as string,
            content: message.content as string,
          })
        );
      }
      if (message.done) {
        store.dispatch(setStreamingMessageId(null));
        store.dispatch(setChatLoading(false));
      }
      break;

    case 'chat_response_complete':
      store.dispatch(setStreamingMessageId(null));
      store.dispatch(setChatLoading(false));
      break;

    case 'error':
      console.error('[GUI] Error from extension:', message.error);
      break;

    case 'notification':
      // Could show a toast or notification
      console.log('[GUI] Notification:', message.message);
      break;

    default:
      console.log('[GUI] Unknown message type:', message.type);
  }
}

/**
 * Initialize the global message listener (singleton).
 * Only sets up the listener once, regardless of how many components use the hook.
 */
async function initializeGlobalListener(): Promise<void> {
  // Prevent multiple initializations
  if (listenerInitialized || window.__SECUREFIX_LISTENER_INITIALIZED__) {
    return;
  }

  listenerInitialized = true;
  window.__SECUREFIX_LISTENER_INITIALIZED__ = true;

  if (isTauri && window.__TAURI__) {
    // Tauri: Listen via Tauri event system
    try {
      const unlisten = await window.__TAURI__.event.listen<Message>('core-to-gui', (event) => {
        handleIncomingMessage(event.payload);
      });
      _globalCleanup = unlisten;
      console.log('[GUI] Tauri event listener set up for core-to-gui (singleton)');
    } catch (err) {
      console.error('[GUI] Failed to set up Tauri listener:', err);
      listenerInitialized = false;
      window.__SECUREFIX_LISTENER_INITIALIZED__ = false;
    }
  } else if (isElectron && window.electronAPI) {
    // Electron: Listen via IPC
    _globalCleanup = window.electronAPI.onMessage('core-to-gui', (data) => {
      handleIncomingMessage(data as Message);
    });
    console.log('[GUI] Electron IPC listener set up (singleton)');
  } else {
    // VS Code: Listen via custom events
    const listener = (event: CustomEvent<Message>) => {
      handleIncomingMessage(event.detail);
    };
    window.addEventListener('securefix-message', listener as EventListener);
    _globalCleanup = () => {
      window.removeEventListener('securefix-message', listener as EventListener);
    };
    console.log('[GUI] VS Code event listener set up (singleton)');
  }
}

export function useMessaging() {
  const [isReady, setIsReady] = useState(listenerInitialized);

  // Set up message listener (singleton - only initializes once globally)
  useEffect(() => {
    // Initialize the global listener if not already done
    if (!listenerInitialized) {
      initializeGlobalListener().then(() => {
        setIsReady(true);
      });
    } else {
      setIsReady(true);
    }

    // Note: We don't clean up the global listener on unmount
    // because other components may still need it.
    // The listener persists for the lifetime of the app.
  }, []);

  // Send message to extension/core
  const sendMessage = useCallback((message: Message) => {
    console.log('[GUI] Sending message:', message.type);

    if (isTauri && window.__TAURI__) {
      // Tauri: Send via Tauri event system
      window.__TAURI__.event.emit('gui-to-core', message).catch((err) => {
        console.error('[GUI] Failed to emit Tauri event:', err);
      });
    } else if (isElectron && window.electronAPI) {
      // Electron: Send via IPC
      window.electronAPI.sendMessage('gui-to-core', message);
    } else if (window.postMessageToExtension) {
      // VS Code: Custom message transport
      window.postMessageToExtension(message);
    } else if (window.vscode) {
      // VS Code: Standard webview API
      window.vscode.postMessage(message);
    } else {
      console.warn('[GUI] No message transport available');
    }
  }, []);

  // Fix generation - directly connects to backend WebSocket
  const requestFix = useCallback(
    (vulnerabilityId: string, codeContext: Record<string, unknown>, vulnerability?: Record<string, unknown>) => {
      // Prevent duplicate fix requests - check if one is already in progress
      const currentState = store.getState();
      if (currentState.diff.fixStream && !currentState.diff.fixStream.isComplete) {
        console.log('[GUI] Fix already in progress, ignoring duplicate requestFix');
        return;
      }

      store.dispatch(startFixStream(vulnerabilityId));

      backendService.generateFix(
        vulnerability || {},
        codeContext,
        {
          onChunk: (content: string) => {
            store.dispatch(appendFixStreamContent(content));
          },
          onComplete: (data) => {
            console.log('[GUI] Fix onComplete received:', {
              searchBlocks: data.searchBlocks.length,
              replaceBlocks: data.replaceBlocks.length,
              fullContentLen: data.fullContent.length,
            });

            store.dispatch(completeFixStream());

            // Create DiffZone with search/replace blocks
            if (data.searchBlocks.length > 0 && data.replaceBlocks.length > 0) {
              const filePath = (codeContext.fileUri || codeContext.file_path || '') as string;
              console.log('[GUI] Creating DiffZone for:', filePath);
              console.log('[GUI] Search block preview:', data.searchBlocks[0].substring(0, 100));
              console.log('[GUI] Replace block preview:', data.replaceBlocks[0].substring(0, 100));

              const diffZone: DiffZone = {
                id: `fix-${Date.now()}`,
                fileUri: filePath,
                startLine: (codeContext.startLine || codeContext.start_line || 1) as number,
                endLine: (codeContext.endLine || codeContext.end_line || 1) as number,
                originalContent: data.searchBlocks.join('\n'),
                suggestedContent: data.replaceBlocks.join('\n'),
                status: 'pending',
                vulnerabilityId,
                searchBlocks: data.searchBlocks,
                replaceBlocks: data.replaceBlocks,
                filePath,
              };
              store.dispatch(addDiffZone(diffZone));
              console.log('[GUI] DiffZone dispatched:', diffZone.id);
            } else {
              console.warn('[GUI] No search/replace blocks found in fix response!');
              console.warn('[GUI] Full content:', data.fullContent.substring(0, 500));
            }

            store.dispatch(clearFixStream());
          },
          onError: (error: string) => {
            console.error('[GUI] Fix generation error:', error);
            store.dispatch(setFixStreamError(error));
          },
        }
      );
    },
    []
  );

  // Apply fix - calls backend HTTP endpoint to modify the file
  const applyFix = useCallback(
    async (diffZoneId: string) => {
      const state = store.getState();
      const zone = state.diff.diffZones.find((z: DiffZone) => z.id === diffZoneId);
      if (!zone) {
        console.error('[GUI] DiffZone not found:', diffZoneId);
        return;
      }

      try {
        // Apply each search/replace block
        for (let i = 0; i < zone.searchBlocks.length; i++) {
          await backendService.applyFix(
            zone.filePath,
            zone.searchBlocks[i],
            zone.replaceBlocks[i],
            zone.vulnerabilityId
          );
        }

        // Update Redux state on success
        store.dispatch(applyDiffZone(diffZoneId));
        store.dispatch(markAsFixed(zone.vulnerabilityId));
        console.log('[GUI] Fix applied successfully to:', zone.filePath);
      } catch (error) {
        console.error('[GUI] Failed to apply fix:', error);
        // Could dispatch an error state here
      }
    },
    []
  );

  // Reject fix - calls backend and updates state
  const rejectFix = useCallback(
    async (diffZoneId: string) => {
      const state = store.getState();
      const zone = state.diff.diffZones.find((z: DiffZone) => z.id === diffZoneId);

      store.dispatch(rejectDiffZone(diffZoneId));

      if (zone) {
        try {
          await backendService.rejectFix(zone.vulnerabilityId, 'User rejected');
        } catch (error) {
          console.error('[GUI] Failed to notify backend of rejection:', error);
        }
      }
    },
    []
  );

  const scanRepository = useCallback(
    (repositoryPath: string) => {
      store.dispatch(setScanStatus('scanning'));
      store.dispatch(setScanProgress(0));
      sendMessage({
        type: 'scan_repository',
        id: `msg-${Date.now()}`,
        timestamp: Date.now(),
        repositoryPath,
      });
    },
    [sendMessage]
  );

  const sendChatMessage = useCallback(
    (content: string, context?: { currentFile?: string; selectedVulnerability?: string; vulnerability?: Record<string, unknown> }) => {
      const messageId = `msg-${Date.now()}`;

      // Add user message
      store.dispatch(
        addMessage({
          id: `user-${Date.now()}`,
          role: 'user',
          content,
          timestamp: Date.now(),
        })
      );

      // Add placeholder for assistant response
      store.dispatch(
        addMessage({
          id: messageId,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          isStreaming: true,
        })
      );

      store.dispatch(setStreamingMessageId(messageId));
      store.dispatch(setChatLoading(true));

      // Use direct backend WebSocket for chat
      backendService.chat(
        content,
        {
          vulnerability: context?.vulnerability || {},
          currentFile: context?.currentFile || '',
        },
        {
          onChunk: (chunk: string) => {
            store.dispatch(appendToMessage({ id: messageId, content: chunk }));
          },
          onComplete: () => {
            store.dispatch(setStreamingMessageId(null));
            store.dispatch(setChatLoading(false));
          },
          onError: (error: string) => {
            console.error('[GUI] Chat error:', error);
            store.dispatch(appendToMessage({ id: messageId, content: `\n\n*Error: ${error}*` }));
            store.dispatch(setStreamingMessageId(null));
            store.dispatch(setChatLoading(false));
          },
        }
      );
    },
    []
  );

  const navigateToVulnerability = useCallback(
    (vulnerabilityId: string) => {
      sendMessage({
        type: 'navigate_to_vulnerability',
        id: `msg-${Date.now()}`,
        timestamp: Date.now(),
        vulnerabilityId,
      });
    },
    [sendMessage]
  );

  const requestQuickAction = useCallback(
    (
      action: 'explain' | 'owasp' | 'alternative' | 'test_cases' | 'impact',
      vulnerabilityId: string
    ) => {
      const messageId = `action-${Date.now()}`;

      // Add placeholder for assistant response
      store.dispatch(
        addMessage({
          id: messageId,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          isStreaming: true,
        })
      );

      store.dispatch(setStreamingMessageId(messageId));
      store.dispatch(setChatLoading(true));

      sendMessage({
        type: 'quick_action',
        id: messageId,
        timestamp: Date.now(),
        action,
        vulnerabilityId,
      });
    },
    [sendMessage]
  );

  return {
    isReady,
    sendMessage,
    requestFix,
    applyFix,
    rejectFix,
    scanRepository,
    sendChatMessage,
    navigateToVulnerability,
    requestQuickAction,
  };
}
