/** Base class for OpenAI-compatible translation providers (Qwen, Groq, GLM) */

import { APIKeyRotator } from '../api-key-rotator';
import type { ChatCompletionResponse } from './types';

interface ProviderConfig {
  name: string;
  baseUrl: string;
  defaultModel: string;
  envPrefix: string;
}

export class OpenAICompatibleProvider {
  private rotator: APIKeyRotator;
  private baseUrl: string;
  private defaultModel: string;
  readonly name: string;

  constructor(config: ProviderConfig, apiKeys: string[]) {
    this.name = config.name;
    this.baseUrl = config.baseUrl;
    this.defaultModel = config.defaultModel;
    this.rotator = new APIKeyRotator(apiKeys, config.name);
  }

  async translate(
    text: string,
    sourceLang: string,
    targetLang: string,
    model?: string
  ): Promise<string> {
    const systemPrompt = `You are a professional translator. Translate the following text from ${sourceLang} to ${targetLang}. Maintain the original meaning, tone, and formatting. Only return the translated text without any explanations or additional content.`;

    return this.rotator.executeWithRotation(async (apiKey) => {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || this.defaultModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });

      if (!res.ok) {
        const err: any = new Error(`${this.name} API error: ${res.status}`);
        err.status = res.status;
        try { err.message = (await res.json()).error?.message || err.message; } catch {}
        throw err;
      }

      const data: ChatCompletionResponse = await res.json();
      return data.choices[0]?.message?.content || '';
    });
  }

  getStats() { return this.rotator.getStats(); }
}

/** Create provider from env vars with pattern PREFIX_1, PREFIX_2, ..., PREFIX */
export function loadKeysFromEnv(prefix: string): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const key = process.env[`${prefix}_${i}`];
    if (key) keys.push(key);
  }
  const single = process.env[prefix];
  if (single && !keys.includes(single)) keys.push(single);
  return keys;
}
