/** Content script — video subtitle detection, extraction, and bilingual rendering */

import { detectPlatform } from '@/lib/platform-hooks/platform-detector.ts';
import { extractYouTubeSubtitles } from '@/lib/platform-hooks/youtube-extractor.ts';
import { extractHTML5Subtitles } from '@/lib/platform-hooks/html5-track-extractor.ts';
import { translateSubtitles } from '@/lib/translators/subtitle-translator.ts';
import { DualSubtitleRenderer } from '@/lib/translators/dual-subtitle-renderer.ts';

export default defineContentScript({
  matches: [
    '*://*.youtube.com/*',
    '*://*.youtu.be/*',
    '*://*.coursera.org/*',
    '*://*.udemy.com/*',
  ],
  runAt: 'document_idle',

  async main() {
    let renderer: DualSubtitleRenderer | null = null;
    let subtitleEnabled = false;

    /** Try to detect video and set up subtitles */
    async function setupSubtitles(): Promise<void> {
      const detected = detectPlatform();
      if (detected.platform === 'none' || !detected.videoElement) return;

      let entries;
      if (detected.platform === 'youtube' && detected.videoId) {
        entries = await extractYouTubeSubtitles(detected.videoId);
      } else {
        entries = await extractHTML5Subtitles(detected.videoElement);
      }

      if (!entries || entries.length === 0) return;

      const translated = await translateSubtitles(entries);
      renderer = new DualSubtitleRenderer(detected.videoElement);
      renderer.mount(translated);
      subtitleEnabled = true;
    }

    // Listen for toggle from popup
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.action === 'toggle-subtitles') {
        if (message.enabled && !subtitleEnabled) {
          setupSubtitles().then(() => sendResponse({ ok: true }));
        } else if (!message.enabled && renderer) {
          renderer.unmount();
          renderer = null;
          subtitleEnabled = false;
          sendResponse({ ok: true });
        }
        return true;
      }
    });

    // Auto-setup if settings enabled
    chrome.runtime.sendMessage({ action: 'get-settings' }, (settings) => {
      if (chrome.runtime.lastError) return;
      if (settings?.enabled) setupSubtitles();
    });
  },
});
