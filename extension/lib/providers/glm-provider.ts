/** Direct GLM (Z.AI) API provider — OpenAI-compatible, for users with their own API key */

import { buildSystemPrompt } from '../utils/prompt-builder';

const GLM_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const TIMEOUT_MS = 30000;

export async function translateWithGlm(
  text: string,
  from: string,
  to: string,
  apiKey: string
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(GLM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [
          { role: 'system', content: buildSystemPrompt(from, to) },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`GLM ${res.status}: ${await res.text()}`);

    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const translated = data.choices?.[0]?.message?.content?.trim();
    if (!translated) throw new Error('GLM returned empty response');
    return translated;
  } finally {
    clearTimeout(timeout);
  }
}
