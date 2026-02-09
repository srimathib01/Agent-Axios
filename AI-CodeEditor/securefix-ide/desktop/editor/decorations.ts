/**
 * Decoration types for the Monaco Editor in SecureFix IDE
 */

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Decoration for marking vulnerabilities in the editor
 */
export interface VulnerabilityDecoration {
  id: string;
  startLine: number;
  endLine: number;
  severity: SeverityLevel;
  message: string;
  cweId?: string;
  vulnerabilityType?: string;
}

/**
 * Decoration for showing diff (added/removed lines)
 */
export interface DiffDecoration {
  id: string;
  startLine: number;
  endLine: number;
  type: 'added' | 'removed' | 'modified';
  content?: string;
}

/**
 * CSS styles for vulnerability decorations
 */
export const vulnerabilityStyles = `
  /* Vulnerability line backgrounds */
  .vuln-line {
    border-left: 3px solid transparent;
    margin-left: 3px;
  }

  .vuln-critical {
    background-color: rgba(255, 0, 0, 0.15);
    border-left-color: #ff0000;
  }

  .vuln-high {
    background-color: rgba(255, 102, 0, 0.15);
    border-left-color: #ff6600;
  }

  .vuln-medium {
    background-color: rgba(255, 204, 0, 0.15);
    border-left-color: #ffcc00;
  }

  .vuln-low {
    background-color: rgba(0, 153, 255, 0.15);
    border-left-color: #0099ff;
  }

  .vuln-info {
    background-color: rgba(128, 128, 128, 0.1);
    border-left-color: #808080;
  }

  /* Glyph margin icons */
  .vuln-glyph {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  .vuln-glyph::before {
    content: '';
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .vuln-glyph-critical::before {
    background-color: #ff0000;
    box-shadow: 0 0 4px #ff0000;
  }

  .vuln-glyph-high::before {
    background-color: #ff6600;
    box-shadow: 0 0 4px #ff6600;
  }

  .vuln-glyph-medium::before {
    background-color: #ffcc00;
  }

  .vuln-glyph-low::before {
    background-color: #0099ff;
  }

  .vuln-glyph-info::before {
    background-color: #808080;
  }

  /* Diff decorations */
  .diff-added {
    background-color: rgba(0, 255, 0, 0.15);
    border-left: 3px solid #00ff00;
    margin-left: 3px;
  }

  .diff-removed {
    background-color: rgba(255, 0, 0, 0.15);
    border-left: 3px solid #ff0000;
    margin-left: 3px;
    text-decoration: line-through;
    opacity: 0.7;
  }

  .diff-modified {
    background-color: rgba(255, 255, 0, 0.15);
    border-left: 3px solid #ffff00;
    margin-left: 3px;
  }

  .diff-glyph-added::before {
    content: '+';
    color: #00ff00;
    font-weight: bold;
    font-size: 14px;
  }

  .diff-glyph-removed::before {
    content: '-';
    color: #ff0000;
    font-weight: bold;
    font-size: 14px;
  }

  /* Inline diff widget */
  .inline-diff-widget {
    background-color: var(--vscode-editorWidget-background, #252526);
    border: 1px solid var(--vscode-editorWidget-border, #454545);
    border-radius: 4px;
    padding: 8px;
    margin: 4px 0;
  }

  .inline-diff-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 12px;
    color: var(--vscode-descriptionForeground, #808080);
  }

  .inline-diff-actions {
    display: flex;
    gap: 8px;
  }

  .inline-diff-actions button {
    padding: 4px 12px;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
  }

  .inline-diff-accept {
    background-color: #28a745;
    color: white;
  }

  .inline-diff-accept:hover {
    background-color: #218838;
  }

  .inline-diff-reject {
    background-color: #dc3545;
    color: white;
  }

  .inline-diff-reject:hover {
    background-color: #c82333;
  }
`;

/**
 * Convert vulnerability from Core to decoration
 */
export function vulnerabilityToDecoration(
  vulnerability: {
    id: string;
    location: { startLine: number; endLine: number };
    severity: string;
    title: string;
    cweId?: string;
    vulnerabilityType?: string;
  }
): VulnerabilityDecoration {
  return {
    id: vulnerability.id,
    startLine: vulnerability.location.startLine,
    endLine: vulnerability.location.endLine,
    severity: vulnerability.severity as SeverityLevel,
    message: vulnerability.title,
    cweId: vulnerability.cweId,
    vulnerabilityType: vulnerability.vulnerabilityType,
  };
}

/**
 * Convert diff zone from Core to decoration
 */
export function diffZoneToDecoration(
  diffZone: {
    id: string;
    startLine: number;
    endLine: number;
    originalContent: string;
    suggestedContent: string;
  }
): DiffDecoration[] {
  const decorations: DiffDecoration[] = [];

  // Mark original lines as removed
  decorations.push({
    id: `${diffZone.id}-removed`,
    startLine: diffZone.startLine,
    endLine: diffZone.endLine,
    type: 'removed',
    content: diffZone.originalContent,
  });

  // Mark suggested lines as added (would appear after original)
  // In practice, this would be handled by a more sophisticated inline diff view
  decorations.push({
    id: `${diffZone.id}-added`,
    startLine: diffZone.endLine + 1,
    endLine: diffZone.endLine + diffZone.suggestedContent.split('\n').length,
    type: 'added',
    content: diffZone.suggestedContent,
  });

  return decorations;
}

/**
 * Inject decoration styles into document
 */
export function injectDecorationStyles(): void {
  const styleId = 'securefix-decorations';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = vulnerabilityStyles;
    document.head.appendChild(style);
  }
}
