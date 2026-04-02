# Phase 1: Groq + Qwen Extension Providers

## Overview
- **Priority:** Critical
- **Status:** complete
- **Completed:** 2026-04-02
- **Effort:** ~2 hours
- **Description:** Add Groq and Qwen as BYOK providers in the extension. Update types, create provider files, update registry fallback chain.

## Context Links
- Brainstorm: `plans/reports/brainstorm-260402-1113-chrome-extension-ai-provider-strategy.md`
- Research: `plans/reports/researcher-260402-1113-ai-api-free-tier-analysis.md`
- Existing Gemini provider: `extension/lib/providers/gemini-provider.ts`
- Existing GLM provider: `extension/lib/providers/glm-provider.ts`
- Provider types: `extension/lib/providers/types.ts`
- Provider registry: `extension/lib/providers/provider-registry.ts`

## Key Insights

- Groq API uses OpenAI-compatible format (identical to GLM pattern)
- Qwen (DashScope International) also uses OpenAI-compatible format
- Both need `Authorization: Bearer {apiKey}` header
- Groq model: `llama-3.3-70b-versatile` (quality) or `llama-3.1-8b-instant` (speed/volume)
- Qwen model: `qwen-turbo-latest` (cheapest, good quality for translation)

## Related Code Files

### Files to Modify
1. `extension/lib/providers/types.ts` — Add `'groq' | 'qwen'` to ProviderName
2. `extension/lib/providers/provider-registry.ts` — Update fallback chain, add new providers

### Files to Create
1. `extension/lib/providers/groq-provider.ts` — Groq direct API client
2. `extension/lib/providers/qwen-provider.ts` — Qwen direct API client

## Implementation Steps

### Step 1: Update `types.ts`

Update `ProviderName` type:
```typescript
// Before
export type ProviderName = 'gemini' | 'glm';

// After
export type ProviderName = 'gemini' | 'glm' | 'groq' | 'qwen';
```

### Step 2: Create `groq-provider.ts`

Follow GLM provider pattern (both OpenAI-compatible):

```typescript
/** Direct Groq API provider — OpenAI-compatible, for users with their own API key */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

function buildSystemPrompt(from: string, to: string): string {
  const fromLabel = from === 'auto' ? 'the detected language' : from;
  return `You are a professional translator. Translate the following text from ${fromLabel} to ${to}. Output only the translation, nothing else.`;
}

export async function translateWithGroq(
  text: string, from: string, to: string, apiKey: string
): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: buildSystemPrompt(from, to) },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const translated = data.choices?.[0]?.message?.content?.trim();
  if (!translated) throw new Error('Groq returned empty response');
  return translated;
}
```

### Step 3: Create `qwen-provider.ts`

Same OpenAI-compatible pattern, different endpoint:

```typescript
/** Direct Qwen (Alibaba Cloud) API provider — OpenAI-compatible */

const QWEN_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';

// Same pattern as Groq, model: 'qwen-turbo-latest'
```

### Step 4: Update `provider-registry.ts`

Changes needed:
1. Import new providers
2. Update `translateDirect()` to handle 4 providers
3. Update fallback chain to cycle through available providers

```typescript
// Updated translateDirect
async function translateDirect(
  text: string, from: string, to: string,
  provider: ProviderName, apiKeys: Record<ProviderName, string>
): Promise<string> {
  const key = apiKeys[provider];
  if (!key) throw new Error(`No API key for ${provider}`);

  switch (provider) {
    case 'gemini': return translateWithGemini(text, from, to, key);
    case 'glm':    return translateWithGlm(text, from, to, key);
    case 'groq':   return translateWithGroq(text, from, to, key);
    case 'qwen':   return translateWithQwen(text, from, to, key);
  }
}

// Updated fallback: try all providers with keys
const FALLBACK_ORDER: ProviderName[] = ['gemini', 'groq', 'glm', 'qwen'];
```

## Todo List

- [x] Update `ProviderName` in `types.ts` to add `'groq' | 'qwen'`
- [x] Create `groq-provider.ts` (~35 LOC)
- [x] Create `qwen-provider.ts` (~35 LOC)
- [x] Update `provider-registry.ts` — imports, translateDirect switch, fallback chain
- [x] Verify TypeScript compilation passes

## Success Criteria

- `ProviderName` type includes all 4 providers
- Both new providers follow existing code pattern (same function signature)
- Provider registry handles 4-provider fallback without breaking existing Gemini/GLM flow
- No TypeScript compilation errors
