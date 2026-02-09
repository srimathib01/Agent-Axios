/**
 * Message types from Core to GUI
 * These are responses and state updates sent to the webview
 */

import type { Vulnerability, VulnerabilityScanResult } from '../types/vulnerability.js';
import type { DiffZone, DiffResult } from '../types/diff-zone.js';

// Base message interface
export interface CoreToGuiMessageBase {
  id: string;
  timestamp: number;
  replyTo?: string;  // ID of the message this is replying to
}

// Streaming fix chunk
export interface FixStreamChunkMessage extends CoreToGuiMessageBase {
  type: 'fix_stream_chunk';
  vulnerabilityId: string;
  content: string;
  done: boolean;
}

// Fix generation complete
export interface FixCompleteMessage extends CoreToGuiMessageBase {
  type: 'fix_complete';
  vulnerabilityId: string;
  diffZone: DiffZone;
  diffResult: DiffResult;
}

// Fix generation error
export interface FixErrorMessage extends CoreToGuiMessageBase {
  type: 'fix_error';
  vulnerabilityId: string;
  error: string;
  code?: string;
}

// Vulnerability list update
export interface VulnerabilityListMessage extends CoreToGuiMessageBase {
  type: 'vulnerability_list';
  vulnerabilities: Vulnerability[];
  scanId?: string;
}

// Single vulnerability details
export interface VulnerabilityDetailsMessage extends CoreToGuiMessageBase {
  type: 'vulnerability_details';
  vulnerability: Vulnerability;
}

// Scan progress update
export interface ScanProgressMessage extends CoreToGuiMessageBase {
  type: 'scan_progress';
  scanId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;  // 0-100
  message?: string;
}

// Scan complete
export interface ScanCompleteMessage extends CoreToGuiMessageBase {
  type: 'scan_complete';
  result: VulnerabilityScanResult;
}

// Chat response chunk (streaming)
export interface ChatResponseChunkMessage extends CoreToGuiMessageBase {
  type: 'chat_response_chunk';
  content: string;
  done: boolean;
}

// Chat response complete
export interface ChatResponseCompleteMessage extends CoreToGuiMessageBase {
  type: 'chat_response_complete';
  content: string;
}

// Fix applied successfully
export interface FixAppliedMessage extends CoreToGuiMessageBase {
  type: 'fix_applied';
  diffZoneId: string;
  vulnerabilityId: string;
}

// Fix rejected
export interface FixRejectedMessage extends CoreToGuiMessageBase {
  type: 'fix_rejected';
  diffZoneId: string;
  vulnerabilityId: string;
}

// Error message
export interface ErrorMessage extends CoreToGuiMessageBase {
  type: 'error';
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

// Notification message
export interface NotificationMessage extends CoreToGuiMessageBase {
  type: 'notification';
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  duration?: number;
}

// Active file changed
export interface ActiveFileChangedMessage extends CoreToGuiMessageBase {
  type: 'active_file_changed';
  fileUri: string | null;
  language?: string;
}

// Theme changed
export interface ThemeChangedMessage extends CoreToGuiMessageBase {
  type: 'theme_changed';
  theme: 'light' | 'dark' | 'high-contrast';
}

// Configuration updated
export interface ConfigurationUpdatedMessage extends CoreToGuiMessageBase {
  type: 'configuration_updated';
  config: Record<string, unknown>;
}

// Initial state for GUI
export interface InitialStateMessage extends CoreToGuiMessageBase {
  type: 'initial_state';
  vulnerabilities: Vulnerability[];
  diffZones: DiffZone[];
  activeFile?: string;
  theme: 'light' | 'dark' | 'high-contrast';
  config: Record<string, unknown>;
}

// Union type of all Core to GUI messages
export type CoreToGuiMessage =
  | FixStreamChunkMessage
  | FixCompleteMessage
  | FixErrorMessage
  | VulnerabilityListMessage
  | VulnerabilityDetailsMessage
  | ScanProgressMessage
  | ScanCompleteMessage
  | ChatResponseChunkMessage
  | ChatResponseCompleteMessage
  | FixAppliedMessage
  | FixRejectedMessage
  | ErrorMessage
  | NotificationMessage
  | ActiveFileChangedMessage
  | ThemeChangedMessage
  | ConfigurationUpdatedMessage
  | InitialStateMessage;

// Type guard functions
export function isFixStreamChunkMessage(msg: CoreToGuiMessage): msg is FixStreamChunkMessage {
  return msg.type === 'fix_stream_chunk';
}

export function isVulnerabilityListMessage(msg: CoreToGuiMessage): msg is VulnerabilityListMessage {
  return msg.type === 'vulnerability_list';
}

export function isScanProgressMessage(msg: CoreToGuiMessage): msg is ScanProgressMessage {
  return msg.type === 'scan_progress';
}
