/**
 * DiffService
 *
 * Computes diffs, manages DiffZones, and handles apply/reject operations.
 * Implements Void-style inline diff visualization.
 */

import type {
  DiffZone,
  DiffResult,
  DiffLine,
  SearchReplaceBlock,
  ApplyFixResult,
  RejectFixResult
} from '../types/diff-zone.js';
import { createDiffZone } from '../types/diff-zone.js';

export class DiffService {
  private diffZones: Map<string, DiffZone> = new Map();
  private listeners: Set<(zones: DiffZone[]) => void> = new Set();

  /**
   * Create a new DiffZone from search/replace blocks
   */
  createDiffZoneFromBlocks(
    fileUri: string,
    originalContent: string,
    blocks: SearchReplaceBlock[],
    vulnerabilityId: string
  ): DiffZone | null {
    if (blocks.length === 0) {
      return null;
    }

    // Apply all blocks to get suggested content
    let suggestedContent = originalContent;
    let startLine = Infinity;
    let endLine = 0;

    for (const block of blocks) {
      const index = suggestedContent.indexOf(block.search);
      if (index === -1) {
        console.warn(`Could not find search block in content: ${block.search.substring(0, 50)}...`);
        continue;
      }

      // Calculate line numbers
      const beforeSearch = suggestedContent.substring(0, index);
      const blockStartLine = beforeSearch.split('\n').length;
      const blockEndLine = blockStartLine + block.search.split('\n').length - 1;

      startLine = Math.min(startLine, blockStartLine);
      endLine = Math.max(endLine, blockEndLine);

      // Apply replacement
      suggestedContent = suggestedContent.replace(block.search, block.replace);
    }

    if (startLine === Infinity) {
      return null;
    }

    const zone = createDiffZone(
      fileUri,
      startLine,
      endLine,
      originalContent,
      suggestedContent,
      vulnerabilityId
    );

    this.diffZones.set(zone.id, zone);
    this.notifyListeners();

    return zone;
  }

  /**
   * Compute line-by-line diff between original and suggested content
   */
  computeDiff(originalContent: string, suggestedContent: string): DiffResult {
    const originalLines = originalContent.split('\n');
    const suggestedLines = suggestedContent.split('\n');
    const lines: DiffLine[] = [];

    // Simple line-by-line diff using LCS algorithm
    const lcs = this.longestCommonSubsequence(originalLines, suggestedLines);
    let origIdx = 0;
    let sugIdx = 0;
    let lineNumber = 1;

    for (const common of lcs) {
      // Add removed lines
      while (origIdx < common.origIndex) {
        lines.push({
          type: 'removed',
          content: originalLines[origIdx],
          lineNumber: lineNumber++,
          originalLineNumber: origIdx + 1
        });
        origIdx++;
      }

      // Add added lines
      while (sugIdx < common.sugIndex) {
        lines.push({
          type: 'added',
          content: suggestedLines[sugIdx],
          lineNumber: lineNumber++,
          newLineNumber: sugIdx + 1
        });
        sugIdx++;
      }

      // Add unchanged line
      lines.push({
        type: 'unchanged',
        content: originalLines[origIdx],
        lineNumber: lineNumber++,
        originalLineNumber: origIdx + 1,
        newLineNumber: sugIdx + 1
      });

      origIdx++;
      sugIdx++;
    }

    // Add remaining removed lines
    while (origIdx < originalLines.length) {
      lines.push({
        type: 'removed',
        content: originalLines[origIdx],
        lineNumber: lineNumber++,
        originalLineNumber: origIdx + 1
      });
      origIdx++;
    }

    // Add remaining added lines
    while (sugIdx < suggestedLines.length) {
      lines.push({
        type: 'added',
        content: suggestedLines[sugIdx],
        lineNumber: lineNumber++,
        newLineNumber: sugIdx + 1
      });
      sugIdx++;
    }

    const addedCount = lines.filter(l => l.type === 'added').length;
    const removedCount = lines.filter(l => l.type === 'removed').length;
    const unchangedCount = lines.filter(l => l.type === 'unchanged').length;

    return {
      lines,
      hasChanges: addedCount > 0 || removedCount > 0,
      addedCount,
      removedCount,
      unchangedCount
    };
  }

  /**
   * LCS algorithm for line-by-line diff
   */
  private longestCommonSubsequence(
    original: string[],
    suggested: string[]
  ): Array<{ origIndex: number; sugIndex: number }> {
    const m = original.length;
    const n = suggested.length;

    // Build LCS table
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (original[i - 1] === suggested[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack to find LCS
    const result: Array<{ origIndex: number; sugIndex: number }> = [];
    let i = m;
    let j = n;

    while (i > 0 && j > 0) {
      if (original[i - 1] === suggested[j - 1]) {
        result.unshift({ origIndex: i - 1, sugIndex: j - 1 });
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return result;
  }

  /**
   * Apply a DiffZone (mark as applied)
   */
  applyDiffZone(diffZoneId: string): ApplyFixResult {
    const zone = this.diffZones.get(diffZoneId);

    if (!zone) {
      return {
        success: false,
        diffZoneId,
        fileUri: '',
        appliedAt: new Date(),
        error: 'DiffZone not found'
      };
    }

    zone.status = 'applied';
    zone.appliedAt = new Date();
    this.notifyListeners();

    return {
      success: true,
      diffZoneId,
      fileUri: zone.fileUri,
      appliedAt: zone.appliedAt
    };
  }

  /**
   * Reject a DiffZone (mark as rejected)
   */
  rejectDiffZone(diffZoneId: string): RejectFixResult {
    const zone = this.diffZones.get(diffZoneId);

    if (!zone) {
      return {
        success: false,
        diffZoneId,
        rejectedAt: new Date()
      };
    }

    zone.status = 'rejected';
    zone.rejectedAt = new Date();
    this.notifyListeners();

    return {
      success: true,
      diffZoneId,
      rejectedAt: zone.rejectedAt
    };
  }

  /**
   * Get a DiffZone by ID
   */
  getDiffZone(id: string): DiffZone | undefined {
    return this.diffZones.get(id);
  }

  /**
   * Get all DiffZones
   */
  getAllDiffZones(): DiffZone[] {
    return Array.from(this.diffZones.values());
  }

  /**
   * Get DiffZones for a specific file
   */
  getDiffZonesByFile(fileUri: string): DiffZone[] {
    return this.getAllDiffZones().filter(z => z.fileUri === fileUri);
  }

  /**
   * Get pending DiffZones
   */
  getPendingDiffZones(): DiffZone[] {
    return this.getAllDiffZones().filter(z => z.status === 'pending');
  }

  /**
   * Remove a DiffZone
   */
  removeDiffZone(diffZoneId: string): void {
    this.diffZones.delete(diffZoneId);
    this.notifyListeners();
  }

  /**
   * Subscribe to DiffZone updates
   */
  onUpdate(listener: (zones: DiffZone[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const zones = this.getAllDiffZones();
    for (const listener of this.listeners) {
      listener(zones);
    }
  }

  /**
   * Clear all DiffZones
   */
  clear(): void {
    this.diffZones.clear();
    this.notifyListeners();
  }
}
