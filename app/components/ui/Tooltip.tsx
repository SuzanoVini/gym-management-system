'use client';

import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
}

export default function Tooltip({ content, children }: TooltipProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const cloned = React.cloneElement(children, {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
      children.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      setPos(null);
      children.props.onMouseLeave?.(e);
    },
  });

  return (
    <>
      {cloned}
      {pos && (
        <div
          role="tooltip"
          style={{
            position: 'fixed',
            left: pos.x,
            top: pos.y,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
          }}
          className="pointer-events-none px-2.5 py-1 rounded-lg bg-gray-900 text-white text-xs font-medium whitespace-nowrap shadow-lg"
        >
          {content}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-gray-900" />
        </div>
      )}
    </>
  );
}
