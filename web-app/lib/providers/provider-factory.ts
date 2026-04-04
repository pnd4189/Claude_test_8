/** Provider factory — get a translation client by provider name */

import { createOpenRouterClient } from './openrouter';
import { createQwenClient } from './qwen';
import { createGroqClient } from './groq';
import { createGlmClient } from './glm';
import { createGeminiClient } from './gemini';

export interface TranslateClient {
  translate(text: string, sourceLang: string, targetLang: string, model?: string): Promise<string>;
}

/** Returns a provider client or null if not configured */
export function getProvider(name: string): TranslateClient | null {
  switch (name) {
    case 'openrouter': return createOpenRouterClient();
    case 'qwen':       return createQwenClient();
    case 'groq':       return createGroqClient();
    case 'glm':        return createGlmClient();
    case 'gemini':     return createGeminiClient();
    default:           return null;
  }
}
