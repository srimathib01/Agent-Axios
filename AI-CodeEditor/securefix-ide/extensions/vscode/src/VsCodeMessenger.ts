/**
 * VsCodeMessenger
 *
 * Handles message routing between Core, Extension, and GUI layers.
 * Implements the Messenger interface for each communication channel.
 */

import * as vscode from 'vscode';
import type {
  Messenger,
  GuiToCoreMessage,
  CoreToGuiMessage,
  ExtensionToCoreMessage,
  CoreToExtensionMessage,
  FileOpenedMessage,
  FileChangedMessage,
  FileSavedMessage,
  WorkspaceOpenedMessage,
  EditorSelectionMessage
} from '@securefix/core';
import type { SecureFixCore } from '@securefix/core';

type GuiMessageHandler = (message: GuiToCoreMessage) => void | Promise<void>;
type CoreToGuiHandler = (message: CoreToGuiMessage) => void;
type ExtensionMessageHandler = (message: ExtensionToCoreMessage) => void | Promise<void>;
type CoreToExtensionHandler = (message: CoreToExtensionMessage) => void;

export class VsCodeMessenger {
  private core: SecureFixCore;
  private webview: vscode.Webview | undefined;

  private guiMessageHandlers: Set<GuiMessageHandler> = new Set();
  private coreToGuiHandlers: Set<CoreToGuiHandler> = new Set();
  private extensionMessageHandlers: Set<ExtensionMessageHandler> = new Set();
  private coreToExtensionHandlers: Set<CoreToExtensionHandler> = new Set();

  constructor(core: SecureFixCore) {
    this.core = core;
  }

  /**
   * Set the webview for GUI communication
   */
  setWebview(webview: vscode.Webview): void {
    this.webview = webview;

    // Listen for messages from webview
    webview.onDidReceiveMessage((message: GuiToCoreMessage) => {
      console.log('[Messenger] Received GUI message:', message.type);
      for (const handler of this.guiMessageHandlers) {
        handler(message);
      }
    });
  }

  /**
   * Create messenger for GUI <-> Core communication
   */
  createGuiMessenger(): Messenger<GuiToCoreMessage, CoreToGuiMessage> {
    return {
      onMessage: (handler: GuiMessageHandler) => {
        this.guiMessageHandlers.add(handler);
      },
      sendMessage: (message: CoreToGuiMessage) => {
        console.log('[Messenger] Sending to GUI:', message.type);
        if (this.webview) {
          this.webview.postMessage(message);
        }
        for (const handler of this.coreToGuiHandlers) {
          handler(message);
        }
      },
      dispose: () => {
        this.guiMessageHandlers.clear();
        this.coreToGuiHandlers.clear();
      }
    };
  }

  /**
   * Create messenger for Extension <-> Core communication
   */
  createExtensionMessenger(): Messenger<ExtensionToCoreMessage, CoreToExtensionMessage> {
    return {
      onMessage: (handler: ExtensionMessageHandler) => {
        this.extensionMessageHandlers.add(handler);
      },
      sendMessage: (message: CoreToExtensionMessage) => {
        console.log('[Messenger] Core -> Extension:', message.type);
        for (const handler of this.coreToExtensionHandlers) {
          handler(message);
        }
      },
      dispose: () => {
        this.extensionMessageHandlers.clear();
        this.coreToExtensionHandlers.clear();
      }
    };
  }

  /**
   * Subscribe to Core -> Extension messages
   */
  onExtensionMessage(handler: CoreToExtensionHandler): void {
    this.coreToExtensionHandlers.add(handler);
  }

  /**
   * Subscribe to Core -> GUI messages
   */
  onGuiMessage(handler: CoreToGuiHandler): void {
    this.coreToGuiHandlers.add(handler);
  }

  // === Extension event helpers ===

  sendFileOpened(fileUri: string, language: string, content: string): void {
    const message: FileOpenedMessage = {
      id: `msg-${Date.now()}`,
      timestamp: Date.now(),
      type: 'file_opened',
      fileUri,
      language,
      content
    };

    for (const handler of this.extensionMessageHandlers) {
      handler(message);
    }
  }

  sendFileChanged(fileUri: string, content: string): void {
    const message: FileChangedMessage = {
      id: `msg-${Date.now()}`,
      timestamp: Date.now(),
      type: 'file_changed',
      fileUri,
      content
    };

    for (const handler of this.extensionMessageHandlers) {
      handler(message);
    }
  }

  sendFileSaved(fileUri: string): void {
    const message: FileSavedMessage = {
      id: `msg-${Date.now()}`,
      timestamp: Date.now(),
      type: 'file_saved',
      fileUri
    };

    for (const handler of this.extensionMessageHandlers) {
      handler(message);
    }
  }

  sendWorkspaceOpened(workspacePath: string): void {
    // Get all files in workspace (simplified - in practice would use glob)
    const message: WorkspaceOpenedMessage = {
      id: `msg-${Date.now()}`,
      timestamp: Date.now(),
      type: 'workspace_opened',
      workspacePath,
      files: []
    };

    for (const handler of this.extensionMessageHandlers) {
      handler(message);
    }
  }

  sendEditorSelection(
    fileUri: string,
    startLine: number,
    endLine: number,
    startColumn: number,
    endColumn: number,
    selectedText: string
  ): void {
    const message: EditorSelectionMessage = {
      id: `msg-${Date.now()}`,
      timestamp: Date.now(),
      type: 'editor_selection',
      fileUri,
      startLine,
      endLine,
      startColumn,
      endColumn,
      selectedText
    };

    for (const handler of this.extensionMessageHandlers) {
      handler(message);
    }
  }
}
