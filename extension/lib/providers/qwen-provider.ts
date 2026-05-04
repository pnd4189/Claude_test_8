/** Direct Qwen (Alibaba Cloud DashScope) API provider — OpenAI-compatible */

import { buildSystemPrompt } from '../utils/prompt-builder';

const QWEN_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
const TIMEOUT_MS = 30000;

export async function translateWithQwen(
  text: string,
  from: string,
  to: string,
  apiKey: string
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
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
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Qwen ${res.status}: ${await res.text()}`);

    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const translated = data.choices?.[0]?.message?.content?.trim();
    if (!translated) throw new Error('Qwen returned empty response');
    return translated;
  } finally {
    clearTimeout(timeout);
  }
}
