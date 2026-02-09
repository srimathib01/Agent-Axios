/**
 * Message types for Extension layer communication
 * These handle IDE-specific operations like decorations and file operations
 */

import type { VulnerabilitySeverity } from '../types/vulnerability.js';

// Base message interface
export interface ExtensionMessageBase {
  id: string;
  timestamp: number;
}

// === Extension to Core Messages ===

// File opened in editor
export interface FileOpenedMessage extends ExtensionMessageBase {
  type: 'file_opened';
  fileUri: string;
  language: string;
  content: string;
}

// File changed
export interface FileChangedMessage extends ExtensionMessageBase {
  type: 'file_changed';
  fileUri: string;
  content: string;
}

// File saved
export interface FileSavedMessage extends ExtensionMessageBase {
  type: 'file_saved';
  fileUri: string;
}

// File closed
export interface FileClosedMessage extends ExtensionMessageBase {
  type: 'file_closed';
  fileUri: string;
}

// Editor selection changed
export interface EditorSelectionMessage extends ExtensionMessageBase {
  type: 'editor_selection';
  fileUri: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  selectedText: string;
}

// Workspace opened
export interface WorkspaceOpenedMessage extends ExtensionMessageBase {
  type: 'workspace_opened';
  workspacePath: string;
  files: string[];
}

// === Core to Extension Messages ===

// Show decoration on vulnerability
export interface ShowDecorationMessage extends ExtensionMessageBase {
  type: 'show_decoration';
  fileUri: string;
  decorations: VulnerabilityDecoration[];
}

// Remove decorations
export interface RemoveDecorationMessage extends ExtensionMessageBase {
  type: 'remove_decoration';
  fileUri: string;
  decorationIds?: string[];  // If not specified, remove all
}

// Create DiffZone in editor
export interface CreateDiffZoneMessage extends ExtensionMessageBase {
  type: 'create_diff_zone';
  fileUri: string;
  startLine: number;
  endLine: number;
  originalContent: string;
  suggestedContent: string;
  diffZoneId: string;
}

// Remove DiffZone from editor
export interface RemoveDiffZoneMessage extends ExtensionMessageBase {
  type: 'remove_diff_zone';
  diffZoneId: string;
}

// Apply edit to file
export interface ApplyEditMessage extends ExtensionMessageBase {
  type: 'apply_edit';
  fileUri: string;
  startLine: number;
  endLine: number;
  newContent: string;
}

// Show notification
export interface ShowNotificationMessage extends ExtensionMessageBase {
  type: 'show_notification';
  level: 'info' | 'warning' | 'error';
  message: string;
  actions?: NotificationAction[];
}

// Navigate to location
export interface NavigateToLocationMessage extends ExtensionMessageBase {
  type: 'navigate_to_location';
  fileUri: string;
  line: number;
  column?: number;
  select?: boolean;
}

// Show progress
export interface ShowProgressMessage extends ExtensionMessageBase {
  type: 'show_progress';
  title: string;
  message?: string;
  cancellable: boolean;
  progressId: string;
}

// Update progress
export interface UpdateProgressMessage extends ExtensionMessageBase {
  type: 'update_progress';
  progressId: string;
  increment?: number;
  message?: string;
}

// Hide progress
export interface HideProgressMessage extends ExtensionMessageBase {
  type: 'hide_progress';
  progressId: string;
}

// === Supporting Types ===

export interface VulnerabilityDecoration {
  id: string;
  vulnerabilityId: string;
  startLine: number;
  endLine: number;
  startColumn?: number;
  endColumn?: number;
  severity: VulnerabilitySeverity;
  message: string;
  hoverMessage?: string;
}

export interface NotificationAction {
  title: string;
  actionId: string;
}

// Union types
export type ExtensionToCoreMessage =
  | FileOpenedMessage
  | FileChangedMessage
  | FileSavedMessage
  | FileClosedMessage
  | EditorSelectionMessage
  | WorkspaceOpenedMessage;

export type CoreToExtensionMessage =
  | ShowDecorationMessage
  | RemoveDecorationMessage
  | CreateDiffZoneMessage
  | RemoveDiffZoneMessage
  | ApplyEditMessage
  | ShowNotificationMessage
  | NavigateToLocationMessage
  | ShowProgressMessage
  | UpdateProgressMessage
  | HideProgressMessage;

// Type guards
export function isFileOpenedMessage(msg: ExtensionToCoreMessage): msg is FileOpenedMessage {
  return msg.type === 'file_opened';
}

export function isShowDecorationMessage(msg: CoreToExtensionMessage): msg is ShowDecorationMessage {
  return msg.type === 'show_decoration';
}

export function isCreateDiffZoneMessage(msg: CoreToExtensionMessage): msg is CreateDiffZoneMessage {
  return msg.type === 'create_diff_zone';
}
