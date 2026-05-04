/** PDF page-level translator with caching */

import type { PdfPage, TextBlock } from '../parsers/pdf-parser.ts';

export interface TranslatedBlock {
  original: TextBlock;
  translated: string;
}

export interface TranslatedPage {
  pageNum: number;
  blocks: TranslatedBlock[];
}

const BATCH_SIZE = 20;

/** Translate all text blocks on a PDF page */
export async function translatePdfPage(
  page: PdfPage,
  onProgress?: (done: number, total: number) => void
): Promise<TranslatedPage> {
  const settings = await chrome.storage.local.get('settings');
  const targetLang = settings.settings?.targetLang ?? 'vi';
  const blocks = page.textBlocks;
  const results: TranslatedBlock[] = [];

  for (let i = 0; i < blocks.length; i += BATCH_SIZE) {
    const batch = blocks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((b) => b.text);

    const response = await chrome.runtime.sendMessage({
      action: 'batch-translate',
      texts,
      sourceLang: 'auto',
      targetLang,
    });

    const translations: string[] = response.translations ?? texts;
    for (let j = 0; j < batch.length; j++) {
      results.push({
        original: batch[j],
        translated: translations[j] ?? batch[j].text,
      });
    }

    onProgress?.(Math.min(i + BATCH_SIZE, blocks.length), blocks.length);
  }

  return { pageNum: page.pageNum, blocks: results };
}
