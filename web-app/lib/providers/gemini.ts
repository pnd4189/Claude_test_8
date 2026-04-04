/** Gemini (Google) provider — custom REST format, not OpenAI-compatible */

import { APIKeyRotator } from '../api-key-rotator';
import { loadKeysFromEnv } from './openai-compatible-provider';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export class GeminiClient {
  private rotator: APIKeyRotator;
  readonly name = 'Gemini';

  constructor(apiKeys: string[]) {
    this.rotator = new APIKeyRotator(apiKeys, 'Gemini');
  }

  async translate(
    text: string,
    sourceLang: string,
    targetLang: string,
    model: string = 'gemini-2.0-flash'
  ): Promise<string> {
    const systemPrompt = `You are a professional translator. Translate the following text from ${sourceLang} to ${targetLang}. Maintain the original meaning, tone, and formatting. Only return the translated text without any explanations or additional content.`;

    return this.rotator.executeWithRotation(async (apiKey) => {
      const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 4000 },
        }),
      });

      if (!res.ok) {
        const err: any = new Error(`Gemini API error: ${res.status}`);
        err.status = res.status;
        try { err.message = (await res.json()).error?.message || err.message; } catch {}
        throw err;
      }

      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    });
  }

  getStats() { return this.rotator.getStats(); }
}

export function createGeminiClient(): GeminiClient | null {
  const keys = loadKeysFromEnv('GEMINI_API_KEY');
  if (keys.length === 0) return null;
  return new GeminiClient(keys);
}
