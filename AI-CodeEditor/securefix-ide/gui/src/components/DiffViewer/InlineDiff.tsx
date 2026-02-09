import React, { useMemo } from 'react';

interface InlineDiffProps {
  originalContent: string;
  suggestedContent: string;
}

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  content: string;
  lineNumber: number;
}

const InlineDiff: React.FC<InlineDiffProps> = ({ originalContent, suggestedContent }) => {
  const diffLines = useMemo(() => {
    const original = originalContent.split('\n');
    const suggested = suggestedContent.split('\n');
    const lines: DiffLine[] = [];
    let lineNum = 1;

    // Simple diff: show removed then added
    // In production, use a proper diff algorithm
    const maxLen = Math.max(original.length, suggested.length);

    for (let i = 0; i < maxLen; i++) {
      const origLine = original[i];
      const sugLine = suggested[i];

      if (origLine === sugLine) {
        // Unchanged
        if (origLine !== undefined) {
          lines.push({
            type: 'unchanged',
            content: origLine,
            lineNumber: lineNum++,
          });
        }
      } else {
        // Show removed line
        if (origLine !== undefined) {
          lines.push({
            type: 'removed',
            content: origLine,
            lineNumber: lineNum++,
          });
        }
        // Show added line
        if (sugLine !== undefined) {
          lines.push({
            type: 'added',
            content: sugLine,
            lineNumber: lineNum++,
          });
        }
      }
    }

    return lines;
  }, [originalContent, suggestedContent]);

  return (
    <div className="code-block text-xs overflow-x-auto mb-3">
      {diffLines.map((line, index) => (
        <div
          key={index}
          className={`flex ${
            line.type === 'removed'
              ? 'bg-red-900/30 text-red-300'
              : line.type === 'added'
              ? 'bg-green-900/30 text-green-300'
              : ''
          }`}
        >
          <span className="w-6 text-right pr-2 text-gray-500 select-none flex-shrink-0">
            {line.type === 'removed' ? '-' : line.type === 'added' ? '+' : ' '}
          </span>
          <pre className="flex-1 whitespace-pre overflow-x-auto">{line.content}</pre>
        </div>
      ))}
    </div>
  );
};

export default InlineDiff;
