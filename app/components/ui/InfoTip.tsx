'use client';

import { Info } from 'lucide-react';
import { useId, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * A hoverable "what does this mean?" marker for outputs whose logic is not self-evident.
 * Separate from Tooltip because that one is deliberately whitespace-nowrap for short labels;
 * these hold a sentence or two and must wrap.
 *
 * Focusable and described by aria-describedby, so the explanation is reachable by keyboard
 * and screen reader rather than being hover-only trivia.
 */
export default function InfoTip({ label, className = '' }: { label: string; className?: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const id = useId();

  const show = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
  };

  return (
    <>
      <button
        type="button"
        aria-label="What does this mean?"
        aria-describedby={pos ? id : undefined}
        className={`inline-flex items-center align-middle text-gray-400 hover:text-gray-600 focus:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-full ${className}`}
        onMouseEnter={(e) => show(e.currentTarget)}
        onMouseLeave={() => setPos(null)}
        onFocus={(e) => show(e.currentTarget)}
        onBlur={() => setPos(null)}
        onClick={(e) => e.preventDefault()}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {pos &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            style={{
              position: 'fixed',
              left: Math.min(Math.max(pos.x, 140), window.innerWidth - 140),
              top: pos.y,
              transform: 'translate(-50%, -100%)',
              zIndex: 9999,
              pointerEvents: 'none',
              maxWidth: 260,
            }}
            className="px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-normal leading-relaxed shadow-lg"
          >
            {label}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-gray-900" />
          </div>,
          document.body
        )}
    </>
  );
}
