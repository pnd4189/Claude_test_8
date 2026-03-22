/** Provider registry — manages translation providers with fallback chain */

import type { ProviderName } from './types.ts';
import { proxyTranslate, proxyBatchTranslate } from './proxy-client.ts';
import { translateWithGemini } from './gemini-provider.ts';
import { translateWithGlm } from './glm-provider.ts';

export interface TranslateOptions {
  provider: ProviderName;
  proxyUrl: string;
  extensionKey?: string;
  apiKeys: Record<ProviderName, string>;
}

/** Translate single text with fallback chain: proxy → direct Gemini → direct GLM */
export async function translate(
  text: string,
  from: string,
  to: string,
  options: TranslateOptions
): Promise<{ translatedText: string; usedProvider: string }> {
  // 1. Try proxy if configured
  if (options.proxyUrl) {
    try {
      const result = await proxyTranslate(text, from, to, options.provider, {
        proxyUrl: options.proxyUrl,
        extensionKey: options.extensionKey,
      });
      return { translatedText: result.translatedText, usedProvider: `proxy:${result.provider}` };
    } catch {
      // Proxy unavailable, fall through to direct
    }
  }

  // 2. Try direct with selected provider
  try {
    const translated = await translateDirect(text, from, to, options.provider, options.apiKeys);
    return { translatedText: translated, usedProvider: options.provider };
  } catch {
    // Fall through to fallback
  }

  // 3. Fallback to other provider
  const fallback: ProviderName = options.provider === 'gemini' ? 'glm' : 'gemini';
  const translated = await translateDirect(text, from, to, fallback, options.apiKeys);
  return { translatedText: translated, usedProvider: fallback };
}

/** Batch translate with fallback */
export async function batchTranslate(
  texts: string[],
  from: string,
  to: string,
  options: TranslateOptions
): Promise<string[]> {
  // Try proxy batch first
  if (options.proxyUrl) {
    try {
      const result = await proxyBatchTranslate(texts, from, to, options.provider, {
        proxyUrl: options.proxyUrl,
        extensionKey: options.extensionKey,
      });
      return result.translations;
    } catch {
      // Fall through to individual translations
    }
  }

  // Fallback: translate individually
  const results = await Promise.all(
    texts.map((text) => translate(text, from, to, options).then((r) => r.translatedText))
  );
  return results;
}

/** Direct API call to a specific provider */
async function translateDirect(
  text: string,
  from: string,
  to: string,
  provider: ProviderName,
  apiKeys: Record<ProviderName, string>
): Promise<string> {
  const key = apiKeys[provider];
  if (!key) throw new Error(`No API key for ${provider}`);

  return provider === 'gemini'
    ? translateWithGemini(text, from, to, key)
    : translateWithGlm(text, from, to, key);
}
