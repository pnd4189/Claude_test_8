/** Batch translate subtitles and cache results */

import type { SubtitleEntry } from '../parsers/subtitle-parser.ts';

export interface TranslatedSubtitle {
  start: number;
  end: number;
  original: string;
  translated: string;
}

const BATCH_SIZE = 30;

/** Translate all subtitle entries via background service worker */
export async function translateSubtitles(
  entries: SubtitleEntry[],
  onProgress?: (done: number, total: number) => void
): Promise<TranslatedSubtitle[]> {
  const results: TranslatedSubtitle[] = [];

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const texts = batch.map((e) => e.text);

    const response = await chrome.runtime.sendMessage({
      action: 'batch-translate',
      texts,
      sourceLang: 'auto',
      targetLang: 'vi',
    });

    const translations: string[] = response.translations ?? texts;
    for (let j = 0; j < batch.length; j++) {
      results.push({
        start: batch[j].start,
        end: batch[j].end,
        original: batch[j].text,
        translated: translations[j] ?? batch[j].text,
      });
    }

    onProgress?.(Math.min(i + BATCH_SIZE, entries.length), entries.length);
  }

  return results;
}
