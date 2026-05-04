/** FreeLLMAPI provider — OpenAI-compatible proxy aggregating 11 free-tier providers */

import { buildSystemPrompt } from '../utils/prompt-builder';

const TIMEOUT_MS = 3000; // Fast fail when miniPC offline

export async function translateWithFreeLLMAPI(
  text: string,
  from: string,
  to: string,
  baseUrl: string,
  apiKey: string
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = baseUrl.replace(/\/+$/, '');
    const res = await fetch(`${url}/v1/chat/completions`, {
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
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`FreeLLMAPI ${res.status}: ${await res.text()}`);

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
