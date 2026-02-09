import React from 'react';
import { useAppSelector } from '../../store';
import { selectDiffZones, selectFixStream } from '../../store/diffSlice';
import { useMessaging } from '../../hooks/useMessaging';
import InlineDiff from './InlineDiff';
import DiffControls from './DiffControls';

const DiffViewer: React.FC = () => {
  const diffZones = useAppSelector(selectDiffZones);
  const fixStream = useAppSelector(selectFixStream);
  const { applyFix, rejectFix } = useMessaging();

  const pendingZones = diffZones.filter((z) => z.status === 'pending');
  const appliedZones = diffZones.filter((z) => z.status === 'applied');
  const rejectedZones = diffZones.filter((z) => z.status === 'rejected');

  const handleApply = (id: string) => {
    applyFix(id);
  };

  const handleReject = (id: string) => {
    rejectFix(id);
  };

  // Show streaming state
  if (fixStream && !fixStream.isComplete) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--vscode-panel-border)' }}>
          <h2 className="text-sm font-semibold">Generating Fix...</h2>
        </div>
        <div className="flex-1 p-4 overflow-auto">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">AI is generating a security fix</span>
          </div>
          <pre className="code-block text-sm">
            {fixStream.content}
            <span className="inline-block w-2 h-4 ml-1 bg-green-400 animate-pulse" />
          </pre>
        </div>
      </div>
    );
  }

  // Show empty state
  if (diffZones.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="text-4xl mb-4">🔧</div>
        <h3 className="text-lg font-medium mb-2">No Fixes Pending</h3>
        <p className="text-sm text-gray-400 max-w-xs">
          Click "Fix with AI" on a vulnerability to generate a secure code fix.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with summary */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--vscode-panel-border)' }}>
        <h2 className="text-sm font-semibold mb-2">Fix History</h2>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-0.5 rounded bg-yellow-600">{pendingZones.length} Pending</span>
          <span className="px-2 py-0.5 rounded bg-green-600">{appliedZones.length} Applied</span>
          <span className="px-2 py-0.5 rounded bg-red-600">{rejectedZones.length} Rejected</span>
        </div>
      </div>

      {/* Diff zones list */}
      <div className="flex-1 overflow-auto">
        {/* Pending fixes */}
        {pendingZones.length > 0 && (
          <div className="border-b" style={{ borderColor: 'var(--vscode-panel-border)' }}>
            <h3 className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-yellow-400">
              Pending Review ({pendingZones.length})
            </h3>
            {pendingZones.map((zone) => (
              <div key={zone.id} className="px-4 py-3 border-t" style={{ borderColor: 'var(--vscode-panel-border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium truncate">
                    {zone.fileUri.split('/').pop()}
                  </span>
                  <span className="text-xs text-gray-400">
                    Lines {zone.startLine}-{zone.endLine}
                  </span>
                </div>

                <InlineDiff
                  originalContent={zone.originalContent}
                  suggestedContent={zone.suggestedContent}
                />

                <DiffControls
                  onApply={() => handleApply(zone.id)}
                  onReject={() => handleReject(zone.id)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Applied fixes */}
        {appliedZones.length > 0 && (
          <div className="border-b" style={{ borderColor: 'var(--vscode-panel-border)' }}>
            <h3 className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-green-400">
              Applied ({appliedZones.length})
            </h3>
            {appliedZones.map((zone) => (
              <div
                key={zone.id}
                className="px-4 py-2 border-t text-sm opacity-60"
                style={{ borderColor: 'var(--vscode-panel-border)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span className="truncate">{zone.fileUri.split('/').pop()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rejected fixes */}
        {rejectedZones.length > 0 && (
          <div>
            <h3 className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-400">
              Rejected ({rejectedZones.length})
            </h3>
            {rejectedZones.map((zone) => (
              <div
                key={zone.id}
                className="px-4 py-2 border-t text-sm opacity-60"
                style={{ borderColor: 'var(--vscode-panel-border)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-red-400">✗</span>
                  <span className="truncate">{zone.fileUri.split('/').pop()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiffViewer;
