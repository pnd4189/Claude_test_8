/** Cloudflare Worker — AI translation proxy with caching and rate limiting */

import { getCached, setCached } from './kv-cache.ts';
import { checkRateLimit } from './rate-limiter.ts';
import { translateWithGemini } from './providers/gemini.ts';
import { translateWithGlm } from './providers/glm.ts';
import { translateWithQwen } from './providers/qwen.ts';
import { translateWithGroq } from './providers/groq.ts';
import { translateWithFreeLLMAPI } from './providers/freellmapi.ts';

type ProxyProvider = 'freellmapi' | 'qwen' | 'gemini' | 'glm' | 'groq';

const ALLOWED_LANGS = new Set(['en','vi','zh','ja','ko','fr','de','es','pt','ru','th','auto']);
const VALID_PROVIDERS = new Set<ProxyProvider>(['freellmapi','qwen','gemini','glm','groq']);
const ALLOWED_ORIGINS = [
  /^https:\/\/[a-z0-9-]+\.chromiumapp\.org$/,
  /^chrome-extension:\/\/[a-z0-9-]+$/,
];

interface Env {
  TRANSLATION_CACHE: KVNamespace;
  GEMINI_API_KEY: string;
  GLM_API_KEY: string;
  QWEN_API_KEY?: string;
  GROQ_API_KEY?: string;
  FREELLMAPI_URL?: string;
  FREELLMAPI_KEY?: string;
  EXTENSION_SECRET: string;
}

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

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = ALLOWED_ORIGINS.some((pat) => pat.test(origin));
  return {
    'Access-Control-Allow-Origin': allowed ? origin : '',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Extension-Key',
    Vary: 'Origin',
  };
}

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function errorResponse(message: string, status: number, corsHeaders: Record<string, string>): Response {
  return json({ error: message }, status, corsHeaders);
}

function validateLang(code: string): boolean {
  return ALLOWED_LANGS.has(code);
}

function validateProvider(p: string | undefined): p is ProxyProvider {
  return p == null || VALID_PROVIDERS.has(p as ProxyProvider);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = getCorsHeaders(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';

    if (!env.EXTENSION_SECRET) {
      console.error('EXTENSION_SECRET is not configured');
      return errorResponse('Server misconfiguration', 500, corsHeaders);
    }

    const key = request.headers.get('X-Extension-Key');
    if (key !== env.EXTENSION_SECRET) {
      return errorResponse('Unauthorized', 401, corsHeaders);
    }

    const retryAfter = checkRateLimit(ip);
    if (retryAfter > 0) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Retry-After': String(retryAfter), 'Content-Type': 'application/json' },
      });
    }

    try {
      if (url.pathname === '/api/translate' && request.method === 'POST') {
        return await handleTranslate(request, env, corsHeaders);
      }
      if (url.pathname === '/api/translate/batch' && request.method === 'POST') {
        return await handleBatchTranslate(request, env, corsHeaders);
      }
      if (url.pathname === '/api/providers' && request.method === 'GET') {
        return handleProviders(env, corsHeaders);
      }
      return errorResponse('Not found', 404, corsHeaders);
    } catch (err) {
      console.error('Unhandled proxy error:', err);
      return errorResponse('Internal server error', 500, corsHeaders);
    }
  },
} satisfies ExportedHandler<Env>;

/** Build fallback order: requested provider first (if configured), then others */
function buildFallbackOrder(requested: ProxyProvider, env: Env): ProxyProvider[] {
  const available: ProxyProvider[] = [];
  if (env.FREELLMAPI_URL && env.FREELLMAPI_KEY) available.push('freellmapi');
  if (env.QWEN_API_KEY) available.push('qwen');
  available.push('gemini');   // always available (required)
  available.push('glm');      // always available (required)
  if (env.GROQ_API_KEY) available.push('groq');

  // Put requested provider first only if configured, otherwise use available order
  if (available.includes(requested)) {
    const order = [requested, ...available.filter((p) => p !== requested)];
    return order;
  }
  return available;
}

async function callProvider(
  text: string,
  from: string,
  to: string,
  provider: ProxyProvider,
  env: Env
): Promise<string> {
  switch (provider) {
    case 'freellmapi': return translateWithFreeLLMAPI(text, from, to, env.FREELLMAPI_URL!, env.FREELLMAPI_KEY!);
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

async function parseBody<T>(request: Request, corsHeaders: Record<string, string>): Promise<T | null> {
  try {
    return await request.json() as T;
  } catch {
    return null;
  }
}

async function handleTranslate(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const body = await parseBody<TranslateBody>(request, corsHeaders);
  if (!body) return errorResponse('Invalid JSON body', 400, corsHeaders);
  if (!body.text || !body.from || !body.to) {
    return errorResponse('Missing required fields: text, from, to', 400, corsHeaders);
  }
  if (!validateLang(body.from) || !validateLang(body.to)) {
    return errorResponse('Unsupported language code', 400, corsHeaders);
  }
  if (body.text.length > 50000) {
    return errorResponse('Text too long (max 50,000 characters)', 400, corsHeaders);
  }
  if (!validateProvider(body.provider)) {
    return errorResponse('Invalid provider', 400, corsHeaders);
  }

  const defaultProvider: ProxyProvider = env.QWEN_API_KEY ? 'qwen' : 'gemini';
  try {
    const { translated, usedProvider } = await translateText(
      body.text, body.from, body.to, body.provider ?? defaultProvider, env
    );
    return json({ translatedText: translated, provider: usedProvider }, 200, corsHeaders);
  } catch (err) {
    console.error('Translation error:', err);
    return errorResponse('Translation failed', 500, corsHeaders);
  }
}

async function handleBatchTranslate(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const body = await parseBody<BatchTranslateBody>(request, corsHeaders);
  if (!body) return errorResponse('Invalid JSON body', 400, corsHeaders);
  if (!body.texts?.length || !body.from || !body.to) {
    return errorResponse('Missing required fields: texts, from, to', 400, corsHeaders);
  }
  if (!validateLang(body.from) || !validateLang(body.to)) {
    return errorResponse('Unsupported language code', 400, corsHeaders);
  }
  if (body.texts.length > 50) {
    return errorResponse('Maximum 50 texts per batch', 400, corsHeaders);
  }
  for (const t of body.texts) {
    if (t.length > 10000) {
      return errorResponse('Each text in batch must be under 10,000 characters', 400, corsHeaders);
    }
  }
  if (!validateProvider(body.provider)) {
    return errorResponse('Invalid provider', 400, corsHeaders);
  }

  const defaultProvider: ProxyProvider = env.QWEN_API_KEY ? 'qwen' : 'gemini';
  const provider = body.provider ?? defaultProvider;
  try {
    const results = await Promise.all(
      body.texts.map((text) =>
        translateText(text, body.from, body.to, provider, env).then((r) => r.translated)
      )
    );
    return json({ translations: results, provider }, 200, corsHeaders);
  } catch (err) {
    console.error('Batch translation error:', err);
    return errorResponse('Translation failed', 500, corsHeaders);
  }
}

function handleProviders(env: Env, corsHeaders: Record<string, string>): Response {
  return json({
    providers: [
      { id: 'freellmapi', name: 'FreeLLMAPI (11 providers)', available: !!(env.FREELLMAPI_URL && env.FREELLMAPI_KEY) },
      { id: 'qwen',   name: 'Qwen (Alibaba)',  available: !!env.QWEN_API_KEY },
      { id: 'gemini', name: 'Gemini',           available: !!env.GEMINI_API_KEY },
      { id: 'glm',    name: 'GLM (ChatGLM)',    available: !!env.GLM_API_KEY },
      { id: 'groq',   name: 'Groq',             available: !!env.GROQ_API_KEY },
    ],
  }, 200, corsHeaders);
}
