/**
 * Message types from GUI to Core
 * These are requests initiated by user interactions in the webview
 */

import type { CodeContext } from '../types/code-context.js';

// Base message interface
export interface GuiToCoreMessageBase {
  id: string;
  timestamp: number;
}

// Request to generate a fix for a vulnerability
export interface RequestFixMessage extends GuiToCoreMessageBase {
  type: 'request_fix';
  vulnerabilityId: string;
  codeContext: CodeContext;
}

// Apply a suggested fix
export interface ApplyFixMessage extends GuiToCoreMessageBase {
  type: 'apply_fix';
  diffZoneId: string;
}

// Reject a suggested fix
export interface RejectFixMessage extends GuiToCoreMessageBase {
  type: 'reject_fix';
  diffZoneId: string;
}

// Request vulnerability details
export interface GetVulnerabilityDetailsMessage extends GuiToCoreMessageBase {
  type: 'get_vulnerability_details';
  vulnerabilityId: string;
}

// Request vulnerability list
export interface GetVulnerabilitiesMessage extends GuiToCoreMessageBase {
  type: 'get_vulnerabilities';
  fileUri?: string;  // Optional: filter by file
}

// Chat message from user
export interface ChatMessage extends GuiToCoreMessageBase {
  type: 'chat_message';
  content: string;
  context?: {
    currentFile?: string;
    selectedVulnerability?: string;
    recentFix?: string;
  };
}

// Request to scan repository
export interface ScanRepositoryMessage extends GuiToCoreMessageBase {
  type: 'scan_repository';
  repositoryPath: string;
}

// Cancel ongoing operation
export interface CancelOperationMessage extends GuiToCoreMessageBase {
  type: 'cancel_operation';
  operationId: string;
}

// Navigate to vulnerability in editor
export interface NavigateToVulnerabilityMessage extends GuiToCoreMessageBase {
  type: 'navigate_to_vulnerability';
  vulnerabilityId: string;
}

// Quick action request
export interface QuickActionMessage extends GuiToCoreMessageBase {
  type: 'quick_action';
  action: 'explain' | 'owasp' | 'optimize' | 'test_cases' | 'alternative';
  vulnerabilityId: string;
}

// GUI ready notification
export interface GuiReadyMessage extends GuiToCoreMessageBase {
  type: 'gui_ready';
}

// Union type of all GUI to Core messages
export type GuiToCoreMessage =
  | RequestFixMessage
  | ApplyFixMessage
  | RejectFixMessage
  | GetVulnerabilityDetailsMessage
  | GetVulnerabilitiesMessage
  | ChatMessage
  | ScanRepositoryMessage
  | CancelOperationMessage
  | NavigateToVulnerabilityMessage
  | QuickActionMessage
  | GuiReadyMessage;

// Type guard functions
export function isRequestFixMessage(msg: GuiToCoreMessage): msg is RequestFixMessage {
  return msg.type === 'request_fix';
}

export function isApplyFixMessage(msg: GuiToCoreMessage): msg is ApplyFixMessage {
  return msg.type === 'apply_fix';
}

export function isRejectFixMessage(msg: GuiToCoreMessage): msg is RejectFixMessage {
  return msg.type === 'reject_fix';
}

export function isChatMessage(msg: GuiToCoreMessage): msg is ChatMessage {
  return msg.type === 'chat_message';
}

export function createMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
