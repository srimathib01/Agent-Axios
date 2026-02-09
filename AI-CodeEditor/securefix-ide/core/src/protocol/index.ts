/**
 * SecureFix IDE Protocol
 *
 * This module defines the complete message-passing protocol between
 * the three layers of the SecureFix IDE architecture:
 *
 * 1. GUI Layer (React Webview) <-> Core Layer
 * 2. Core Layer <-> Extension Layer (VS Code)
 *
 * Following Continue.dev's pattern for decoupled, testable components.
 */

export * from './gui-to-core.js';
export * from './core-to-gui.js';
export * from './extension-messages.js';

import type { GuiToCoreMessage } from './gui-to-core.js';
import type { CoreToGuiMessage } from './core-to-gui.js';
import type { ExtensionToCoreMessage, CoreToExtensionMessage } from './extension-messages.js';

// Unified message type for all protocol messages
export type ProtocolMessage =
  | GuiToCoreMessage
  | CoreToGuiMessage
  | ExtensionToCoreMessage
  | CoreToExtensionMessage;

/**
 * Message handler interface
 * Components implement this to process incoming messages
 */
export interface MessageHandler<T extends ProtocolMessage> {
  handleMessage(message: T): void | Promise<void>;
}

/**
 * Message sender interface
 * Components use this to send messages to other layers
 */
export interface MessageSender<T extends ProtocolMessage> {
  sendMessage(message: T): void;
}

/**
 * Messenger interface combining handler and sender
 * The main interface for component communication
 */
export interface Messenger<TIncoming extends ProtocolMessage, TOutgoing extends ProtocolMessage> {
  onMessage(handler: (message: TIncoming) => void | Promise<void>): void;
  sendMessage(message: TOutgoing): void;
  dispose(): void;
}

/**
 * Create a unique message ID
 */
export function createMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a message with common fields populated
 */
export function createMessage<T extends ProtocolMessage>(
  type: T['type'],
  payload: Omit<T, 'id' | 'timestamp' | 'type'>
): T {
  return {
    id: createMessageId(),
    timestamp: Date.now(),
    type,
    ...payload
  } as T;
}
