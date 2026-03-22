/** Reading progress persistence via chrome.storage.local */

export interface ReadingProgress {
  bookHash: string;
  currentChapter: number;
  scrollPosition: number;
  lastRead: number; // timestamp
}

const STORAGE_KEY = 'reading-progress';

/** Save reading progress */
export async function saveProgress(progress: ReadingProgress): Promise<void> {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const all: Record<string, ReadingProgress> = stored[STORAGE_KEY] ?? {};
    all[progress.bookHash] = progress;
    await chrome.storage.local.set({ [STORAGE_KEY]: all });
  } catch {
    // Non-extension context
  }
}

/** Get reading progress for a book */
export async function getProgress(bookHash: string): Promise<ReadingProgress | null> {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const all: Record<string, ReadingProgress> = stored[STORAGE_KEY] ?? {};
    return all[bookHash] ?? null;
  } catch {
    return null;
  }
}

/** Generate a simple hash from book metadata for cache key */
export function generateBookHash(title: string, author: string): string {
  const input = `${title}:${author}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return `book-${Math.abs(hash).toString(36)}`;
}
