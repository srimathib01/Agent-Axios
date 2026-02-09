/**
 * DiffZone types for Void-style inline diff visualization
 * Represents a region in the editor where AI-suggested changes are displayed
 */

export type DiffZoneStatus = 'pending' | 'applied' | 'rejected' | 'streaming';

export interface DiffZone {
  id: string;
  fileUri: string;
  startLine: number;
  endLine: number;
  originalContent: string;
  suggestedContent: string;
  status: DiffZoneStatus;
  vulnerabilityId: string;
  createdAt: Date;
  appliedAt?: Date;
  rejectedAt?: Date;
}

export interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  content: string;
  lineNumber: number;
  originalLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffResult {
  lines: DiffLine[];
  hasChanges: boolean;
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
}

export interface SearchReplaceBlock {
  search: string;
  replace: string;
  lineStart?: number;
  lineEnd?: number;
}

export interface ApplyFixResult {
  success: boolean;
  diffZoneId: string;
  fileUri: string;
  appliedAt: Date;
  error?: string;
}

export interface RejectFixResult {
  success: boolean;
  diffZoneId: string;
  rejectedAt: Date;
}

export function createDiffZone(
  fileUri: string,
  startLine: number,
  endLine: number,
  originalContent: string,
  suggestedContent: string,
  vulnerabilityId: string
): DiffZone {
  return {
    id: `diffzone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    fileUri,
    startLine,
    endLine,
    originalContent,
    suggestedContent,
    status: 'pending',
    vulnerabilityId,
    createdAt: new Date()
  };
}
