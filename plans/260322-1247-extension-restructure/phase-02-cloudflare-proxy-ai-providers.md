# Phase 2: Cloudflare Worker Proxy & AI Providers

## Context
- [Brainstorm Report](../reports/brainstorm-260322-1247-ai-translation-extension-restructure.md)

## Overview
- **Priority:** Critical
- **Status:** pending
- **Effort:** 1-2 days
- **Blocked by:** Nothing (parallel with Phase 1)

## Key Insights
- Cloudflare Worker hides API keys from extension, free 100K req/day
- Gemini API has generous free tier (60 RPM, 1M tokens/day)
- GLM API at `https://api.z.ai/api/coding/paas/v4` is OpenAI-compatible
- Strategy pattern for provider abstraction enables easy future additions

## Requirements

### Functional
- Cloudflare Worker with translation proxy endpoints
- Gemini provider implementation
- GLM provider implementation
- Provider registry with fallback chain (Gemini → GLM)
- Translation caching via Cloudflare KV
- Rate limiting per client
- Extension-side proxy client

### Non-Functional
- API response < 3s for single paragraph
- Batch translate up to 50 texts per request
- Cache TTL: 30 days in KV

## Architecture

```
Extension                    Cloudflare Worker                AI APIs
────────                    ─────────────────                ────────
proxy-client.ts ──POST──→  /api/translate      ──→  Gemini API
                            /api/translate/batch ──→  GLM API (z.ai)
                            /api/providers       ──→  (future providers)
                                 │
                            Cloudflare KV (cache)
                            Rate Limiter
```

## Related Code Files

### Create (Extension side)
- `lib/providers/types.ts` — Provider interfaces (shared with Phase 1)
- `lib/providers/proxy-client.ts` — HTTP client for Cloudflare Worker
- `lib/providers/gemini-provider.ts` — Direct Gemini API (fallback if no proxy)
- `lib/providers/glm-provider.ts` — Direct GLM API (fallback if no proxy)
- `lib/providers/provider-registry.ts` — Provider management + fallback chain

### Create (Proxy server)
- `proxy-server/package.json`
- `proxy-server/wrangler.toml`
- `proxy-server/src/index.ts` — Worker entry, routing
- `proxy-server/src/providers/gemini.ts` — Gemini API handler
- `proxy-server/src/providers/glm.ts` — GLM API handler
- `proxy-server/src/cache.ts` — KV cache layer
- `proxy-server/src/rate-limiter.ts` — IP-based rate limiting
- `proxy-server/tsconfig.json`

## Implementation Steps

### Cloudflare Worker

1. **Initialize Cloudflare Worker project**
   ```bash
   cd proxy-server
   npm init -y
   npm install -D wrangler typescript @cloudflare/workers-types
   ```

2. **Configure wrangler.toml**
   ```toml
   name = "ai-translation-proxy"
   main = "src/index.ts"
   compatibility_date = "2026-03-01"

   [[kv_namespaces]]
   binding = "TRANSLATION_CACHE"
   id = "xxx"

   [vars]
   GEMINI_API_KEY = ""
   GLM_API_KEY = ""
   ```

3. **Implement Worker routes** (`src/index.ts`)
   - `POST /api/translate` — Single text translation
   - `POST /api/translate/batch` — Batch translation (array of texts)
   - `GET /api/providers` — List available providers + status
   - CORS headers for extension origin
   - Auth: simple shared secret header (`X-Extension-Key`)

4. **Implement Gemini provider** (`src/providers/gemini.ts`)
   - Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
   - System prompt: "You are a professional translator. Translate the following text from {from} to {to}. Output only the translation, nothing else."
   - Temperature: 0.3 for consistency
   - Handle rate limit errors (429) with exponential backoff

5. **Implement GLM provider** (`src/providers/glm.ts`)
   - Endpoint: `https://api.z.ai/api/coding/paas/v4/chat/completions`
   - OpenAI-compatible format: `{ model, messages, temperature }`
   - Same translation prompt as Gemini

6. **Implement KV cache** (`src/cache.ts`)
   - Key format: `t:{from}:{to}:{sha256(text)}`
   - TTL: 30 days (2592000 seconds)
   - Methods: `getCached()`, `setCached()`

7. **Implement rate limiter** (`src/rate-limiter.ts`)
   - 60 requests/minute per IP
   - Return 429 with retry-after header

### Extension Provider Layer

8. **Define provider interface** (`lib/providers/types.ts`)
   ```typescript
   interface TranslationProvider {
     id: string;
     name: string;
     translate(text: string, from: string, to: string): Promise<string>;
     batchTranslate(texts: string[], from: string, to: string): Promise<string[]>;
     isAvailable(): Promise<boolean>;
   }
   ```

9. **Implement proxy client** (`lib/providers/proxy-client.ts`)
   - HTTP client for Cloudflare Worker endpoints
   - Handles errors, retries, timeouts
   - Falls back to direct API calls if proxy unavailable

10. **Implement direct providers** (Gemini + GLM)
    - For users who prefer to use their own API keys
    - Same interface as proxy, but direct API calls from extension

11. **Implement provider registry** (`lib/providers/provider-registry.ts`)
    - `getProvider(id)` — Get specific provider
    - `translate(text, from, to)` — Auto-select provider with fallback
    - `batchTranslate(texts, from, to)` — Batch with fallback
    - Fallback chain: proxy → Gemini direct → GLM direct

## Todo List

- [ ] Initialize Cloudflare Worker project
- [ ] Configure wrangler.toml with KV namespace
- [ ] Implement Worker routing + CORS
- [ ] Implement Gemini provider (server side)
- [ ] Implement GLM provider (server side)
- [ ] Implement KV cache layer
- [ ] Implement rate limiter
- [ ] Define TranslationProvider interface
- [ ] Implement proxy client (extension side)
- [ ] Implement direct Gemini provider (extension side)
- [ ] Implement direct GLM provider (extension side)
- [ ] Implement provider registry with fallback
- [ ] Test proxy locally with `wrangler dev`
- [ ] Deploy proxy to Cloudflare

## Success Criteria
- Proxy translates text via Gemini and GLM
- KV cache returns cached translations
- Rate limiter blocks excessive requests
- Extension proxy client communicates with worker
- Fallback chain works (proxy → direct)
- Batch translate handles 50 texts

## Risk Assessment
- Cloudflare KV cold start latency (~50ms) — acceptable for translation
- Gemini free tier 15-60 RPM — batch translations to reduce calls
- GLM API availability — fallback to Gemini if down

## Next Steps
→ All feature phases (3-6) depend on this completing
