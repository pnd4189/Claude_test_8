/** GLM (ChatGLM / Z.AI) translation provider — OpenAI-compatible */

import { buildSystemPrompt } from '../prompt-builder.ts';

const GLM_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions';

/** Translate text using GLM API */
export async function translateWithGlm(
  text: string,
  from: string,
  to: string,
  apiKey: string
): Promise<string> {
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
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`GLM API error ${res.status}: ${errBody}`);
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const translated = data.choices?.[0]?.message?.content?.trim();
  if (!translated) throw new Error('GLM returned empty response');
  return translated;
}
