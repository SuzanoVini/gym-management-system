'use client';

import { type LucideIcon, MoreHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface OverflowMenuItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success';
}

interface OverflowMenuProps {
  items: OverflowMenuItem[];
  note?: string | undefined;
}

export default function OverflowMenu({ items, note }: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const outsideTrigger = triggerRef.current && !triggerRef.current.contains(target);
      const outsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      if (outsideTrigger && outsideDropdown) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ x: rect.right, y: rect.bottom + 4 });
    }
    setOpen((prev) => !prev);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-label="More actions"
        className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              left: pos.x,
              top: pos.y,
              transform: 'translateX(-100%)',
              zIndex: 9999,
            }}
            className="min-w-[160px] bg-white rounded-xl shadow-xl border border-gray-100 py-1 overflow-hidden"
          >
            {note && (
              <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 max-w-[220px] whitespace-pre-wrap break-words">
                {note}
              </div>
            )}
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  item.onClick();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-150 cursor-pointer ${
                  item.variant === 'danger'
                    ? 'text-red-600 hover:bg-red-50'
                    : item.variant === 'success'
                      ? 'text-green-700 hover:bg-green-50'
                      : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
