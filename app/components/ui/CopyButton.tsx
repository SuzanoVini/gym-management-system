'use client';

import { Check, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import Tooltip from './Tooltip';

interface CopyButtonProps {
  value: string | undefined | null;
  icon: LucideIcon;
  ariaLabel?: string;
}

export default function CopyButton({ value, icon: Icon, ariaLabel }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  if (!value) {
    return <span className="text-gray-300 text-xs">—</span>;
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Tooltip content={copied ? 'Copied!' : value}>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={ariaLabel ?? `Copy ${value}`}
        className={`inline-flex items-center justify-center h-7 w-7 rounded-lg transition-colors duration-150 cursor-pointer ${
          copied
            ? 'text-green-600 bg-green-50'
            : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
        }`}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
      </button>
    </Tooltip>
  );
}
