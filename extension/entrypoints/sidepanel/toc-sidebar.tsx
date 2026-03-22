/** Table of contents sidebar for ePub/PDF reader */

import type { TocEntry } from '@/lib/parsers/epub-parser.ts';

interface TocSidebarProps {
  toc: TocEntry[];
  currentChapterId: string;
  onSelect: (chapterId: string) => void;
}

export function TocSidebar({ toc, currentChapterId, onSelect }: TocSidebarProps) {
  return (
    <div className="w-56 border-r overflow-y-auto bg-[var(--card)]">
      <div className="px-3 py-2 text-xs font-semibold uppercase text-[var(--muted-foreground)]">
        Contents
      </div>
      <ul className="space-y-0.5 px-1 pb-4">
        {toc.map((entry) => (
          <li key={entry.chapterId}>
            <button
              onClick={() => onSelect(entry.chapterId)}
              className={`w-full text-left px-2 py-1.5 rounded text-sm truncate transition-colors ${
                entry.chapterId === currentChapterId
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'hover:bg-[var(--accent)]'
              }`}
            >
              {entry.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
