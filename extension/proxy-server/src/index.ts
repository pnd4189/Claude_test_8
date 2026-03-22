/** Cloudflare Worker — AI translation proxy with caching and rate limiting */

import { getCached, setCached } from './kv-cache.ts';
import { checkRateLimit } from './rate-limiter.ts';
import { translateWithGemini } from './providers/gemini.ts';
import { translateWithGlm } from './providers/glm.ts';

interface Env {
  TRANSLATION_CACHE: KVNamespace;
  GEMINI_API_KEY: string;
  GLM_API_KEY: string;
  EXTENSION_SECRET?: string;
}

interface TranslateBody {
  text: string;
  from: string;
  to: string;
  provider?: 'gemini' | 'glm';
}

interface BatchTranslateBody {
  texts: string[];
  from: string;
  to: string;
  provider?: 'gemini' | 'glm';
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Extension-Key',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function errorResponse(message: string, status: number): Response {
  return json({ error: message }, status);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';

    // Auth check
    if (env.EXTENSION_SECRET) {
      const key = request.headers.get('X-Extension-Key');
      if (key !== env.EXTENSION_SECRET) {
        return errorResponse('Unauthorized', 401);
      }
    }

    // Rate limit
    const retryAfter = checkRateLimit(ip);
    if (retryAfter > 0) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...CORS_HEADERS, 'Retry-After': String(retryAfter), 'Content-Type': 'application/json' },
      });
    }

    // Routing
    try {
      if (url.pathname === '/api/translate' && request.method === 'POST') {
        return await handleTranslate(request, env);
      }
      if (url.pathname === '/api/translate/batch' && request.method === 'POST') {
        return await handleBatchTranslate(request, env);
      }
      if (url.pathname === '/api/providers' && request.method === 'GET') {
        return handleProviders(env);
      }
      return errorResponse('Not found', 404);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal error';
      return errorResponse(message, 500);
    }
  },
} satisfies ExportedHandler<Env>;

async function translateText(
  text: string,
  from: string,
  to: string,
  provider: 'gemini' | 'glm',
  env: Env
): Promise<string> {
  // Try cache first
  const cached = await getCached(env.TRANSLATION_CACHE, text, from, to);
  if (cached) return cached;

  // Translate with selected provider, fallback to the other
  let translated: string;
  try {
    translated = provider === 'gemini'
      ? await translateWithGemini(text, from, to, env.GEMINI_API_KEY)
      : await translateWithGlm(text, from, to, env.GLM_API_KEY);
  } catch {
    // Fallback to other provider
    translated = provider === 'gemini'
      ? await translateWithGlm(text, from, to, env.GLM_API_KEY)
      : await translateWithGemini(text, from, to, env.GEMINI_API_KEY);
  }

  // Cache result
  await setCached(env.TRANSLATION_CACHE, text, translated, from, to);
  return translated;
}

async function handleTranslate(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as TranslateBody;
  if (!body.text || !body.from || !body.to) {
    return errorResponse('Missing required fields: text, from, to', 400);
  }

  const translated = await translateText(body.text, body.from, body.to, body.provider ?? 'gemini', env);
  return json({ translatedText: translated, provider: body.provider ?? 'gemini' });
}

async function handleBatchTranslate(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as BatchTranslateBody;
  if (!body.texts?.length || !body.from || !body.to) {
    return errorResponse('Missing required fields: texts, from, to', 400);
  }
  if (body.texts.length > 50) {
    return errorResponse('Maximum 50 texts per batch', 400);
  }

  const provider = body.provider ?? 'gemini';
  const results = await Promise.all(
    body.texts.map((text) => translateText(text, body.from, body.to, provider, env))
  );

  return json({ translations: results, provider });
}

function handleProviders(env: Env): Response {
  return json({
    providers: [
      { id: 'gemini', name: 'Gemini', available: !!env.GEMINI_API_KEY },
      { id: 'glm', name: 'GLM (ChatGLM)', available: !!env.GLM_API_KEY },
    ],
  });
}
