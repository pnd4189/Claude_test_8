/**
 * Providers API Route
 * Returns list of available AI providers and their models
 */

import { NextResponse } from 'next/server';
import { createOpenRouterClient } from '@/lib/providers/openrouter';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const providers = [];

    // OpenRouter
    const openRouterClient = createOpenRouterClient();
    if (openRouterClient) {
      providers.push({
        id: 'openrouter',
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        models: [], // Will be fetched separately
        available: true,
      });
    }

    // Gemini
    if (process.env.GEMINI_API_KEY_1) {
      providers.push({
        id: 'gemini',
        name: 'Google Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com',
        models: [
          {
            id: 'gemini-2.0-flash-exp',
            name: 'Gemini 2.0 Flash (Experimental)',
            description: 'Latest Gemini model with fast performance',
            context_length: 1000000,
          },
        ],
        available: true,
      });
    }

    // Mistral
    if (process.env.MISTRAL_API_KEY_1) {
      providers.push({
        id: 'mistral',
        name: 'Mistral AI',
        baseUrl: 'https://api.mistral.ai',
        models: [
          {
            id: 'mistral-small-latest',
            name: 'Mistral Small',
            description: 'Cost-effective model for simple tasks',
            context_length: 32000,
          },
        ],
        available: true,
      });
    }

    // Groq
    if (process.env.GROQ_API_KEY_1) {
      providers.push({
        id: 'groq',
        name: 'Groq',
        baseUrl: 'https://api.groq.com',
        models: [
          {
            id: 'llama3-70b-8192',
            name: 'Llama 3 70B',
            description: 'Meta Llama 3 70B model',
            context_length: 8192,
          },
          {
            id: 'mixtral-8x7b-32768',
            name: 'Mixtral 8x7B',
            description: 'Mistral Mixtral 8x7B model',
            context_length: 32768,
          },
        ],
        available: true,
      });
    }

    return NextResponse.json({
      providers,
      count: providers.length,
    });
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch providers',
        providers: [],
      },
      { status: 500 }
    );
  }
}
