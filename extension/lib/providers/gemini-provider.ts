/** Direct Gemini API provider — for users with their own API key */

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const TIMEOUT_MS = 30000;

function buildPrompt(text: string, from: string, to: string): string {
  const fromLabel = from === 'auto' ? 'the detected language' : from;
  return `You are a professional translator. Translate the following text from ${fromLabel} to ${to}. Output only the translation, nothing else.\n\n${text}`;
}

export async function translateWithGemini(
  text: string,
  from: string,
  to: string,
  apiKey: string
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(text, from, to) }] }],
        generationConfig: { temperature: 0.3 },
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);

    const data = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!translated) throw new Error('Gemini returned empty response');
    return translated;
  } finally {
    clearTimeout(timeout);
  }
}
