/** Gemini API translation provider */

import { buildInlinePrompt } from '../prompt-builder.ts';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/** Translate text using Gemini API */
export async function translateWithGemini(
  text: string,
  from: string,
  to: string,
  apiKey: string
): Promise<string> {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildInlinePrompt(text, from, to) }] }],
      generationConfig: { temperature: 0.3 },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errBody}`);
  }

  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!translated) throw new Error('Gemini returned empty response');
  return translated;
}
