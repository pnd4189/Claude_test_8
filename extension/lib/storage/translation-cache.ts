/** IndexedDB-based translation cache with TTL auto-cleanup */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface CacheEntry {
  hash: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  provider: string;
  timestamp: number;
}

interface TranslationCacheDB extends DBSchema {
  translations: {
    key: string;
    value: CacheEntry;
    indexes: { 'by-timestamp': number };
  };
}

const DB_NAME = 'ai-translation-cache';
const DB_VERSION = 1;
const STORE_NAME = 'translations';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Generate a simple hash for cache key */
function hashKey(text: string, sourceLang: string, targetLang: string, provider: string): string {
  const input = `${sourceLang}:${targetLang}:${provider}:${text}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit int
  }
  return hash.toString(36);
}

let dbPromise: Promise<IDBPDatabase<TranslationCacheDB>> | null = null;

function getDB(): Promise<IDBPDatabase<TranslationCacheDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TranslationCacheDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'hash' });
        store.createIndex('by-timestamp', 'timestamp');
      },
    });
  }
  return dbPromise;
}

/** Get cached translation */
export async function getCachedTranslation(
  text: string,
  sourceLang: string,
  targetLang: string,
  provider: string
): Promise<string | null> {
  const db = await getDB();
  const key = hashKey(text, sourceLang, targetLang, provider);
  const entry = await db.get(STORE_NAME, key);

  if (!entry) return null;

  // Check TTL
  if (Date.now() - entry.timestamp > TTL_MS) {
    await db.delete(STORE_NAME, key);
    return null;
  }

  return entry.translatedText;
}

/** Store translation in cache */
export async function setCachedTranslation(
  text: string,
  translatedText: string,
  sourceLang: string,
  targetLang: string,
  provider: string
): Promise<void> {
  const db = await getDB();
  const key = hashKey(text, sourceLang, targetLang, provider);

  await db.put(STORE_NAME, {
    hash: key,
    sourceText: text,
    translatedText,
    sourceLang,
    targetLang,
    provider,
    timestamp: Date.now(),
  });
}

/** Clear all cached translations */
export async function clearCache(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}

/** Get cache statistics */
export async function getCacheStats(): Promise<{ totalEntries: number; oldestEntry: number | null }> {
  const db = await getDB();
  const count = await db.count(STORE_NAME);

  let oldestEntry: number | null = null;
  const cursor = await db.transaction(STORE_NAME).store.index('by-timestamp').openCursor();
  if (cursor) {
    oldestEntry = cursor.value.timestamp;
  }

  return { totalEntries: count, oldestEntry };
}

/** Remove entries older than TTL */
export async function cleanupExpiredEntries(): Promise<number> {
  const db = await getDB();
  const cutoff = Date.now() - TTL_MS;
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const index = tx.store.index('by-timestamp');

  let removed = 0;
  let cursor = await index.openCursor(IDBKeyRange.upperBound(cutoff));
  while (cursor) {
    await cursor.delete();
    removed++;
    cursor = await cursor.continue();
  }

  await tx.done;
  return removed;
}
