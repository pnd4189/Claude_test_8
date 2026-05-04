/**
 * Cron Job: Refresh Models
 * Runs daily at 2am UTC to refresh model list
 */

import { NextRequest, NextResponse } from 'next/server';
import { createOpenRouterClient } from '@/lib/providers/openrouter';
import { shouldIncludeModel } from '@/lib/model-filters';
import { modelsCache } from '@/lib/redis';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Unauthorized cron job attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting model refresh cron job...');

    // Fetch fresh models from OpenRouter
    const client = createOpenRouterClient();
    if (!client) {
      return NextResponse.json(
        { error: 'OpenRouter not configured' },
        { status: 500 }
      );
    }

    const allModels = await client.fetchModels();
    const freeModels = allModels.filter((model) =>
      shouldIncludeModel(model.id)
    );

    // Sort by name
    freeModels.sort((a, b) => {
      const nameA = a.name || a.id;
      const nameB = b.name || b.id;
      return nameA.localeCompare(nameB);
    });

    // Update cache
    await modelsCache.refreshModels('openrouter', freeModels);

    console.log(
      `✓ Model refresh complete: ${freeModels.length} models cached`
    );

    return NextResponse.json({
      success: true,
      modelsCount: freeModels.length,
      totalModels: allModels.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also allow POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
