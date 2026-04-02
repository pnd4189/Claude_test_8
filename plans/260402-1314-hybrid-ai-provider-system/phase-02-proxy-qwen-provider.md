# Phase 2: Qwen Proxy Server Provider

## Overview
- **Priority:** Critical
- **Status:** complete
- **Completed:** 2026-04-02
- **Effort:** ~1 hour
- **Description:** Add Qwen as PRIMARY provider on Cloudflare Worker proxy. Update fallback chain: Qwen → Gemini → GLM. Add Groq as optional provider.

## Context Links
- Proxy main handler: `extension/proxy-server/src/index.ts`
- Proxy Gemini: `extension/proxy-server/src/providers/gemini.ts`
- Proxy GLM: `extension/proxy-server/src/providers/glm.ts`
- Wrangler config: `extension/proxy-server/wrangler.toml`

## Key Insights

- Qwen DashScope International uses OpenAI-compatible format (same as GLM)
- Qwen-Flash: $0.05/1M input, $0.20/1M output — cheapest with best Vietnamese quality
- Qwen becomes PRIMARY provider, Gemini becomes backup, GLM emergency
- Groq also added as optional (for users who want speed)
- All new env secrets: `QWEN_API_KEY`, optionally `GROQ_API_KEY`

## Related Code Files

### Files to Modify
1. `extension/proxy-server/src/index.ts` — Add qwen/groq to types, update translateText fallback, update handleProviders
2. `extension/proxy-server/wrangler.toml` — Document new secrets

### Files to Create
1. `extension/proxy-server/src/providers/qwen.ts` — Qwen API client
2. `extension/proxy-server/src/providers/groq.ts` — Groq API client

## Implementation Steps

### Step 1: Create `qwen.ts` provider

```typescript
/** Qwen (Alibaba Cloud DashScope) translation provider — OpenAI-compatible */

const QWEN_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';

// Same OpenAI-compatible pattern as GLM
// Model: 'qwen-turbo-latest'
// Auth: Bearer token
```

### Step 2: Create `groq.ts` provider

```typescript
/** Groq API translation provider — OpenAI-compatible */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Same pattern as GLM/Qwen
// Model: 'llama-3.3-70b-versatile'
// Auth: Bearer token
```

### Step 3: Update `index.ts`

Key changes:

**a) Update Env interface:**
```typescript
interface Env {
  TRANSLATION_CACHE: KVNamespace;
  GEMINI_API_KEY: string;
  GLM_API_KEY: string;
  QWEN_API_KEY?: string;    // NEW — primary provider
  GROQ_API_KEY?: string;    // NEW — optional speed provider
  EXTENSION_SECRET?: string;
}
```

**b) Update provider type:**
```typescript
type ProxyProvider = 'qwen' | 'gemini' | 'glm' | 'groq';
```

**c) Update `translateText()` fallback chain:**
```typescript
// New fallback: Qwen → Gemini → GLM (or selected → others)
async function translateText(text, from, to, provider, env) {
  const cached = await getCached(...);
  if (cached) return cached;

  const fallbackOrder = buildFallbackOrder(provider, env);
  let lastError: Error | null = null;

  for (const p of fallbackOrder) {
    try {
      const translated = await callProvider(text, from, to, p, env);
      await setCached(...);
      return translated;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error('All providers failed');
}
```

**d) Update `handleProviders()`:**
```typescript
function handleProviders(env: Env): Response {
  return json({
    providers: [
      { id: 'qwen', name: 'Qwen (Alibaba)', available: !!env.QWEN_API_KEY },
      { id: 'gemini', name: 'Gemini', available: !!env.GEMINI_API_KEY },
      { id: 'glm', name: 'GLM (ChatGLM)', available: !!env.GLM_API_KEY },
      { id: 'groq', name: 'Groq', available: !!env.GROQ_API_KEY },
    ],
  });
}
```

### Step 4: Update `wrangler.toml` comments

Add documentation for new secrets:
```toml
# Secrets (configure via: wrangler secret put <NAME>)
# GEMINI_API_KEY    — Google Gemini API key
# GLM_API_KEY       — ZhipuAI GLM API key
# QWEN_API_KEY      — Alibaba Cloud DashScope API key (PRIMARY)
# GROQ_API_KEY      — Groq API key (optional, for speed)
# EXTENSION_SECRET  — Optional auth for extension requests
```

## Todo List

- [x] Create `extension/proxy-server/src/providers/qwen.ts` (~40 LOC)
- [x] Create `extension/proxy-server/src/providers/groq.ts` (~40 LOC)
- [x] Update `index.ts` — Env, types, fallback chain, handleProviders
- [x] Update `wrangler.toml` — Document new secrets
- [x] Verify `npm run build` passes in proxy-server

## Success Criteria

- Qwen is default/primary provider when `QWEN_API_KEY` is set
- Fallback chain: selected → Qwen → Gemini → GLM (skips unavailable)
- `/api/providers` lists all 4 providers with availability
- No build errors
- Backward compatible: existing Gemini/GLM-only setup still works
