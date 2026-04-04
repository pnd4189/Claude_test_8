/**
 * Providers API Route
 * Returns list of available AI providers and their models
 */

import { NextResponse } from 'next/server';
import { getProvider } from '@/lib/providers/provider-factory';

export const runtime = 'nodejs';

/** Provider definitions with default models */
const PROVIDER_DEFS = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    models: [{ id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo', context_length: 16384 }],
  },
  {
    id: 'qwen',
    name: 'Qwen (AlibabaCloud)',
    models: [
      { id: 'qwen-mt-flash', name: 'Qwen MT Flash', description: 'Translation-optimized, 92 languages', context_length: 8192 },
      { id: 'qwen-turbo-latest', name: 'Qwen Turbo', description: 'General-purpose, fast', context_length: 131072 },
    ],
  },
  {
    id: 'groq',
    name: 'Groq',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'High quality translation', context_length: 32768 },
    ],
  },
  {
    id: 'glm',
    name: 'GLM (ChatGLM)',
    models: [
      { id: 'glm-4-flash', name: 'GLM-4 Flash', description: 'Fast, free tier available', context_length: 128000 },
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Fast, 1M context', context_length: 1000000 },
    ],
  },
] as const;

export async function GET() {
  try {
    const providers = PROVIDER_DEFS
      .map((def) => ({
        ...def,
        available: getProvider(def.id) !== null,
      }));

    return NextResponse.json({ providers, count: providers.length });
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch providers', providers: [] },
      { status: 500 }
    );
  }
}
