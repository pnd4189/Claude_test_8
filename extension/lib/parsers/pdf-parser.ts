/** PDF parser — lazy-loads PDF.js, extracts text blocks with positioning */

import type { TextItem } from 'pdfjs-dist/types/src/display/api';

export interface TextBlock {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfPage {
  pageNum: number;
  textBlocks: TextBlock[];
  width: number;
  height: number;
}

export interface ParsedPdf {
  numPages: number;
  pages: PdfPage[];
}

/** Lazy-load PDF.js */
async function loadPdfJs() {
  const pdfjsLib = await import('pdfjs-dist');
  // Use bundled worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
  return pdfjsLib;
}

/** Parse PDF and extract text from all pages */
export async function parsePdf(
  data: ArrayBuffer,
  onProgress?: (page: number, total: number) => void
): Promise<ParsedPdf> {
  const pdfjsLib = await loadPdfJs();
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const pages: PdfPage[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();

    // Group text items into logical blocks by Y-coordinate proximity
    const blocks = groupTextBlocks(textContent.items as TextItem[], viewport.height);

    pages.push({
      pageNum: i,
      textBlocks: blocks,
      width: viewport.width,
      height: viewport.height,
    });

    onProgress?.(i, doc.numPages);
  }

  return { numPages: doc.numPages, pages };
}

/** Render a single PDF page to canvas */
export async function renderPdfPage(
  data: ArrayBuffer,
  pageNum: number,
  canvas: HTMLCanvasElement,
  scale = 1.5
): Promise<void> {
  const pdfjsLib = await loadPdfJs();
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const page = await doc.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;

  await page.render({ canvasContext: ctx, viewport }).promise;
}

/** Group individual text items into paragraph-level blocks */
function groupTextBlocks(items: TextItem[], pageHeight: number): TextBlock[] {
  if (items.length === 0) return [];

  const LINE_THRESHOLD = 3; // Y-distance to merge lines into same block

  // Sort items by Y position (top to bottom), then X (left to right)
  const sorted = items
    .filter((item) => item.str.trim().length > 0)
    .map((item) => ({
      text: item.str,
      x: item.transform[4],
      y: pageHeight - item.transform[5], // PDF coords are bottom-up
      width: item.width,
      height: item.height,
    }))
    .sort((a, b) => a.y - b.y || a.x - b.x);

  const blocks: TextBlock[] = [];
  let current: typeof sorted = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = current[current.length - 1];
    const item = sorted[i];

    // Same block if Y-distance is within threshold
    if (Math.abs(item.y - prev.y) < (prev.height || 12) + LINE_THRESHOLD) {
      current.push(item);
    } else {
      blocks.push(mergeItems(current));
      current = [item];
    }
  }

  if (current.length > 0) blocks.push(mergeItems(current));

  return blocks.filter((b) => b.text.trim().length > 5);
}

function mergeItems(items: Array<{ text: string; x: number; y: number; width: number; height: number }>): TextBlock {
  const text = items.map((i) => i.text).join(' ');
  const x = Math.min(...items.map((i) => i.x));
  const y = Math.min(...items.map((i) => i.y));
  const maxX = Math.max(...items.map((i) => i.x + i.width));
  const maxY = Math.max(...items.map((i) => i.y + i.height));
  return { text, x, y, width: maxX - x, height: maxY - y };
}
