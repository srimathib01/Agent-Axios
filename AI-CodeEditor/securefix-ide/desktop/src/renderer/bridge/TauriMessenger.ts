import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event';
import type {
  Messenger,
  GuiToCoreMessage,
  CoreToGuiMessage,
  ExtensionToCoreMessage,
  CoreToExtensionMessage,
} from '@securefix/core';

/**
 * TauriMessenger - Handles message passing between Core and GUI layers
 * in the Tauri desktop application.
 *
 * Replaces ElectronMessenger from the Electron version.
 * Uses Tauri events for communication instead of Electron IPC.
 */
export class TauriMessenger {
  private guiMessageHandlers: Array<(message: GuiToCoreMessage) => void> = [];
  private coreMessageHandlers: Array<(message: CoreToGuiMessage) => void> = [];
  private extensionMessageHandlers: Array<(message: ExtensionToCoreMessage) => void> = [];
  private coreToExtensionHandlers: Array<(message: CoreToExtensionMessage) => void> = [];

  private unlistenFunctions: UnlistenFn[] = [];
  private initialized = false;

  constructor() {
    this.setupListeners();
  }

  private async setupListeners(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // Listen for GUI -> Core messages (from React components)
    const unlistenGuiToCore = await listen<GuiToCoreMessage>('gui-to-core', (event) => {
      this.guiMessageHandlers.forEach((handler) => handler(event.payload));
    });
    this.unlistenFunctions.push(unlistenGuiToCore);

    // Listen for Core -> GUI messages (responses from Core)
    const unlistenCoreToGui = await listen<CoreToGuiMessage>('core-to-gui', (event) => {
      this.coreMessageHandlers.forEach((handler) => handler(event.payload));
    });
    this.unlistenFunctions.push(unlistenCoreToGui);

    // Listen for Extension -> Core messages (file events, etc.)
    const unlistenExtToCore = await listen<ExtensionToCoreMessage>('extension-to-core', (event) => {
      this.extensionMessageHandlers.forEach((handler) => handler(event.payload));
    });
    this.unlistenFunctions.push(unlistenExtToCore);

    // Listen for Core -> Extension messages (decorations, etc.)
    const unlistenCoreToExt = await listen<CoreToExtensionMessage>('core-to-extension', (event) => {
      this.coreToExtensionHandlers.forEach((handler) => handler(event.payload));
    });
    this.unlistenFunctions.push(unlistenCoreToExt);
  }

  /**
   * Creates a messenger for GUI <-> Core communication.
   * Used by the GUI layer to send requests to Core and receive responses.
   */
  createGuiMessenger(): Messenger<GuiToCoreMessage, CoreToGuiMessage> {
    return {
      send: (message: GuiToCoreMessage) => {
        // Send to Core via Tauri event
        emit('gui-to-core', message).catch(console.error);
        // Also dispatch locally for immediate Core processing
        this.guiMessageHandlers.forEach((handler) => handler(message));
      },
      onMessage: (handler: (message: CoreToGuiMessage) => void) => {
        this.coreMessageHandlers.push(handler);
      },
    };
  }

  /**
   * Creates a messenger for Core communication.
   * Used by Core to receive GUI messages and send responses.
   */
  createCoreMessenger(): Messenger<CoreToGuiMessage, GuiToCoreMessage> {
    return {
      send: (message: CoreToGuiMessage) => {
        // Send response to GUI via Tauri event
        emit('core-to-gui', message).catch(console.error);
        // Also dispatch locally
        this.coreMessageHandlers.forEach((handler) => handler(message));
      },
      onMessage: (handler: (message: GuiToCoreMessage) => void) => {
        this.guiMessageHandlers.push(handler);
      },
    };
  }

  /**
   * Creates a messenger for Extension <-> Core communication.
   * Used for IDE-specific events like file open/change, editor selection, etc.
   */
  createExtensionMessenger(): Messenger<ExtensionToCoreMessage, CoreToExtensionMessage> {
    return {
      send: (message: ExtensionToCoreMessage) => {
        emit('extension-to-core', message).catch(console.error);
        this.extensionMessageHandlers.forEach((handler) => handler(message));
      },
      onMessage: (handler: (message: CoreToExtensionMessage) => void) => {
        this.coreToExtensionHandlers.push(handler);
      },
    };
  }

  /**
   * Creates a messenger for Core to send messages to Extension.
   */
  createCoreToExtensionMessenger(): Messenger<CoreToExtensionMessage, ExtensionToCoreMessage> {
    return {
      send: (message: CoreToExtensionMessage) => {
        emit('core-to-extension', message).catch(console.error);
        this.coreToExtensionHandlers.forEach((handler) => handler(message));
      },
      onMessage: (handler: (message: ExtensionToCoreMessage) => void) => {
        this.extensionMessageHandlers.push(handler);
      },
    };
  }

  /**
   * Helper: Send a file opened event (typically from file explorer or menu)
   */
  sendFileOpened(fileUri: string, content: string, language: string): void {
    const message: ExtensionToCoreMessage = {
      type: 'file_opened',
      id: `msg-${Date.now()}`,
      timestamp: Date.now(),
      fileUri,
      content,
      language,
    };
    emit('extension-to-core', message).catch(console.error);
    this.extensionMessageHandlers.forEach((handler) => handler(message));
  }

  /**
   * Helper: Send a file changed event
   */
  sendFileChanged(fileUri: string, content: string): void {
    const message: ExtensionToCoreMessage = {
      type: 'file_changed',
      id: `msg-${Date.now()}`,
      timestamp: Date.now(),
      fileUri,
      content,
    };
    emit('extension-to-core', message).catch(console.error);
    this.extensionMessageHandlers.forEach((handler) => handler(message));
  }

  /**
   * Helper: Send editor selection event
   */
  sendEditorSelection(fileUri: string, startLine: number, endLine: number, selectedText: string): void {
    const message: ExtensionToCoreMessage = {
      type: 'editor_selection',
      id: `msg-${Date.now()}`,
      timestamp: Date.now(),
      fileUri,
      startLine,
      endLine,
      selectedText,
    };
    emit('extension-to-core', message).catch(console.error);
    this.extensionMessageHandlers.forEach((handler) => handler(message));
  }

  /**
   * Cleanup all listeners
   */
  dispose(): void {
    this.unlistenFunctions.forEach((unlisten) => unlisten());
    this.unlistenFunctions = [];
    this.guiMessageHandlers = [];
    this.coreMessageHandlers = [];
    this.extensionMessageHandlers = [];
    this.coreToExtensionHandlers = [];
    this.initialized = false;
  }
}

// Singleton instance
let messengerInstance: TauriMessenger | null = null;

export function getTauriMessenger(): TauriMessenger {
  if (!messengerInstance) {
    messengerInstance = new TauriMessenger();
  }
  return messengerInstance;
}

// Re-export with compatible name for easier migration
export { getTauriMessenger as getMessenger };
