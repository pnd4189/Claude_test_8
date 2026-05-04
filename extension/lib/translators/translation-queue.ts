/** Batch + debounce translation queue for efficient API usage */

import type { CollectedParagraph } from './paragraph-collector.ts';

export interface QueuedItem {
  paragraph: CollectedParagraph;
  priority: number; // lower = higher priority (visible paragraphs get 0)
}

export type TranslateBatchFn = (texts: string[]) => Promise<string[]>;

const DEBOUNCE_MS = 600;
const BATCH_SIZE = 20;
const MAX_CONCURRENT = 3;

export class TranslationQueue {
  private queue: QueuedItem[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private activeRequests = 0;
  private translateBatch: TranslateBatchFn;
  private onTranslated: (id: string, translatedText: string) => void;
  private onError: (id: string, error: string) => void;

  constructor(
    translateBatch: TranslateBatchFn,
    onTranslated: (id: string, translatedText: string) => void,
    onError: (id: string, error: string) => void
  ) {
    this.translateBatch = translateBatch;
    this.onTranslated = onTranslated;
    this.onError = onError;
  }

  /** Add paragraphs to queue with priority */
  add(paragraphs: CollectedParagraph[], priority = 1): void {
    for (const p of paragraphs) {
      // Skip duplicates
      if (this.queue.some((q) => q.paragraph.id === p.id)) continue;
      this.queue.push({ paragraph: p, priority });
    }

    // Sort by priority (visible first)
    this.queue.sort((a, b) => a.priority - b.priority);
    this.scheduleFlush();
  }

  /** Mark items as high priority (visible in viewport) */
  prioritize(ids: Set<string>): void {
    for (const item of this.queue) {
      if (ids.has(item.paragraph.id)) item.priority = 0;
    }
    this.queue.sort((a, b) => a.priority - b.priority);
  }

  private scheduleFlush(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.flush(), DEBOUNCE_MS);
  }

  private async flush(): Promise<void> {
    while (this.queue.length > 0 && this.activeRequests < MAX_CONCURRENT) {
      const batch = this.queue.splice(0, BATCH_SIZE);
      this.activeRequests++;

      this.processBatch(batch).finally(() => {
        this.activeRequests--;
        if (this.queue.length > 0) this.flush();
      });
    }
  }

  private async processBatch(batch: QueuedItem[]): Promise<void> {
    const texts = batch.map((item) => item.paragraph.text);
    try {
      const translations = await this.translateBatch(texts);
      if (translations.length !== batch.length) {
        throw new Error(
          `Batch response mismatch: expected ${batch.length} translations, got ${translations.length}`
        );
      }
      for (let i = 0; i < batch.length; i++) {
        this.onTranslated(batch[i].paragraph.id, translations[i]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Translation failed';
      for (const item of batch) {
        this.onError(item.paragraph.id, msg);
      }
    }
  }

  /** Clear pending items */
  clear(): void {
    this.queue = [];
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }
}
