/**
 * OpenRouter Models API Route
 * Fetches and filters free models from OpenRouter
 */

import { NextResponse } from 'next/server';
import { createOpenRouterClient } from '@/lib/providers/openrouter';
import { modelsCache } from '@/lib/redis';

export const runtime = 'nodejs';
export const revalidate = 86400; // Cache for 24 hours

// Free model filters
const FREE_MODEL_FILTERS = [
  ':free',
  'qwen',
  'deepseek',
  'kimi',
  'glm',
  'phi',
  'gemma',
];

/**
 * Check if model should be included
 */
function shouldIncludeModel(modelId: string): boolean {
  const lowerCaseId = modelId.toLowerCase();
  return FREE_MODEL_FILTERS.some((filter) => lowerCaseId.includes(filter));
}

export async function GET() {
  try {
    // Check cache first
    const cachedModels = await modelsCache.getModels('openrouter');
    if (cachedModels && cachedModels.length > 0) {
      console.log(`Returning ${cachedModels.length} cached OpenRouter models`);
      return NextResponse.json({
        models: cachedModels,
        cached: true,
        count: cachedModels.length,
      });
    }

    // Fetch fresh models
    const client = createOpenRouterClient();
    if (!client) {
      return NextResponse.json(
        { error: 'OpenRouter not configured', models: [] },
        { status: 500 }
      );
    }

    console.log('Fetching models from OpenRouter...');
    const allModels = await client.fetchModels();

    // Filter for free models
    const freeModels = allModels.filter((model) =>
      shouldIncludeModel(model.id)
    );

    // Sort by name
    freeModels.sort((a, b) => {
      const nameA = a.name || a.id;
      const nameB = b.name || b.id;
      return nameA.localeCompare(nameB);
    });

    console.log(
      `Found ${freeModels.length} free models out of ${allModels.length} total`
    );

    // Cache the results
    await modelsCache.setModels('openrouter', freeModels);

    return NextResponse.json({
      models: freeModels,
      cached: false,
      count: freeModels.length,
      filters: FREE_MODEL_FILTERS,
    });
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);

    // Return fallback models
    const fallbackModels = [
      {
        id: 'openai/gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        context_length: 16385,
      },
      {
        id: 'meta-llama/llama-3-8b-instruct:free',
        name: 'Llama 3 8B (Free)',
        context_length: 8192,
      },
      {
        id: 'google/gemma-7b-it:free',
        name: 'Gemma 7B (Free)',
        context_length: 8192,
      },
    ];

    return NextResponse.json({
      models: fallbackModels,
      cached: false,
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
