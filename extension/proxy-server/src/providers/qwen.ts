/** Qwen (Alibaba Cloud DashScope) translation provider — OpenAI-compatible */

import { buildSystemPrompt } from '../prompt-builder.ts';

const QWEN_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';

/** Translate text using Qwen API */
export async function translateWithQwen(
  text: string,
  from: string,
  to: string,
  apiKey: string
): Promise<string> {
  const res = await fetch(QWEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'qwen-turbo-latest',
      messages: [
        { role: 'system', content: buildSystemPrompt(from, to) },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Qwen API error ${res.status}: ${errBody}`);
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const translated = data.choices?.[0]?.message?.content?.trim();
  if (!translated) throw new Error('Qwen returned empty response');
  return translated;
}
