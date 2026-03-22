/** ePub chapter translator with caching and progress tracking */

import type { EpubChapter } from '../parsers/epub-parser.ts';

export interface TranslatedChapter {
  chapterId: string;
  paragraphs: Array<{ original: string; translated: string }>;
}

const BATCH_SIZE = 20;

/** Translate a single chapter's paragraphs via background service worker */
export async function translateChapter(
  chapter: EpubChapter,
  onProgress?: (done: number, total: number) => void
): Promise<TranslatedChapter> {
  const results: Array<{ original: string; translated: string }> = [];
  const { paragraphs } = chapter;

  for (let i = 0; i < paragraphs.length; i += BATCH_SIZE) {
    const batch = paragraphs.slice(i, i + BATCH_SIZE);

    const response = await chrome.runtime.sendMessage({
      action: 'batch-translate',
      texts: batch,
      sourceLang: 'auto',
      targetLang: 'vi',
    });

    const translations: string[] = response.translations ?? batch;
    for (let j = 0; j < batch.length; j++) {
      results.push({
        original: batch[j],
        translated: translations[j] ?? batch[j],
      });
    }

    onProgress?.(Math.min(i + BATCH_SIZE, paragraphs.length), paragraphs.length);
  }

  return { chapterId: chapter.id, paragraphs: results };
}
