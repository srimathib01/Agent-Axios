import React from 'react';

interface DiffControlsProps {
  onApply: () => void;
  onReject: () => void;
}

const DiffControls: React.FC<DiffControlsProps> = ({ onApply, onReject }) => {
  return (
    <div className="flex gap-2">
      <button
        className="btn flex-1 bg-green-600 hover:bg-green-700"
        onClick={onApply}
      >
        ✓ Accept Fix
      </button>
      <button
        className="btn btn-secondary flex-1"
        onClick={onReject}
      >
        ✗ Reject
      </button>
    </div>
  );
};

export default DiffControls;
