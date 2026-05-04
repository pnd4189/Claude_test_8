# Code Review: Web App (Next.js 14 + React 19)

**Date:** 2026-05-03
**Reviewer:** code-reviewer
**Scope:** All web-app source files (API routes, lib, components, stores, config)

---

## Scope
- **Files:** 27 source files across API routes, lib, components, stores, config
- **LOC:** ~2,200 (approx)
- **Focus:** Full review of all web-app source
- **Scout findings:** Ghost route call, dead code, race-prone state, cache collision risk, missing provider implementations

---

## CRITICAL Issues

### C1. Translation cache key collision risk
- **File:** `web-app/lib/redis.ts:68-71`
- **Issue:** Cache key is `text.substring(0,100) + text.length`. Two different texts with identical first 100 characters AND identical total length produce the same key, returning wrong cached translations silently.
- **Impact:** Data integrity -- users receive incorrect translations with no indication.
- **Fix:** Use a proper hash function (e.g., SHA-256) on the full text:
  ```ts
  import { createHash } from 'crypto';
  generateKey(text, sourceLang, targetLang, provider) {
    const hash = createHash('sha256').update(text).digest('hex').substring(0, 32);
    return `translation:${sourceLang}:${targetLang}:${provider}:${hash}`;
  }
  ```

### C2. Cache clear route is a no-op
- **File:** `web-app/app/api/cache/clear/route.ts:10-24`
- **Issue:** The POST handler logs "Clearing translation cache..." but does absolutely nothing -- no Redis SCAN, no DEL, nothing. Returns `success: true` deceptively. The code even has a comment acknowledging this is incomplete.
- **Impact:** Cache poisoning or stale data can never be cleared. Admin tools will show success while cache remains intact.
- **Fix:** Implement actual Redis key deletion:
  ```ts
  const keys = await redis.keys('translation:*');
  if (keys.length > 0) await redis.del(...keys);
  ```

### C3. Gemini API key leaked in URL
- **File:** `web-app/lib/providers/gemini.ts:25`
- **Issue:** API key is passed as a URL query parameter `?key=${apiKey}`. This key will appear in server access logs, proxy logs, CDN logs, and any request tracing.
- **Impact:** API key exposure through log infrastructure. Standard Gemini SDK uses `x-goog-api-key` header instead.
- **Fix:** Use header-based authentication:
  ```ts
  headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' }
  ```
  And change URL to `${GEMINI_BASE}/${model}:generateContent` (no query param).

### C4. Quota display fetches non-existent API route
- **File:** `web-app/components/quota-display.tsx:17`
- **Issue:** Calls `fetch('/api/providers/stats')` but no `/api/providers/stats/route.ts` exists. The fetch will always 404. Component shows skeleton loader forever if the endpoint returns non-200 (it silently catches the error).
- **Impact:** Quota display never works. Component shows loading skeleton permanently in production.
- **Fix:** Either create the `/api/providers/stats` route or remove this component if not yet needed.

---

## IMPORTANT Issues

### I1. `any` type in catch block exposes error internals
- **File:** `web-app/app/api/translate/route.ts:111,130`
- **Issue:** `catch (error: any)` then returns `error.message` directly to client. This leaks internal error details (provider names, internal error structures, possibly stack traces) to external consumers.
- **Fix:** Use typed error and generic message:
  ```ts
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Translation failed';
    // return sanitized message
  }
  ```

### I2. `APIKeyRotator` is not thread-safe -- per-request instances would be safer
- **File:** `web-app/lib/api-key-rotator.ts:9-11`
- **Issue:** `currentIndex` and `failedAttempts` are mutable instance state. In Next.js serverless functions, each invocation gets a new instance, but in development (or with ISR/page-level caching), a shared instance could have stale state. More importantly, `getProvider()` creates a new client (and thus new rotator) on every call, so the rotation state is never preserved across requests -- key rotation is effectively useless in production.
- **Impact:** Key rotation does not actually work. If key #1 is exhausted, the next request will try key #1 again since the rotator is recreated fresh.
- **Fix:** Either persist rotation state in Redis, or use module-level singletons for provider clients instead of factory functions that create new instances each call.

### I3. Duplicate FREE_MODEL_FILTERS + shouldIncludeModel (DRY violation)
- **Files:** `web-app/app/api/providers/openrouter/models/route.ts:13-29` AND `web-app/app/api/cron/refresh-models/route.ts:13-26`
- **Issue:** Identical constant array and function duplicated across two files. If one is updated, the other will drift.
- **Fix:** Extract to a shared module:
  ```ts
  // web-app/lib/model-filters.ts
  export const FREE_MODEL_FILTERS = [...]
  export function shouldIncludeModel(modelId: string): boolean { ... }
  ```

### I4. Duplicate system prompt across 3 providers
- **Files:** `web-app/lib/providers/openrouter.ts:74`, `web-app/lib/providers/openai-compatible-provider.ts:32`, `web-app/lib/providers/gemini.ts:22`
- **Issue:** Identical system prompt string duplicated 3 times. Any prompt change requires editing 3 files.
- **Fix:** Extract to shared constant:
  ```ts
  export const TRANSLATION_SYSTEM_PROMPT = (src: string, tgt: string) =>
    `You are a professional translator. Translate the following text from ${src} to ${tgt}...`;
  ```

### I5. Duplicate key-loading logic
- **Files:** `web-app/lib/api-key-rotator.ts:219-245` (`createRotatorFromEnv`) AND `web-app/lib/providers/openai-compatible-provider.ts:68-77` (`loadKeysFromEnv`)
- **Issue:** Two near-identical functions that load `_1` through `_20` suffixed env vars plus an unsuffixed fallback. One returns `string[]`, the other returns `APIKeyRotator | null`.
- **Fix:** Have `createRotatorFromEnv` call `loadKeysFromEnv` internally.

### I6. Mistral provider referenced but never implemented
- **Files:** `web-app/lib/api-key-rotator.ts:209`, `web-app/components/fallback-chain.tsx:9`, `web-app/lib/providers/types.ts:84`
- **Issue:** `createRotators()` includes mistral, fallback chain includes mistral, type union includes mistral -- but no `web-app/lib/providers/mistral.ts` exists. Provider factory has no case for mistral.
- **Impact:** Dead code and broken fallback chain. Users see "Mistral" in the chain UI but it can never work.
- **Fix:** Remove mistral references from fallback chain, types, and `createRotators()`, or implement the provider.

### I7. `createRotators()` is dead code
- **File:** `web-app/lib/api-key-rotator.ts:205-245`
- **Issue:** Exported `createRotators()` is never imported anywhere. Individual providers use their own factory functions.
- **Fix:** Remove or update to match actual usage pattern.

### I8. Theme applied in two places -- race condition
- **Files:** `web-app/store/settings-store.ts:38-51` AND `web-app/components/theme-provider.tsx:27-49`
- **Issue:** Both `settings-store.ts` (Zustand with persist) and `ThemeProvider` (React context) manage theme independently. Both read from localStorage and apply classes to `<html>`. They can race and conflict. Components import from different sources (some use `useTheme` from provider, some use `useSettingsStore`).
- **Impact:** Flash of incorrect theme, theme toggle not working consistently.
- **Fix:** Pick one source of truth. Either use the Zustand store everywhere and remove ThemeProvider, or use ThemeProvider everywhere and remove theme logic from the store.

### I9. Chunked translator calls API via client-side fetch -- no auth
- **File:** `web-app/lib/chunked-translator.ts:88-100`
- **Issue:** Uses `fetch(this.apiEndpoint, ...)` with relative URL. If this runs client-side, the user can see the API structure. There is no auth token passed. Rate limiting is IP-based, so a malicious client can trivially bypass per-user limits.
- **Fix:** If intended for server-side only, add a comment and ensure it's only imported in API routes. If client-side, add auth tokens to requests.

### I10. OpenRouter `createOpenRouterClient` does not load unsuffixed key
- **File:** `web-app/lib/providers/openrouter.ts:141-155`
- **Issue:** Only loads `OPENROUTER_API_KEY_1` through `_20`. Does NOT load `OPENROUTER_API_KEY` (unsuffixed). Other providers using `loadKeysFromEnv` DO load the unsuffixed key. This is inconsistent and will break for users who only set `OPENROUTER_API_KEY` without a suffix.
- **Fix:** Use `loadKeysFromEnv('OPENROUTER_API_KEY')` from `openai-compatible-provider.ts`, or add the unsuffixed fallback manually.

---

## MINOR Issues

### M1. `isQuotaError` and `isRateLimitError` are nearly identical
- **File:** `web-app/lib/api-key-rotator.ts:104-128`
- **Issue:** `isRateLimitError` is a subset of `isQuotaError`. The distinction adds no value since both trigger the same rotation logic.
- **Fix:** Consolidate into a single `isRecoverableError` method.

### M2. `translation-store.ts` not persisted -- jobs lost on refresh
- **File:** `web-app/store/translation-store.ts`
- **Issue:** Unlike `settings-store`, the translation store has no `persist` middleware. All translation state is lost on page refresh. If a user uploads a large file and accidentally refreshes, all progress is gone.
- **Fix:** Consider adding `persist` middleware for the `jobs` array, or at minimum warn the user.

### M3. `TranslationJob.id` uses `Date.now()` + short random -- not cryptographically unique
- **File:** `web-app/store/translation-store.ts:50`
- **Issue:** `job-${Date.now()}-${Math.random().toString(36).substring(7)}` can theoretically collide under rapid creation.
- **Fix:** Use `crypto.randomUUID()` or a longer random string.

### M4. `ProviderSelector` calls `.find()` on same array multiple times
- **File:** `web-app/components/provider-selector.tsx:92-107`
- **Issue:** `availableModels.find((m) => m.id === selectedModel)` is called 3 separate times in the model info section. Minor perf waste.
- **Fix:** Assign to a variable:
  ```ts
  const selectedModelInfo = availableModels.find((m) => m.id === selectedModel);
  ```

### M5. `language-switcher.tsx` naive path replacement
- **File:** `web-app/components/language-switcher.tsx:14`
- **Issue:** `pathname.replace('/${locale}', '')` could incorrectly replace locale appearing elsewhere in the path (e.g., `/en/document-en-translation` would become `/document-translation`).
- **Fix:** Use regex with start-of-path anchor: `pathname.replace(new RegExp('^/' + locale), '')`.

### M6. `ErrorBoundary` does not pass `errorInfo` to any reporting service
- **File:** `web-app/components/error-boundary.tsx:25-26`
- **Issue:** Only `console.error` -- no error reporting to external service (Sentry, etc). Acceptable for early stage but worth noting.

### M7. `vercel.json` hardcodes placeholder domain
- **File:** `web-app/vercel.json:14`
- **Issue:** `NEXT_PUBLIC_APP_URL` set to `https://translate.yourdomain.com`. This is a placeholder that will be deployed to Vercel as-is.
- **Fix:** Remove from vercel.json and set via Vercel dashboard environment variables.

### M8. `redis.ts` initializes with empty strings if env vars missing
- **File:** `web-app/lib/redis.ts:5-8`
- **Issue:** `url: process.env.UPSTASH_REDIS_REST_URL || ''` silently creates a broken Redis client. Every cache call will fail and be swallowed by try/catch, returning null. App degrades to no-cache mode silently with no warning.
- **Fix:** Log a warning on init if env vars are missing:
  ```ts
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    console.warn('UPSTASH_REDIS_REST_URL not set -- caching disabled');
  }
  ```

### M9. `TextChunker.chunkBySize` has confusing position guard
- **File:** `web-app/lib/text-chunker.ts:141-143`
- **Issue:** The guard condition `position <= chunks[...].length + ...` is hard to reason about and may not correctly prevent infinite loops in edge cases with very small text and large overlap.
- **Fix:** Simplify to `position = Math.max(position + 1, end)` or add a max-iterations safety counter.

### M10. `QuotaDisplay` hardcodes `quotaLimit = 1000`
- **File:** `web-app/components/quota-display.tsx:45`
- **Issue:** Magic number with a comment "Example limit". Will show incorrect percentages in production.
- **Fix:** Fetch actual limit from the (currently missing) stats API.

### M11. Provider store `fetchModels` targets non-existent route
- **File:** `web-app/store/provider-store.ts:88`
- **Issue:** Calls `fetch('/api/providers/${providerId}/models')` but only `/api/providers/openrouter/models` exists. Fetching models for qwen, groq, glm, or gemini will 404.
- **Fix:** Either create model routes for each provider or limit model fetching to openrouter.

### M12. Excessive `any` usage
- **Files:** 20+ instances across lib, components, and API routes
- **Key offenders:** `redis.ts` (modelsCache uses `any[]`), `api-key-rotator.ts` (error handling), `quota-display.tsx` (state), `theme-toggle.tsx` (`as any` cast), `error-boundary.tsx` (errorInfo)
- **Fix:** Replace with proper types from `./providers/types.ts`.

---

## Positive Observations

1. Clean provider abstraction with factory pattern -- easy to add new providers
2. `OpenAICompatibleProvider` base class avoids duplicating HTTP logic for 3 providers
3. Proper file validation in `file-parsers/index.ts` with magic-byte detection
4. `TextChunker` handles sentence boundaries and overlap well
5. Rate limiting on the translate endpoint with proper 429 response and headers
6. Good use of Upstash Redis for caching + rate limiting
7. EPUB exporter preserves original structure and supports bilingual mode
8. i18n setup with next-intl is clean and follows conventions
9. Error boundary component properly catches React render errors
10. `localStorage` persistence for settings via Zustand middleware

---

## Recommended Actions (Priority Order)

1. **[Critical]** Fix cache key collision -- use SHA-256 hash (C1)
2. **[Critical]** Fix Gemini API key exposure via URL parameter (C3)
3. **[Critical]** Implement cache clear route or remove it (C2)
4. **[Critical]** Create `/api/providers/stats` route or remove QuotaDisplay (C4)
5. **[Important]** Fix APIKeyRotator statelessness -- key rotation is currently broken (I2)
6. **[Important]** Consolidate duplicate FREE_MODEL_FILTERS into shared module (I3)
7. **[Important]** Consolidate duplicate system prompts (I4)
8. **[Important]** Fix OpenRouter to load unsuffixed env var (I10)
9. **[Important]** Remove dead Mistral references or implement provider (I6/I7)
10. **[Important]** Resolve dual theme management (I8)
11. **[Minor]** Add persist middleware to translation store (M2)
12. **[Minor]** Replace `any` types with proper interfaces (M12)

---

## Metrics
- Type Coverage: ~70% (significant `any` usage in key areas)
- Test Coverage: 0% (no test files found)
- Linting Issues: Not run (no lint config verified)
- Files Reviewed: 27
- Issues Found: 4 Critical, 10 Important, 12 Minor

---

## Unresolved Questions

1. Is the chunked translator intended to run client-side or server-side? This affects auth design (I9).
2. Should the translation store persist across page reloads? Users uploading large files will lose progress (M2).
3. Is there a plan to add a `/api/providers/stats` endpoint? The QuotaDisplay component assumes it exists (C4).
4. Should the provider factory return singleton instances to preserve key rotation state? (I2)
5. Why does `createRotators()` in `api-key-rotator.ts` include Mistral but provider-factory does not? Dead code or planned feature? (I6/I7)

---

## Overall Quality: 6/10

The codebase demonstrates solid architectural thinking (provider abstraction, key rotation concept, caching layer) but has several critical implementation gaps: cache key collisions, broken key rotation (stateless instances), a no-op cache clear endpoint, and API key exposure. The DRY violations (3x system prompt, 2x model filters, 2x key loading) are maintainability risks that will worsen as the project grows. The zero test coverage is the most significant long-term risk.
