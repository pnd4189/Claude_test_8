/** Groq provider — uses OpenAI-compatible format */

import { OpenAICompatibleProvider, loadKeysFromEnv } from './openai-compatible-provider';

export function createGroqClient(): OpenAICompatibleProvider | null {
  const keys = loadKeysFromEnv('GROQ_API_KEY');
  if (keys.length === 0) return null;

  return new OpenAICompatibleProvider({
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    envPrefix: 'GROQ_API_KEY',
  }, keys);
}
