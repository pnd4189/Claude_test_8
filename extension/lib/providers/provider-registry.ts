/** Provider registry — manages translation providers with fallback chain */

import type { ProviderName } from './types.ts';
import { logger } from '@/lib/utils/logger.ts';
import { proxyTranslate, proxyBatchTranslate } from './proxy-client.ts';
import { translateWithGemini } from './gemini-provider.ts';
import { translateWithGlm } from './glm-provider.ts';
import { translateWithGroq } from './groq-provider.ts';
import { translateWithQwen } from './qwen-provider.ts';
import { translateWithFreeLLMAPI } from './freellmapi-provider.ts';

export interface TranslateOptions {
  provider: ProviderName;
  providerMode: 'byok' | 'proxy';
  proxyUrl: string;
  freellmapiUrl: string;
  extensionKey?: string;
  apiKeys: Record<ProviderName, string>;
}

/** Fallback order for BYOK mode — try selected provider first, then others */
const FALLBACK_ORDER: ProviderName[] = ['freellmapi', 'gemini', 'groq', 'glm', 'qwen'];

/** Translate single text respecting providerMode, with fallback chain */
export async function translate(
  text: string,
  from: string,
  to: string,
  options: TranslateOptions
): Promise<{ translatedText: string; usedProvider: string }> {
  // Proxy mode: use proxy only, no BYOK fallback
  if (options.providerMode === 'proxy') {
    if (!options.proxyUrl) throw new Error('Proxy URL not configured');
    const result = await proxyTranslate(text, from, to, options.provider, {
      proxyUrl: options.proxyUrl,
      extensionKey: options.extensionKey,
    });
    return { translatedText: result.translatedText, usedProvider: `proxy:${result.provider}` };
  }

  // BYOK mode: try FreeLLMAPI first (if configured), then selected provider, then fallback chain
  // 0. Try FreeLLMAPI first — #1 priority
  if (options.freellmapiUrl && options.apiKeys['freellmapi']) {
    try {
      const translated = await translateWithFreeLLMAPI(text, from, to, options.freellmapiUrl, options.apiKeys['freellmapi']);
      return { translatedText: translated, usedProvider: 'freellmapi' };
    } catch {
      // FreeLLMAPI unavailable (miniPC off), fall through
    }
  }

  // 1. Also try proxy as primary if configured
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

  // 2. Try selected provider directly
  try {
    const translated = await translateDirect(text, from, to, options.provider, options.apiKeys);
    return { translatedText: translated, usedProvider: options.provider };
  } catch {
    // Fall through to fallback chain
  }

  // 3. Try remaining providers in fallback order
  const fallbacks = FALLBACK_ORDER.filter((p) => p !== options.provider);
  for (const fallback of fallbacks) {
    try {
      const translated = await translateDirect(text, from, to, fallback, options.apiKeys);
      return { translatedText: translated, usedProvider: fallback };
    } catch {
      // Try next
    }
  }

  throw new Error('All providers failed');
}

const MAX_CONCURRENT = 3;

async function limitConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let nextIdx = 0;

  async function runNext(): Promise<void> {
    while (nextIdx < tasks.length) {
      const idx = nextIdx++;
      try {
        results[idx] = { status: 'fulfilled', value: await tasks[idx]() };
      } catch (err) {
        results[idx] = { status: 'rejected', reason: err };
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => runNext());
  await Promise.all(workers);
  return results;
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

  // Fallback: translate individually with concurrency limit and graceful partial failure
  const tasks = texts.map((text) => () => translate(text, from, to, options).then(r => r.translatedText));
  const settled = await limitConcurrency(tasks, MAX_CONCURRENT);

  return settled.map((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    logger.warn('provider-registry', `Failed to translate text at index ${i}`, result.reason instanceof Error ? result.reason.message : String(result.reason));
    return texts[i];
  });
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

  switch (provider) {
    case 'freellmapi': throw new Error('FreeLLMAPI handled in translate(), not via translateDirect()');
    case 'gemini': return translateWithGemini(text, from, to, key);
    case 'glm':    return translateWithGlm(text, from, to, key);
    case 'groq':   return translateWithGroq(text, from, to, key);
    case 'qwen':   return translateWithQwen(text, from, to, key);
  }
}
