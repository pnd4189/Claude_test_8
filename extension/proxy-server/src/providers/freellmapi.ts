/** FreeLLMAPI provider — OpenAI-compatible proxy aggregating 11 free-tier providers */

import { buildSystemPrompt } from '../prompt-builder.ts';

/** Translate text using FreeLLMAPI proxy */
export async function translateWithFreeLLMAPI(
  text: string,
  from: string,
  to: string,
  url: string,
  apiKey: string
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const normalizedUrl = url.replace(/\/+$/, '');
    const res = await fetch(`${normalizedUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'auto',
        messages: [
          { role: 'system', content: buildSystemPrompt(from, to) },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`FreeLLMAPI error ${res.status}: ${errBody}`);
    }

    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const translated = data.choices?.[0]?.message?.content?.trim();
    if (!translated) throw new Error('FreeLLMAPI returned empty response');
    return translated;
  } finally {
    clearTimeout(timeout);
  }
}
