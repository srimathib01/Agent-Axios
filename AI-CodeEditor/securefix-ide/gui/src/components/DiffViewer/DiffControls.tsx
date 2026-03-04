import React from 'react';

interface DiffControlsProps {
  onApply: () => void;
  onReject: () => void;
  isApplying?: boolean;
}

const DiffControls: React.FC<DiffControlsProps> = ({ onApply, onReject, isApplying }) => {
  return (
    <div className="flex gap-2">
      <button
        className="btn flex-1 bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
        onClick={onApply}
        disabled={isApplying}
      >
        {isApplying ? (
          <>
            <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Applying...
          </>
        ) : (
          <>&#10003; Accept Fix</>
        )}
      </button>
      <button
        className="btn btn-secondary flex-1"
        onClick={onReject}
        disabled={isApplying}
      >
        &#10007; Reject
      </button>
    </div>
  );
};

export default DiffControls;
