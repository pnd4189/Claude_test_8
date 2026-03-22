/** Auto-detect source language of webpage content */

const LANG_CACHE = new Map<string, string>();

/** Detect language using HTML lang attribute or content sampling */
export function detectLanguage(): string {
  const hostname = window.location.hostname;

  // Check cache
  const cached = LANG_CACHE.get(hostname);
  if (cached) return cached;

  // Try HTML lang attribute first
  const htmlLang = document.documentElement.lang?.toLowerCase();
  if (htmlLang) {
    const lang = normalizeLang(htmlLang);
    LANG_CACHE.set(hostname, lang);
    return lang;
  }

  // Fallback: detect from meta content-language
  const metaLang = document.querySelector<HTMLMetaElement>('meta[http-equiv="content-language"]')?.content;
  if (metaLang) {
    const lang = normalizeLang(metaLang);
    LANG_CACHE.set(hostname, lang);
    return lang;
  }

  // Default to auto-detect by AI
  return 'auto';
}

/** Normalize language code to our supported values */
function normalizeLang(lang: string): string {
  const code = lang.split('-')[0].toLowerCase();
  if (code === 'en') return 'en';
  if (code === 'zh') return 'zh';
  if (code === 'vi') return 'vi';
  return 'auto';
}
