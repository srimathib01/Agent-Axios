import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import { selectDiffZones, selectFixStream, clearFixStream } from '../../store/diffSlice';
import { useMessaging } from '../../hooks/useMessaging';
import InlineDiff from './InlineDiff';
import DiffControls from './DiffControls';

const DiffViewer: React.FC = () => {
  const diffZones = useAppSelector(selectDiffZones);
  const fixStream = useAppSelector(selectFixStream);
  const dispatch = useAppDispatch();
  const { applyFix, rejectFix } = useMessaging();
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; type: 'success' | 'error'; message: string } | null>(null);

  const pendingZones = diffZones.filter((z) => z.status === 'pending');
  const appliedZones = diffZones.filter((z) => z.status === 'applied');
  const rejectedZones = diffZones.filter((z) => z.status === 'rejected');

  const handleApply = async (id: string) => {
    setApplyingId(id);
    setFeedback(null);
    try {
      await applyFix(id);
      const zone = diffZones.find((z) => z.id === id);
      setFeedback({
        id,
        type: 'success',
        message: `Fix applied to ${zone?.filePath?.split('/').pop() || zone?.fileUri?.split('/').pop() || 'file'}`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch {
      setFeedback({ id, type: 'error', message: 'Failed to apply fix. Is the backend running?' });
    } finally {
      setApplyingId(null);
    }
  };

  const handleReject = async (id: string) => {
    await rejectFix(id);
  };

  // Error state - show when fix generation failed
  if (fixStream && fixStream.error) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--vscode-panel-border)' }}>
          <div className="flex items-center gap-2.5">
            <span className="text-red-400 text-base">&#9888;</span>
            <h2 className="text-sm font-semibold text-red-400">Fix Generation Failed</h2>
          </div>
        </div>
        <div className="flex-1 p-4 overflow-auto">
          <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <p className="text-sm text-red-400 mb-2 font-medium">Error:</p>
            <p className="text-xs" style={{ color: 'var(--vscode-foreground)', opacity: 0.85 }}>
              {fixStream.error}
            </p>
          </div>
          <div className="text-xs space-y-1.5 mb-4" style={{ color: 'var(--vscode-descriptionForeground)' }}>
            <p>Make sure the backend server is running:</p>
            <pre className="code-block text-xs p-2">cd backend && python -m uvicorn main:app --reload</pre>
          </div>
          <button
            className="btn text-xs"
            onClick={() => dispatch(clearFixStream())}
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // Streaming state - show while fix is being generated
  if (fixStream && !fixStream.isComplete) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--vscode-panel-border)' }}>
          <div className="flex items-center gap-2.5">
            <span className="inline-block w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--vscode-focusBorder)', borderTopColor: 'transparent' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--vscode-foreground)' }}>Generating Fix...</h2>
          </div>
        </div>
        <div className="flex-1 p-4 overflow-auto">
          <div className="flex items-center gap-2 mb-3">
            <div className="typing-dots">
              <span /><span /><span />
            </div>
            <span className="text-xs" style={{ color: 'var(--vscode-descriptionForeground)' }}>
              AI is analyzing and generating a security fix
            </span>
          </div>
          <div className="fix-progress rounded-lg overflow-hidden">
            <pre className="code-block text-xs leading-relaxed">
              {fixStream.content}
              <span className="inline-block w-1.5 h-3.5 ml-0.5 rounded-sm animate-pulse"
                style={{ backgroundColor: 'var(--vscode-focusBorder)' }} />
            </pre>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (diffZones.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-xl opacity-60">&#9881;</span>
        </div>
        <h3 className="text-sm font-semibold mb-1.5" style={{ color: 'var(--vscode-foreground)' }}>No Fixes Pending</h3>
        <p className="text-xs max-w-[220px] leading-relaxed" style={{ color: 'var(--vscode-descriptionForeground)' }}>
          Click "Fix with AI" on a vulnerability to generate a secure code fix.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Success feedback banner */}
      {feedback && feedback.type === 'success' && !pendingZones.find((z) => z.id === feedback.id) && (
        <div className="px-4 py-2 bg-emerald-500/15 border-b border-emerald-500/30 text-xs font-medium text-emerald-400 flex items-center gap-2">
          <span>&#10003;</span>
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--vscode-panel-border)' }}>
        <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--vscode-foreground)' }}>Fix History</h2>
        <div className="flex gap-1.5 text-xs">
          {pendingZones.length > 0 && (
            <span className="px-2 py-0.5 rounded font-medium bg-yellow-500/20 text-yellow-400">{pendingZones.length} Pending</span>
          )}
          {appliedZones.length > 0 && (
            <span className="px-2 py-0.5 rounded font-medium bg-emerald-500/20 text-emerald-400">{appliedZones.length} Applied</span>
          )}
          {rejectedZones.length > 0 && (
            <span className="px-2 py-0.5 rounded font-medium bg-red-500/20 text-red-400">{rejectedZones.length} Rejected</span>
          )}
        </div>
      </div>

      {/* Diff zones */}
      <div className="flex-1 overflow-auto">
        {/* Pending */}
        {pendingZones.length > 0 && (
          <div className="border-b" style={{ borderColor: 'var(--vscode-panel-border)' }}>
            <h3 className="section-header text-yellow-400">
              Pending Review ({pendingZones.length})
            </h3>
            {pendingZones.map((zone) => (
              <div key={zone.id} className="px-4 py-3 border-t animate-slide-up" style={{ borderColor: 'var(--vscode-panel-border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--vscode-foreground)' }}>
                    {zone.filePath?.split('/').pop() || zone.fileUri.split('/').pop()}
                  </span>
                  <span className="text-xs font-mono" style={{ color: 'var(--vscode-descriptionForeground)' }}>
                    L{zone.startLine}-{zone.endLine}
                  </span>
                </div>

                <InlineDiff
                  originalContent={zone.originalContent}
                  suggestedContent={zone.suggestedContent}
                />

                <DiffControls
                  onApply={() => handleApply(zone.id)}
                  onReject={() => handleReject(zone.id)}
                  isApplying={applyingId === zone.id}
                />

                {/* Feedback message */}
                {feedback && feedback.id === zone.id && (
                  <div className={`mt-2 px-3 py-2 rounded text-xs font-medium ${
                    feedback.type === 'success'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {feedback.message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Applied */}
        {appliedZones.length > 0 && (
          <div className="border-b" style={{ borderColor: 'var(--vscode-panel-border)' }}>
            <h3 className="section-header text-emerald-400">
              Applied ({appliedZones.length})
            </h3>
            {appliedZones.map((zone) => (
              <div
                key={zone.id}
                className="px-4 py-2 border-t text-sm opacity-70"
                style={{ borderColor: 'var(--vscode-panel-border)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">&#10003;</span>
                  <span className="truncate">{zone.fileUri.split('/').pop()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rejected */}
        {rejectedZones.length > 0 && (
          <div>
            <h3 className="section-header text-red-400">
              Rejected ({rejectedZones.length})
            </h3>
            {rejectedZones.map((zone) => (
              <div
                key={zone.id}
                className="px-4 py-2 border-t text-sm opacity-70"
                style={{ borderColor: 'var(--vscode-panel-border)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-red-400">&#10007;</span>
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
