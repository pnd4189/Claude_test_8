/** Chapter view — bilingual paragraph display with 3 modes */

interface Paragraph {
  original: string;
  translated: string;
}

interface ChapterViewProps {
  paragraphs: Paragraph[];
  displayMode: 'stacked' | 'side-by-side' | 'translation-only';
}

export function ChapterView({ paragraphs, displayMode }: ChapterViewProps) {
  if (displayMode === 'translation-only') {
    return (
      <div className="space-y-3">
        {paragraphs.map((p, i) => (
          <p key={i} className="leading-relaxed">{p.translated}</p>
        ))}
      </div>
    );
  }

  if (displayMode === 'side-by-side') {
    return (
      <div className="space-y-3">
        {paragraphs.map((p, i) => (
          <div key={i} className="flex gap-4">
            <p className="flex-1 leading-relaxed text-[var(--muted-foreground)]">{p.original}</p>
            <p className="flex-1 leading-relaxed">{p.translated}</p>
          </div>
        ))}
      </div>
    );
  }

  // Stacked (default)
  return (
    <div className="space-y-4">
      {paragraphs.map((p, i) => (
        <div key={i}>
          <p className="leading-relaxed text-[var(--muted-foreground)] text-sm">{p.original}</p>
          <p className="leading-relaxed mt-1 pl-3 border-l-2 border-[var(--primary)]">{p.translated}</p>
        </div>
      ))}
    </div>
  );
}
