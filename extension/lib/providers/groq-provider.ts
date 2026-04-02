/** Direct Groq API provider — OpenAI-compatible, for users with their own API key */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

function buildSystemPrompt(from: string, to: string): string {
  const fromLabel = from === 'auto' ? 'the detected language' : from;
  return `You are a professional translator. Translate the following text from ${fromLabel} to ${to}. Output only the translation, nothing else.`;
}

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

  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const translated = data.choices?.[0]?.message?.content?.trim();
  if (!translated) throw new Error('Groq returned empty response');
  return translated;
}
