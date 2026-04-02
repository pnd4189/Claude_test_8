/** Cloudflare Worker — AI translation proxy with caching and rate limiting */

import { getCached, setCached } from './kv-cache.ts';
import { checkRateLimit } from './rate-limiter.ts';
import { translateWithGemini } from './providers/gemini.ts';
import { translateWithGlm } from './providers/glm.ts';
import { translateWithQwen } from './providers/qwen.ts';
import { translateWithGroq } from './providers/groq.ts';

interface Env {
  TRANSLATION_CACHE: KVNamespace;
  GEMINI_API_KEY: string;
  GLM_API_KEY: string;
  QWEN_API_KEY?: string;    // Primary provider
  GROQ_API_KEY?: string;    // Optional speed provider
  EXTENSION_SECRET?: string;
}

type ProxyProvider = 'qwen' | 'gemini' | 'glm' | 'groq';

interface TranslateBody {
  text: string;
  from: string;
  to: string;
  provider?: ProxyProvider;
}

interface BatchTranslateBody {
  texts: string[];
  from: string;
  to: string;
  provider?: ProxyProvider;
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

/** Build fallback order: requested provider first, then Qwen → Gemini → GLM */
function buildFallbackOrder(requested: ProxyProvider, env: Env): ProxyProvider[] {
  const available: ProxyProvider[] = [];
  if (env.QWEN_API_KEY) available.push('qwen');
  available.push('gemini');   // always available (required)
  available.push('glm');      // always available (required)
  if (env.GROQ_API_KEY) available.push('groq');

  // Put requested provider first if available
  const order = [requested, ...available.filter((p) => p !== requested)];
  return order.filter((p, i) => order.indexOf(p) === i); // deduplicate
}

async function callProvider(
  text: string,
  from: string,
  to: string,
  provider: ProxyProvider,
  env: Env
): Promise<string> {
  switch (provider) {
    case 'qwen':   return translateWithQwen(text, from, to, env.QWEN_API_KEY!);
    case 'gemini': return translateWithGemini(text, from, to, env.GEMINI_API_KEY);
    case 'glm':    return translateWithGlm(text, from, to, env.GLM_API_KEY);
    case 'groq':   return translateWithGroq(text, from, to, env.GROQ_API_KEY!);
  }
}

async function translateText(
  text: string,
  from: string,
  to: string,
  provider: ProxyProvider,
  env: Env
): Promise<{ translated: string; usedProvider: ProxyProvider }> {
  // Try cache first
  const cached = await getCached(env.TRANSLATION_CACHE, text, from, to);
  if (cached) return { translated: cached, usedProvider: provider };

  // Try providers in fallback order
  const fallbackOrder = buildFallbackOrder(provider, env);
  let lastError: Error | null = null;

  for (const p of fallbackOrder) {
    try {
      const translated = await callProvider(text, from, to, p, env);
      await setCached(env.TRANSLATION_CACHE, text, translated, from, to);
      return { translated, usedProvider: p };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error('All providers failed');
}

async function handleTranslate(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as TranslateBody;
  if (!body.text || !body.from || !body.to) {
    return errorResponse('Missing required fields: text, from, to', 400);
  }

  // Default to Qwen if available, else Gemini
  const defaultProvider: ProxyProvider = env.QWEN_API_KEY ? 'qwen' : 'gemini';
  const { translated, usedProvider } = await translateText(
    body.text, body.from, body.to, body.provider ?? defaultProvider, env
  );
  return json({ translatedText: translated, provider: usedProvider });
}

async function handleBatchTranslate(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as BatchTranslateBody;
  if (!body.texts?.length || !body.from || !body.to) {
    return errorResponse('Missing required fields: texts, from, to', 400);
  }
  if (body.texts.length > 50) {
    return errorResponse('Maximum 50 texts per batch', 400);
  }

  const defaultProvider: ProxyProvider = env.QWEN_API_KEY ? 'qwen' : 'gemini';
  const provider = body.provider ?? defaultProvider;
  const results = await Promise.all(
    body.texts.map((text) =>
      translateText(text, body.from, body.to, provider, env).then((r) => r.translated)
    )
  );

  return json({ translations: results, provider });
}

function handleProviders(env: Env): Response {
  return json({
    providers: [
      { id: 'qwen',   name: 'Qwen (Alibaba)',  available: !!env.QWEN_API_KEY },
      { id: 'gemini', name: 'Gemini',           available: !!env.GEMINI_API_KEY },
      { id: 'glm',    name: 'GLM (ChatGLM)',    available: !!env.GLM_API_KEY },
      { id: 'groq',   name: 'Groq',             available: !!env.GROQ_API_KEY },
    ],
  });
}
