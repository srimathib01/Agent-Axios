/**
 * DiffZoneDecorator
 *
 * Manages Void-style inline diff visualization.
 * Shows red (removed) and green (added) highlighting for suggested fixes.
 */

import * as vscode from 'vscode';

interface DiffZoneInfo {
  id: string;
  fileUri: string;
  startLine: number;
  endLine: number;
  originalContent: string;
  suggestedContent: string;
  removedDecorationType: vscode.TextEditorDecorationType;
  addedDecorationType: vscode.TextEditorDecorationType;
  removedDecorations: vscode.DecorationOptions[];
  addedDecorations: vscode.DecorationOptions[];
}

export class DiffZoneDecorator {
  private diffZones: Map<string, DiffZoneInfo> = new Map();
  private currentDiffZoneId: string | null = null;

  // Decoration types for diff visualization
  private readonly removedLineDecorationType: vscode.TextEditorDecorationType;
  private readonly addedLineDecorationType: vscode.TextEditorDecorationType;
  private readonly diffZoneBackgroundDecorationType: vscode.TextEditorDecorationType;

  constructor() {
    // Red background for removed lines
    this.removedLineDecorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(255, 0, 0, 0.2)',
      isWholeLine: true,
      before: {
        contentText: '−',
        color: '#ff6b6b',
        width: '20px',
        textDecoration: 'none'
      }
    });

    // Green background for added lines
    this.addedLineDecorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(0, 255, 0, 0.2)',
      isWholeLine: true,
      before: {
        contentText: '+',
        color: '#51cf66',
        width: '20px',
        textDecoration: 'none'
      }
    });

    // Light background for the entire diff zone
    this.diffZoneBackgroundDecorationType = vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      borderWidth: '1px 0',
      borderStyle: 'solid',
      borderColor: 'rgba(128, 128, 128, 0.3)'
    });
  }

  /**
   * Create a new DiffZone with inline diff visualization
   */
  createDiffZone(
    id: string,
    fileUri: string,
    startLine: number,
    endLine: number,
    originalContent: string,
    suggestedContent: string
  ): void {
    // Compute diff lines
    const originalLines = originalContent.split('\n');
    const suggestedLines = suggestedContent.split('\n');

    const removedDecorations: vscode.DecorationOptions[] = [];
    const addedDecorations: vscode.DecorationOptions[] = [];

    // Simple diff: mark all original lines as removed, all suggested as added
    // In a real implementation, you'd use a proper diff algorithm (LCS)
    for (let i = 0; i < originalLines.length; i++) {
      const lineNum = startLine + i - 1;
      removedDecorations.push({
        range: new vscode.Range(lineNum, 0, lineNum, Number.MAX_SAFE_INTEGER),
        hoverMessage: new vscode.MarkdownString('**Original (will be removed)**\n```\n' + originalLines[i] + '\n```')
      });
    }

    // Store diff zone info
    const zoneInfo: DiffZoneInfo = {
      id,
      fileUri,
      startLine,
      endLine,
      originalContent,
      suggestedContent,
      removedDecorationType: this.removedLineDecorationType,
      addedDecorationType: this.addedLineDecorationType,
      removedDecorations,
      addedDecorations
    };

    this.diffZones.set(id, zoneInfo);
    this.currentDiffZoneId = id;

    // Apply decorations if file is open
    this.applyDiffZoneDecorations(id);

    // Set context for keybindings
    vscode.commands.executeCommand('setContext', 'securefix.inDiffZone', true);
    vscode.commands.executeCommand('setContext', 'securefix.currentDiffZoneId', id);
  }

  /**
   * Apply decorations for a diff zone
   */
  private applyDiffZoneDecorations(diffZoneId: string): void {
    const zone = this.diffZones.get(diffZoneId);
    if (!zone) return;

    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.uri.toString() !== zone.fileUri) return;

    // Apply removed line decorations
    editor.setDecorations(zone.removedDecorationType, zone.removedDecorations);

    // Show suggested content as virtual text or in a separate view
    // For now, we'll show the suggested fix in an information message
    this.showSuggestedFix(zone);
  }

  /**
   * Show the suggested fix to the user
   */
  private showSuggestedFix(zone: DiffZoneInfo): void {
    const suggestedContent = zone.suggestedContent;

    // Create a markdown message showing the fix
    const md = new vscode.MarkdownString();
    md.appendMarkdown('### 🔒 Suggested Security Fix\n\n');
    md.appendCodeblock(suggestedContent, this.detectLanguage(zone.fileUri));
    md.appendMarkdown('\n\n**Press Enter to accept, Escape to reject**');

    // Show as hover or notification
    vscode.window.showInformationMessage(
      'SecureFix: Review the suggested fix',
      'Accept (Enter)',
      'Reject (Esc)'
    ).then((selection) => {
      if (selection === 'Accept (Enter)') {
        vscode.commands.executeCommand('securefix.acceptFix');
      } else if (selection === 'Reject (Esc)') {
        vscode.commands.executeCommand('securefix.rejectFix');
      }
    });
  }

  /**
   * Detect language from file URI
   */
  private detectLanguage(fileUri: string): string {
    const ext = fileUri.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      'py': 'python',
      'js': 'javascript',
      'ts': 'typescript',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'rb': 'ruby',
      'php': 'php'
    };
    return langMap[ext] || 'plaintext';
  }

  /**
   * Remove a DiffZone
   */
  removeDiffZone(diffZoneId: string): void {
    const zone = this.diffZones.get(diffZoneId);
    if (!zone) return;

    // Clear decorations
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      editor.setDecorations(zone.removedDecorationType, []);
      editor.setDecorations(zone.addedDecorationType, []);
    }

    this.diffZones.delete(diffZoneId);

    if (this.currentDiffZoneId === diffZoneId) {
      this.currentDiffZoneId = null;
      vscode.commands.executeCommand('setContext', 'securefix.inDiffZone', false);
      vscode.commands.executeCommand('setContext', 'securefix.currentDiffZoneId', null);
    }
  }

  /**
   * Get current diff zone ID
   */
  getCurrentDiffZoneId(): string | null {
    return this.currentDiffZoneId;
  }

  /**
   * Get diff zone by ID
   */
  getDiffZone(id: string): DiffZoneInfo | undefined {
    return this.diffZones.get(id);
  }

  /**
   * Navigate to next diff zone
   */
  navigateToNextDiffZone(): void {
    const zones = Array.from(this.diffZones.values());
    if (zones.length === 0) return;

    const currentIndex = this.currentDiffZoneId
      ? zones.findIndex(z => z.id === this.currentDiffZoneId)
      : -1;

    const nextIndex = (currentIndex + 1) % zones.length;
    const nextZone = zones[nextIndex];

    this.navigateToDiffZone(nextZone.id);
  }

  /**
   * Navigate to previous diff zone
   */
  navigateToPreviousDiffZone(): void {
    const zones = Array.from(this.diffZones.values());
    if (zones.length === 0) return;

    const currentIndex = this.currentDiffZoneId
      ? zones.findIndex(z => z.id === this.currentDiffZoneId)
      : 0;

    const prevIndex = (currentIndex - 1 + zones.length) % zones.length;
    const prevZone = zones[prevIndex];

    this.navigateToDiffZone(prevZone.id);
  }

  /**
   * Navigate to a specific diff zone
   */
  private async navigateToDiffZone(diffZoneId: string): Promise<void> {
    const zone = this.diffZones.get(diffZoneId);
    if (!zone) return;

    // Open the file
    const uri = vscode.Uri.parse(zone.fileUri);
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);

    // Navigate to the diff zone
    const position = new vscode.Position(zone.startLine - 1, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(
      new vscode.Range(position, new vscode.Position(zone.endLine - 1, 0)),
      vscode.TextEditorRevealType.InCenter
    );

    this.currentDiffZoneId = diffZoneId;
    this.applyDiffZoneDecorations(diffZoneId);

    vscode.commands.executeCommand('setContext', 'securefix.inDiffZone', true);
    vscode.commands.executeCommand('setContext', 'securefix.currentDiffZoneId', diffZoneId);
  }

  /**
   * Clear all diff zones
   */
  clearAll(): void {
    const editor = vscode.window.activeTextEditor;

    for (const zone of this.diffZones.values()) {
      if (editor) {
        editor.setDecorations(zone.removedDecorationType, []);
        editor.setDecorations(zone.addedDecorationType, []);
      }
    }

    this.diffZones.clear();
    this.currentDiffZoneId = null;

    vscode.commands.executeCommand('setContext', 'securefix.inDiffZone', false);
    vscode.commands.executeCommand('setContext', 'securefix.currentDiffZoneId', null);
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.clearAll();
    this.removedLineDecorationType.dispose();
    this.addedLineDecorationType.dispose();
    this.diffZoneBackgroundDecorationType.dispose();
  }
}
