/**
 * Tauri API bindings - Replaces Electron's preload script
 *
 * This module provides the same API surface as the Electron version,
 * making migration seamless for the React components.
 */

import { invoke } from '@tauri-apps/api/core';
import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event';

// Types
export interface FileInfo {
  path: string;
  name: string;
  content: string;
  language: string;
}

export interface FolderInfo {
  path: string;
  name: string;
  files: FileTreeNode[];
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
}

// Agent-Axios integration types
export interface CachedRepository {
  name: string;
  path: string;
  source: string; // "python" or "node"
}

// Internal type for Rust serialization (node_type instead of type)
interface RawFileTreeNode {
  name: string;
  path: string;
  node_type: string;
  children?: RawFileTreeNode[];
}

// Convert Rust's node_type to our type field
function convertFileTree(nodes: RawFileTreeNode[]): FileTreeNode[] {
  return nodes.map(node => ({
    name: node.name,
    path: node.path,
    type: node.node_type as 'file' | 'directory',
    children: node.children ? convertFileTree(node.children) : undefined,
  }));
}

// Store for event listeners
const eventHandlers: Map<string, Set<(data: any) => void>> = new Map();
const unlistenFunctions: Map<string, UnlistenFn> = new Map();

// Setup event listener for a channel
async function setupListener(channel: string): Promise<void> {
  if (unlistenFunctions.has(channel)) return;

  const unlisten = await listen<any>(channel, (event) => {
    const handlers = eventHandlers.get(channel);
    if (handlers) {
      handlers.forEach(handler => handler(event.payload));
    }
  });

  unlistenFunctions.set(channel, unlisten);
}

/**
 * TauriAPI - Drop-in replacement for ElectronAPI
 * Provides the same interface for seamless migration
 */
export const tauriAPI = {
  // ============ File Operations ============

  async openFile(): Promise<FileInfo | null> {
    const result = await invoke<FileInfo | null>('open_file_dialog');
    return result;
  },

  async openFolder(): Promise<FolderInfo | null> {
    const result = await invoke<{ path: string; name: string; files: RawFileTreeNode[] } | null>('open_folder_dialog');
    if (!result) return null;
    return {
      path: result.path,
      name: result.name,
      files: convertFileTree(result.files),
    };
  },

  async saveFileDialog(defaultPath?: string): Promise<string | null> {
    return invoke<string | null>('save_file_dialog', { defaultPath });
  },

  async readFile(path: string): Promise<FileInfo> {
    return invoke<FileInfo>('read_file', { path });
  },

  async writeFile(path: string, content: string): Promise<void> {
    return invoke('write_file', { path, content });
  },

  async fileExists(path: string): Promise<boolean> {
    return invoke<boolean>('file_exists', { path });
  },

  async getFileTree(dirPath: string): Promise<FileTreeNode[]> {
    const result = await invoke<RawFileTreeNode[]>('get_file_tree', { dirPath });
    return convertFileTree(result);
  },

  // ============ Window Controls ============

  minimize(): void {
    invoke('minimize_window').catch(console.error);
  },

  maximize(): void {
    invoke('maximize_window').catch(console.error);
  },

  close(): void {
    invoke('close_window').catch(console.error);
  },

  // ============ Messaging ============

  sendMessage(channel: string, data: any): void {
    emit(channel, data).catch(console.error);
  },

  onMessage(channel: string, callback: (data: any) => void): () => void {
    if (!eventHandlers.has(channel)) {
      eventHandlers.set(channel, new Set());
      setupListener(channel);
    }

    eventHandlers.get(channel)!.add(callback);

    // Return cleanup function
    return () => {
      const handlers = eventHandlers.get(channel);
      if (handlers) {
        handlers.delete(callback);
        if (handlers.size === 0) {
          eventHandlers.delete(channel);
          const unlisten = unlistenFunctions.get(channel);
          if (unlisten) {
            unlisten();
            unlistenFunctions.delete(channel);
          }
        }
      }
    };
  },

  async invoke<T>(channel: string, ...args: any[]): Promise<T> {
    return invoke<T>(channel, { args });
  },

  // ============ App Info ============

  async getVersion(): Promise<string> {
    return invoke<string>('get_app_version');
  },

  async getPlatform(): Promise<string> {
    return invoke<string>('get_platform');
  },

  async getName(): Promise<string> {
    return invoke<string>('get_app_name');
  },

  // ============ Agent-Axios Integration ============

  async listCachedRepositories(): Promise<CachedRepository[]> {
    return invoke<CachedRepository[]>('list_cached_repositories');
  },

  async listAnalysisReports(): Promise<number[]> {
    const reportsDir = '../../../Agent-Axios/agent-axios-backend/data/reports';
    return invoke<number[]>('list_analysis_reports', { reportsDir });
  },

  async readAgentAxiosReport(analysisId: number): Promise<string | null> {
    const reportPath = `agent-axios-backend/data/reports/analysis_${analysisId}/analysis_${analysisId}.json`;
    try {
      return await invoke<string>('read_agent_axios_report', { reportPath });
    } catch {
      return null;
    }
  },

  async getRepositoryLocalPath(repoUrl: string): Promise<string | null> {
    const pythonReposDir = 'agent-axios-backend/data/cache/repositories';
    const nodeReposDir = 'agent-axios-node-backend/data/repositories';
    return invoke<string | null>('get_repository_local_path', {
      repoUrl,
      pythonReposDir,
      nodeReposDir,
    });
  },

  async openAgentAxiosRepository(repoPath: string): Promise<FolderInfo | null> {
    try {
      const result = await invoke<{ path: string; name: string; files: RawFileTreeNode[] }>('open_agent_axios_repository', { repoPath });
      return {
        path: result.path,
        name: result.name,
        files: convertFileTree(result.files),
      };
    } catch {
      return null;
    }
  },

  // ============ Menu Action Handler ============

  onMenuAction(callback: (action: string, data?: any) => void): () => void {
    const menuChannels = [
      'open-file',
      'open-folder',
      'save-file',
      'save-file-as',
      'clone-repository',
      'find',
      'find-replace',
      'toggle-vulnerability-panel',
      'toggle-chat-panel',
      'scan-workspace',
      'fix-vulnerability',
      'accept-fix',
      'reject-fix',
      'next-vulnerability',
      'prev-vulnerability',
      'open-settings',
      'show-about',
    ];

    const cleanups: Array<() => void> = [];

    menuChannels.forEach((channel) => {
      const cleanup = this.onMessage(channel, (data) => callback(channel, data));
      cleanups.push(cleanup);
    });

    return () => {
      cleanups.forEach(cleanup => cleanup());
    };
  },
};

// Export for global access (similar to window.electronAPI)
declare global {
  interface Window {
    tauriAPI: typeof tauriAPI;
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.tauriAPI = tauriAPI;
}

export default tauriAPI;
