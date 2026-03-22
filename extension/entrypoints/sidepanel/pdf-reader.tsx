/** PDF reader — page rendering with bilingual translation overlay */

import { useState, useEffect, useRef, useCallback } from 'react';
import { parsePdf, renderPdfPage, type ParsedPdf } from '@/lib/parsers/pdf-parser.ts';
import { translatePdfPage, type TranslatedPage } from '@/lib/translators/pdf-translator.ts';

type PdfDisplayMode = 'bilingual' | 'original' | 'translation-only';

interface PdfReaderProps {
  fileData: ArrayBuffer;
}

export function PdfReader({ fileData }: PdfReaderProps) {
  const [pdf, setPdf] = useState<ParsedPdf | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [translatedPage, setTranslatedPage] = useState<TranslatedPage | null>(null);
  const [translating, setTranslating] = useState(false);
  const [displayMode, setDisplayMode] = useState<PdfDisplayMode>('bilingual');
  const [scale, setScale] = useState(1.5);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Parse PDF on mount
  useEffect(() => {
    parsePdf(fileData).then(setPdf).catch((e) => setError(e.message));
  }, [fileData]);

  // Render page to canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    renderPdfPage(fileData, currentPage, canvasRef.current, scale).catch(() => {});
  }, [fileData, currentPage, scale]);

  // Translate current page
  const translateCurrentPage = useCallback(async () => {
    if (!pdf) return;
    const page = pdf.pages[currentPage - 1];
    if (!page) return;

    setTranslating(true);
    try {
      const result = await translatePdfPage(page);
      setTranslatedPage(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Translation failed');
    } finally {
      setTranslating(false);
    }
  }, [pdf, currentPage]);

  // Auto-translate when page changes
  useEffect(() => {
    if (displayMode !== 'original') translateCurrentPage();
  }, [currentPage, displayMode, translateCurrentPage]);

  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (!pdf) return <div className="p-4 text-[var(--muted-foreground)]">Loading PDF...</div>;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b px-3 py-2 text-sm">
        <button
          disabled={currentPage <= 1}
          onClick={() => setCurrentPage((p) => p - 1)}
          className="px-2 py-1 rounded bg-[var(--secondary)] disabled:opacity-40"
        >
          Prev
        </button>
        <span className="text-[var(--muted-foreground)]">
          {currentPage} / {pdf.numPages}
        </span>
        <button
          disabled={currentPage >= pdf.numPages}
          onClick={() => setCurrentPage((p) => p + 1)}
          className="px-2 py-1 rounded bg-[var(--secondary)] disabled:opacity-40"
        >
          Next
        </button>

        <div className="flex-1" />

        <select
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
          className="rounded border bg-[var(--background)] px-1 py-0.5 text-xs"
        >
          <option value={1}>100%</option>
          <option value={1.5}>150%</option>
          <option value={2}>200%</option>
        </select>

        <select
          value={displayMode}
          onChange={(e) => setDisplayMode(e.target.value as PdfDisplayMode)}
          className="rounded border bg-[var(--background)] px-1 py-0.5 text-xs"
        >
          <option value="bilingual">Bilingual</option>
          <option value="original">Original</option>
          <option value="translation-only">Translation</option>
        </select>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-auto p-4 flex justify-center">
        <div className="relative inline-block">
          {/* PDF canvas */}
          {displayMode !== 'translation-only' && (
            <canvas ref={canvasRef} className="block shadow-lg" />
          )}

          {/* Translation overlay */}
          {displayMode === 'bilingual' && translatedPage && (
            <div className="absolute inset-0 pointer-events-none">
              {translatedPage.blocks.map((block, i) => (
                <div
                  key={i}
                  className="absolute bg-yellow-100/80 dark:bg-yellow-900/60 text-xs leading-tight px-1 rounded"
                  style={{
                    left: block.original.x * scale,
                    top: block.original.y * scale,
                    maxWidth: block.original.width * scale,
                  }}
                >
                  {block.translated}
                </div>
              ))}
            </div>
          )}

          {/* Translation-only mode */}
          {displayMode === 'translation-only' && translatedPage && (
            <div className="max-w-2xl space-y-3 p-4">
              {translatedPage.blocks.map((block, i) => (
                <p key={i} className="leading-relaxed">{block.translated}</p>
              ))}
            </div>
          )}

          {translating && (
            <div className="absolute top-2 right-2 bg-[var(--background)] border rounded px-2 py-1 text-xs shadow">
              Translating...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
