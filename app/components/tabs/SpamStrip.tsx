'use client';

import { RotateCcw } from 'lucide-react';
import { useMemo } from 'react';
import OverflowMenu from '@/components/ui/OverflowMenu';
import { formatDate } from '@/lib/supabase/utils';
import { buildSearchIndex, searchMatches } from '@/lib/utils/search';
import type { Intro } from '@/types';

interface Props {
  spamIntros: Intro[] | null;
  searchTerm: string;
  onRestore: (intro: Intro) => void;
}

export default function SpamStrip({ spamIntros, searchTerm, onRestore }: Props) {
  const index = useMemo(
    () =>
      new Map((spamIntros ?? []).map((i) => [i, buildSearchIndex([i.name, i.email], [i.phone])])),
    [spamIntros]
  );
  const matches = useMemo(() => {
    if (!searchTerm.trim() || !spamIntros) {
      return [];
    }
    return spamIntros.filter((i) => {
      const idx = index.get(i);
      return idx ? searchMatches(idx, searchTerm) : false;
    });
  }, [spamIntros, searchTerm, index]);

  if (matches.length === 0) {
    return null;
  }
  return (
    <section className="section-container opacity-60" aria-label="Spam matches">
      <h3 className="text-sm font-semibold text-gray-600 mb-2">
        Marked as spam ({matches.length})
      </h3>
      <ul className="divide-y divide-gray-100">
        {matches.map((intro) => (
          <li
            key={intro.id}
            className="flex items-center justify-between py-2 text-sm italic text-gray-500"
          >
            <span className="flex items-center gap-2">
              <span className="not-italic rounded bg-red-100 text-red-700 px-1.5 py-0.5 text-xs font-semibold">
                Spam
              </span>
              <span>{intro.name}</span>
              {intro.email && <span>· {intro.email}</span>}
              {intro.phone && <span>· {intro.phone}</span>}
              {intro.date && <span>· {formatDate(intro.date)}</span>}
            </span>
            <OverflowMenu
              items={[
                {
                  label: 'Not spam',
                  icon: RotateCcw,
                  variant: 'success',
                  onClick: () => onRestore(intro),
                },
              ]}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
