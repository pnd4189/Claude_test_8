/**
 * Translation API Route
 *
 * Main endpoint for text translation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/providers/provider-factory';
import { translationCache, ratelimit } from '@/lib/redis';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large translations

interface TranslateRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
  provider?: string;
  model?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'anonymous';
    const { success, limit, remaining, reset } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          },
        }
      );
    }

    // Parse request body
    const body: TranslateRequest = await request.json();
    const {
      text,
      sourceLang,
      targetLang,
      provider = 'openrouter',
      model = 'openai/gpt-3.5-turbo',
    } = body;

    // Validate input
    if (!text || !sourceLang || !targetLang) {
      return NextResponse.json(
        { error: 'Missing required fields: text, sourceLang, targetLang' },
        { status: 400 }
      );
    }

    if (text.length > 50000) {
      return NextResponse.json(
        { error: 'Text too long. Maximum 50,000 characters.' },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = await translationCache.get(
      text,
      sourceLang,
      targetLang,
      provider
    );

    if (cached) {
      logger.info('translate', 'Cache hit for translation');
      return NextResponse.json({
        translatedText: cached,
        provider,
        model,
        cached: true,
      });
    }

    // Translate based on provider
    const client = getProvider(provider);
    if (!client) {
      return NextResponse.json(
        { error: `Provider "${provider}" not configured.` },
        { status: 400 }
      );
    }

    const translatedText = await client.translate(text, sourceLang, targetLang, model);

    // Cache the result
    await translationCache.set(
      text,
      sourceLang,
      targetLang,
      provider,
      translatedText
    );

    return NextResponse.json({
      translatedText,
      provider,
      model,
      cached: false,
    });
  } catch (error: unknown) {
    logger.error('translate', 'Translation error', error);

    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes('quota') || errMsg.includes('exhausted')) {
      return NextResponse.json(
        {
          error: 'All API quotas exhausted. Please try again later.',
          code: 'QUOTA_EXHAUSTED',
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: 'Translation failed. Please try again.',
        code: 'TRANSLATION_ERROR',
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'translation-api',
    version: '1.0.0',
  });
}
