/** Background service worker — message router and API orchestrator */

import { DEFAULT_SETTINGS, type ExtensionMessage, type ExtensionSettings } from '@/lib/utils/message-types.ts';
import {
  getCachedTranslation,
  setCachedTranslation,
  clearCache,
  getCacheStats,
  cleanupExpiredEntries,
} from '@/lib/storage/translation-cache.ts';
import { translate, batchTranslate } from '@/lib/providers/provider-registry.ts';

export default defineBackground(() => {
  // Clean up expired cache entries on startup
  cleanupExpiredEntries().catch(() => {});

  // Context menu: "Translate selection"
  chrome.contextMenus?.create({
    id: 'translate-selection',
    title: 'Translate Selection',
    contexts: ['selection'],
  });

  chrome.contextMenus?.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'translate-selection' && info.selectionText && tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'translate',
        text: info.selectionText,
        sourceLang: 'auto',
        targetLang: 'vi',
      });
    }
  });

  // Message handler
  chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse).catch((err) => {
      sendResponse({ error: err instanceof Error ? err.message : 'Unknown error' });
    });
    return true; // Keep channel open for async response
  });
});

async function handleMessage(message: ExtensionMessage): Promise<unknown> {
  switch (message.action) {
    case 'translate':
      return handleTranslate(message.text, message.sourceLang, message.targetLang);

    case 'batch-translate':
      return handleBatchTranslate(message.texts, message.sourceLang, message.targetLang);

    case 'get-settings':
      return getSettings();

    case 'update-settings':
      return updateSettings(message.settings);

    case 'clear-cache':
      await clearCache();
      return { success: true };

    case 'get-cache-stats':
      return getCacheStats();

    default:
      return { error: 'Unknown action' };
  }
}

async function getSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.local.get('settings');
  return stored.settings ?? DEFAULT_SETTINGS;
}

async function updateSettings(partial: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await getSettings();
  const updated = { ...current, ...partial };
  await chrome.storage.local.set({ settings: updated });
  return updated;
}

async function handleTranslate(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<{ translatedText: string; cached: boolean }> {
  const settings = await getSettings();

  // Check local IndexedDB cache first
  const cached = await getCachedTranslation(text, sourceLang, targetLang, settings.provider);
  if (cached) return { translatedText: cached, cached: true };

  // Translate via provider registry (proxy → direct with fallback)
  const result = await translate(text, sourceLang, targetLang, {
    provider: settings.provider,
    proxyUrl: settings.proxyUrl,
    apiKeys: settings.apiKeys,
  });

  // Cache locally
  await setCachedTranslation(text, result.translatedText, sourceLang, targetLang, settings.provider);
  return { translatedText: result.translatedText, cached: false };
}

async function handleBatchTranslate(
  texts: string[],
  sourceLang: string,
  targetLang: string
): Promise<{ translations: string[] }> {
  const settings = await getSettings();

  const translations = await batchTranslate(texts, sourceLang, targetLang, {
    provider: settings.provider,
    proxyUrl: settings.proxyUrl,
    apiKeys: settings.apiKeys,
  });

  return { translations };
}
