/**
 * Cache utilities for Chrome Extension
 * Uses chrome.storage.local for persistent caching
 */

import type { CachedTranslation } from './types';

const CACHE_PREFIX = 'translation_cache_';
const MAX_CACHE_SIZE = 1000; // Maximum number of cached translations
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

/**
 * Generate cache key
 */
function generateCacheKey(
  text: string,
  sourceLang: string,
  targetLang: string,
  provider: string
): string {
  // Use first 50 chars + length as simple hash
  const textHash = text.substring(0, 50) + text.length;
  return `${CACHE_PREFIX}${sourceLang}_${targetLang}_${provider}_${textHash}`;
}

/**
 * Get cached translation
 */
export async function getCachedTranslation(
  text: string,
  sourceLang: string,
  targetLang: string,
  provider: string
): Promise<string | null> {
  try {
    const key = generateCacheKey(text, sourceLang, targetLang, provider);
    const result = await chrome.storage.local.get(key);

    if (result[key]) {
      const cached: CachedTranslation = result[key];

      // Check if cache is expired
      if (Date.now() - cached.timestamp > CACHE_TTL) {
        await chrome.storage.local.remove(key);
        return null;
      }

      return cached.translatedText;
    }

    return null;
  } catch (error) {
    console.error('Error getting cached translation:', error);
    return null;
  }
}

/**
 * Set cached translation
 */
export async function setCachedTranslation(
  text: string,
  translatedText: string,
  sourceLang: string,
  targetLang: string,
  provider: string
): Promise<void> {
  try {
    const key = generateCacheKey(text, sourceLang, targetLang, provider);

    const cached: CachedTranslation = {
      sourceText: text,
      translatedText,
      sourceLang,
      targetLang,
      provider,
      timestamp: Date.now(),
    };

    await chrome.storage.local.set({ [key]: cached });

    // Clean old cache entries if needed
    await cleanOldCacheEntries();
  } catch (error) {
    console.error('Error setting cached translation:', error);
  }
}

/**
 * Clean old cache entries to prevent storage overflow
 */
async function cleanOldCacheEntries(): Promise<void> {
  try {
    const allItems = await chrome.storage.local.get(null);
    const cacheKeys = Object.keys(allItems).filter((key) =>
      key.startsWith(CACHE_PREFIX)
    );

    if (cacheKeys.length > MAX_CACHE_SIZE) {
      // Sort by timestamp and remove oldest
      const sortedKeys = cacheKeys
        .map((key) => ({
          key,
          timestamp: (allItems[key] as CachedTranslation).timestamp,
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      const keysToRemove = sortedKeys
        .slice(0, sortedKeys.length - MAX_CACHE_SIZE)
        .map((item) => item.key);

      await chrome.storage.local.remove(keysToRemove);

      console.log(`Cleaned ${keysToRemove.length} old cache entries`);
    }
  } catch (error) {
    console.error('Error cleaning cache:', error);
  }
}

/**
 * Clear all cached translations
 */
export async function clearAllCache(): Promise<void> {
  try {
    const allItems = await chrome.storage.local.get(null);
    const cacheKeys = Object.keys(allItems).filter((key) =>
      key.startsWith(CACHE_PREFIX)
    );

    await chrome.storage.local.remove(cacheKeys);
    console.log(`Cleared ${cacheKeys.length} cache entries`);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  totalSize: number;
}> {
  try {
    const allItems = await chrome.storage.local.get(null);
    const cacheKeys = Object.keys(allItems).filter((key) =>
      key.startsWith(CACHE_PREFIX)
    );

    const totalSize = await chrome.storage.local.getBytesInUse(cacheKeys);

    return {
      totalEntries: cacheKeys.length,
      totalSize,
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { totalEntries: 0, totalSize: 0 };
  }
}
