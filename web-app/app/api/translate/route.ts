/**
 * Translation API Route
 *
 * Main endpoint for text translation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createOpenRouterClient } from '@/lib/providers/openrouter';
import { translationCache, ratelimit } from '@/lib/redis';

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
    const ip = request.ip ?? 'anonymous';
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
      console.log('Cache hit for translation');
      return NextResponse.json({
        translatedText: cached,
        provider,
        model,
        cached: true,
      });
    }

    // Translate based on provider
    let translatedText: string;

    switch (provider) {
      case 'openrouter': {
        const client = createOpenRouterClient();
        if (!client) {
          return NextResponse.json(
            { error: 'OpenRouter not configured' },
            { status: 500 }
          );
        }

        translatedText = await client.translate(
          text,
          sourceLang,
          targetLang,
          model
        );
        break;
      }

      // TODO: Add other providers (Gemini, Mistral, Groq)
      default:
        return NextResponse.json(
          { error: `Unsupported provider: ${provider}` },
          { status: 400 }
        );
    }

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
  } catch (error: any) {
    console.error('Translation error:', error);

    // Check if it's a quota error
    if (
      error.message?.includes('quota') ||
      error.message?.includes('exhausted')
    ) {
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
        error: error.message || 'Translation failed',
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
