/** Groq API translation provider — OpenAI-compatible */

import { buildSystemPrompt } from '../prompt-builder.ts';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/** Translate text using Groq API */
export async function translateWithGroq(
  text: string,
  from: string,
  to: string,
  apiKey: string
): Promise<string> {
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
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Groq API error ${res.status}: ${errBody}`);
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const translated = data.choices?.[0]?.message?.content?.trim();
  if (!translated) throw new Error('Groq returned empty response');
  return translated;
}
