'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  onUndo: () => void;
  onExpire: () => void;
}

// Bottom-center undo toast shown after a follow-up is dismissed. Rendered by
// the parent tab (not the row button) so it survives the dismissed row
// unmounting. Auto-expires after 30 seconds; does not persist across reloads.
export default function DismissUndoToast({ onUndo, onExpire }: Props) {
  useEffect(() => {
    const timer = setTimeout(onExpire, 30000);
    return () => clearTimeout(timer);
  }, [onExpire]);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
      }}
      className="flex items-center gap-3 bg-slate-900 text-slate-200 text-sm px-4 py-2.5 rounded-lg shadow-2xl border border-slate-700"
    >
      <span>Follow-up dismissed</span>
      <button
        type="button"
        onClick={onUndo}
        className="text-blue-400 hover:text-blue-300 font-semibold"
      >
        Undo
      </button>
    </div>,
    document.body
  );
}
