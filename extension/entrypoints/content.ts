/** Content script — webpage bilingual translation with lazy loading and SPA support */

import { detectContentArea } from '@/lib/translators/content-detector.ts';
import { collectParagraphs, setTranslationState } from '@/lib/translators/paragraph-collector.ts';
import { TranslationQueue } from '@/lib/translators/translation-queue.ts';
import { renderTranslation, removeAllTranslations } from '@/lib/translators/bilingual-renderer.ts';
import { MutationWatcher } from '@/lib/translators/mutation-watcher.ts';
import { detectLanguage } from '@/lib/utils/language-detector.ts';
import type { DisplayMode } from '@/lib/providers/types.ts';

export default defineContentScript({
  matches: ['<all_urls>'],
  excludeMatches: ['*://extensions/*', '*://devtools/*'],
  css: ['@/styles/bilingual-display.css'],

  main() {
    const url = window.location.href;
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return;

    let enabled = false;
    let displayMode: DisplayMode = 'below';
    let targetLang = 'vi';
    const sourceLang = detectLanguage();
    const elementMap = new Map<string, HTMLElement>();

    // Translation queue — sends batch requests to background
    const queue = new TranslationQueue(
      async (texts) => {
        const response = await chrome.runtime.sendMessage({
          action: 'batch-translate',
          texts,
          sourceLang,
          targetLang,
        });
        return response.translations;
      },
      (id, translatedText) => {
        const el = elementMap.get(id);
        if (el) {
          setTranslationState(el, 'translated');
          renderTranslation(el, translatedText, displayMode);
        }
      },
      (id, _error) => {
        const el = elementMap.get(id);
        if (el) setTranslationState(el, 'error');
      }
    );

    // Mutation watcher for SPA/dynamic content
    const watcher = new MutationWatcher((addedNodes) => {
      if (!enabled) return;
      for (const node of addedNodes) {
        const paragraphs = collectParagraphs(node);
        for (const p of paragraphs) elementMap.set(p.id, p.element);
        queue.add(paragraphs);
      }
    });

    // IntersectionObserver — prioritize visible paragraphs
    const visibleIds = new Set<string>();
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).getAttribute('data-ait-id');
          if (!id) continue;
          if (entry.isIntersecting) visibleIds.add(id);
          else visibleIds.delete(id);
        }
        queue.prioritize(visibleIds);
      },
      { threshold: 0.1 }
    );

    /** Start translating the page */
    function startTranslation(): void {
      const container = detectContentArea();
      if (!container) return;

      const paragraphs = collectParagraphs(container);
      for (const p of paragraphs) {
        elementMap.set(p.id, p.element);
        setTranslationState(p.element, 'translating');
        intersectionObserver.observe(p.element);
      }

      queue.add(paragraphs);
      watcher.observe(container);
    }

    /** Stop translating */
    function stopTranslation(): void {
      queue.clear();
      watcher.disconnect();
      intersectionObserver.disconnect();
      removeAllTranslations();
    }

    // Listen for messages from popup/background
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.action === 'toggle-translation') {
        enabled = message.enabled;
        if (enabled) startTranslation();
        else stopTranslation();
        sendResponse({ ok: true });
      }
      if (message.action === 'update-display-mode') {
        displayMode = message.displayMode;
        // Re-render with new mode
        if (enabled) {
          removeAllTranslations();
          startTranslation();
        }
        sendResponse({ ok: true });
      }
      return true;
    });

    // Load initial settings and auto-start if enabled
    chrome.runtime.sendMessage({ action: 'get-settings' }, (settings) => {
      if (chrome.runtime.lastError) return;
      if (settings?.enabled) {
        enabled = true;
        displayMode = settings.displayMode ?? 'below';
        targetLang = settings.targetLang ?? 'vi';
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', startTranslation);
        } else {
          startTranslation();
        }
      }
    });
  },
});
