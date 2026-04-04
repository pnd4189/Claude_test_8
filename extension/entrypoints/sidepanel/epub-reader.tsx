/** ePub reader — chapter navigation, bilingual display, progress tracking, EPUB export */

import { useState, useEffect, useCallback, useRef } from 'react';
import { parseEpub, type ParsedEpub } from '@/lib/parsers/epub-parser.ts';
import { translateChapter, type TranslatedChapter } from '@/lib/translators/epub-translator.ts';
import { saveProgress, getProgress, generateBookHash } from '@/lib/storage/reading-progress-store.ts';
import { exportTranslatedEpub } from '@/lib/exporters/epub-exporter.ts';
import { ChapterView } from './chapter-view.tsx';
import { TocSidebar } from './toc-sidebar.tsx';

type DisplayMode = 'stacked' | 'side-by-side' | 'translation-only';

interface EpubReaderProps {
  fileData: ArrayBuffer;
}

export function EpubReader({ fileData }: EpubReaderProps) {
  const [epub, setEpub] = useState<ParsedEpub | null>(null);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [translatedChapter, setTranslatedChapter] = useState<TranslatedChapter | null>(null);
  const [translating, setTranslating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [displayMode, setDisplayMode] = useState<DisplayMode>('stacked');
  const [tocOpen, setTocOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Cache all translated chapters for export
  const translatedCache = useRef<Map<number, string[]>>(new Map());

  // Parse ePub on mount
  useEffect(() => {
    parseEpub(fileData).then(setEpub).catch((e) => setError(e.message));
  }, [fileData]);

  // Restore reading progress
  useEffect(() => {
    if (!epub) return;
    const hash = generateBookHash(epub.metadata.title, epub.metadata.author);
    getProgress(hash).then((p) => {
      if (p) setCurrentChapter(p.currentChapter);
    });
  }, [epub]);

  // Translate current chapter
  useEffect(() => {
    if (!epub || !epub.chapters[currentChapter]) return;

    // Check cache first
    const cached = translatedCache.current.get(currentChapter);
    if (cached) {
      setTranslatedChapter({
        chapterId: epub.chapters[currentChapter].id,
        paragraphs: epub.chapters[currentChapter].paragraphs.map((orig, i) => ({
          original: orig,
          translated: cached[i] ?? orig,
        })),
      });
      return;
    }

    setTranslating(true);
    setTranslatedChapter(null);

    translateChapter(epub.chapters[currentChapter], (done, total) => {
      setProgress({ done, total });
    })
      .then((result) => {
        setTranslatedChapter(result);
        // Cache translated paragraphs for export
        translatedCache.current.set(
          currentChapter,
          result.paragraphs.map((p) => p.translated)
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setTranslating(false));
  }, [epub, currentChapter]);

  // Save progress on chapter change
  const persistProgress = useCallback(() => {
    if (!epub) return;
    const hash = generateBookHash(epub.metadata.title, epub.metadata.author);
    saveProgress({ bookHash: hash, currentChapter, scrollPosition: 0, lastRead: Date.now() });
  }, [epub, currentChapter]);

  useEffect(() => { persistProgress(); }, [persistProgress]);

  // Export translated EPUB
  const handleExport = useCallback(async (mode: 'replace' | 'bilingual') => {
    if (!epub || translatedCache.current.size === 0) return;
    setExporting(true);
    try {
      const blob = await exportTranslatedEpub({
        originalData: fileData,
        translatedChapters: translatedCache.current,
        mode,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${epub.metadata.title || 'translated'}.epub`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }, [epub, fileData]);

  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (!epub) return <div className="p-4 text-[var(--muted-foreground)]">Parsing ePub...</div>;

  const chapter = epub.chapters[currentChapter];
  const cachedCount = translatedCache.current.size;

  return (
    <div className="flex h-full">
      {/* TOC sidebar */}
      {tocOpen && (
        <TocSidebar
          toc={epub.toc}
          currentChapterId={chapter?.id ?? ''}
          onSelect={(id) => {
            const idx = epub.chapters.findIndex((c) => c.id === id);
            if (idx >= 0) setCurrentChapter(idx);
            setTocOpen(false);
          }}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b px-3 py-2 text-sm">
          <button onClick={() => setTocOpen(!tocOpen)} className="px-2 py-1 rounded hover:bg-[var(--accent)]">
            TOC
          </button>
          <span className="flex-1 truncate font-medium">{chapter?.title}</span>
          <select
            value={displayMode}
            onChange={(e) => setDisplayMode(e.target.value as DisplayMode)}
            className="rounded border bg-[var(--background)] px-1 py-0.5 text-xs"
          >
            <option value="stacked">Stacked</option>
            <option value="side-by-side">Side by Side</option>
            <option value="translation-only">Translation Only</option>
          </select>
          {/* Export dropdown */}
          {cachedCount > 0 && (
            <div className="relative group">
              <button
                disabled={exporting}
                className="px-2 py-1 rounded bg-[var(--primary)] text-[var(--primary-foreground)] text-xs hover:opacity-90 disabled:opacity-50"
              >
                {exporting ? 'Exporting...' : `Export (${cachedCount}ch)`}
              </button>
              <div className="hidden group-hover:block absolute right-0 top-full mt-1 bg-[var(--background)] border rounded shadow-lg z-10 min-w-[160px]">
                <button
                  onClick={() => handleExport('bilingual')}
                  className="block w-full text-left px-3 py-2 text-xs hover:bg-[var(--accent)]"
                >
                  Bilingual EPUB
                </button>
                <button
                  onClick={() => handleExport('replace')}
                  className="block w-full text-left px-3 py-2 text-xs hover:bg-[var(--accent)]"
                >
                  Translated Only
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Chapter content */}
        <div className="flex-1 overflow-y-auto p-4">
          {translating && (
            <div className="text-sm text-[var(--muted-foreground)] mb-4">
              Translating... {progress.done}/{progress.total} paragraphs
            </div>
          )}
          {translatedChapter && (
            <ChapterView paragraphs={translatedChapter.paragraphs} displayMode={displayMode} />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between border-t px-3 py-2 text-sm">
          <button
            disabled={currentChapter <= 0}
            onClick={() => setCurrentChapter((c) => c - 1)}
            className="px-3 py-1 rounded bg-[var(--secondary)] disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-[var(--muted-foreground)]">
            {currentChapter + 1} / {epub.chapters.length}
          </span>
          <button
            disabled={currentChapter >= epub.chapters.length - 1}
            onClick={() => setCurrentChapter((c) => c + 1)}
            className="px-3 py-1 rounded bg-[var(--secondary)] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
