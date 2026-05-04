/** Provider factory — get a translation client by provider name (module-level singleton cache) */

import { createOpenRouterClient } from './openrouter';
import { createQwenClient } from './qwen';
import { createGroqClient } from './groq';
import { createGlmClient } from './glm';
import { createGeminiClient } from './gemini';
import { createFreeLLMAPIClient } from './freellmapi';

export interface TranslateClient {
  translate(text: string, sourceLang: string, targetLang: string, model?: string): Promise<string>;
}

const providerCache = new Map<string, TranslateClient | null>();

const PROVIDER_FACTORIES: Record<string, () => TranslateClient | null> = {
  openrouter: createOpenRouterClient,
  qwen: createQwenClient,
  groq: createGroqClient,
  glm: createGlmClient,
  gemini: createGeminiClient,
  freellmapi: createFreeLLMAPIClient,
};

/** Returns a cached provider client or null if not configured */
export function getProvider(name: string): TranslateClient | null {
  if (providerCache.has(name)) return providerCache.get(name) ?? null;

  const factory = PROVIDER_FACTORIES[name];
  const client = factory ? factory() : null;
  providerCache.set(name, client);
  return client;
}
