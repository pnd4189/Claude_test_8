/** Direct Groq API provider — OpenAI-compatible, for users with their own API key */

import { buildSystemPrompt } from '../utils/prompt-builder';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TIMEOUT_MS = 30000;

export async function translateWithGroq(
  text: string,
  from: string,
  to: string,
  apiKey: string
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: buildSystemPrompt(from, to) },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);

    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const translated = data.choices?.[0]?.message?.content?.trim();
    if (!translated) throw new Error('Groq returned empty response');
    return translated;
  } finally {
    clearTimeout(timeout);
  }
}
