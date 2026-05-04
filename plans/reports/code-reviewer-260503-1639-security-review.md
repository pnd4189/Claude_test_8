# Security Review Report

**Date:** 2026-05-03
**Reviewer:** code-reviewer (Staff Engineer)
**Scope:** Full platform — Next.js web app, Chrome Extension, Cloudflare Worker proxy
**Files reviewed:** 35+ source files across all three components

---

## Executive Summary

The platform has a **solid XSS defense posture** (consistent use of `textContent` over `innerHTML`) and **good API key isolation** on the web app server side. However, there are several production-readiness security gaps: the proxy CORS is fully open, the web app has no security headers, the cache-clear endpoint is unauthenticated, the extension stores API keys in plaintext in `chrome.storage.local`, and the proxy rate limiter resets on worker restart. These are addressed below by severity.

**Overall Security Score: 6.5 / 10**

---

## CRITICAL FINDINGS

### C-1. CORS Wildcard on Proxy Server (`Access-Control-Allow-Origin: *`)

- **Severity:** Critical
- **Category:** OWASP A05:2021 — Security Misconfiguration
- **File:** `extension/proxy-server/src/index.ts:35-39`
- **Vulnerability:** CORS headers allow any origin to call the proxy directly from a browser. Combined with the optional `EXTENSION_SECRET` (not enforced when unset), any website can make cross-origin requests to the proxy and consume translation quota.
- **Impact:** Any malicious webpage can drain the proxy's API keys. If `EXTENSION_SECRET` is not set, there is zero authentication — the proxy is fully public.
- **Fix:**
  ```typescript
  // Replace wildcard with extension origin
  const ALLOWED_ORIGINS = [
    'chrome-extension://YOUR_EXTENSION_ID',
    // Or check the Origin header dynamically
  ];

  function getCorsHeaders(request: Request): Record<string, string> {
    const origin = request.headers.get('Origin') ?? '';
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return {
        'Access-Control-Allow-Origin': '',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Extension-Key',
      };
    }
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Extension-Key',
      'Vary': 'Origin',
    };
  }
  ```
  Also: **make `EXTENSION_SECRET` required**, not optional. Fail to start if it is missing.

---

### C-2. EXTENSION_SECRET Auth is Optional on Proxy

- **Severity:** Critical
- **Category:** OWASP A07:2021 — Identification and Authentication Failures
- **File:** `extension/proxy-server/src/index.ts:63-68`
- **Vulnerability:** The auth check is gated on `if (env.EXTENSION_SECRET)`. When the secret is not configured, **all requests pass through without authentication**. The wrangler.toml comments mark it as "Optional."
- **Impact:** If deployed without the secret, the proxy is an open translation API. Anyone who discovers the URL gets free translations at the operator's expense.
- **Fix:** Remove the conditional. Always require the secret:
  ```typescript
  const key = request.headers.get('X-Extension-Key');
  if (!env.EXTENSION_SECRET || key !== env.EXTENSION_SECRET) {
    return errorResponse('Unauthorized', 401);
  }
  ```

---

### C-3. Unauthenticated Cache Clear Endpoint

- **Severity:** Critical
- **Category:** OWASP A01:2021 — Broken Access Control
- **File:** `web-app/app/api/cache/clear/route.ts:10`
- **Vulnerability:** The `POST /api/cache/clear` endpoint has **no authentication or authorization check**. Any anonymous user can call it. While the current implementation is a no-op stub, once wired to Redis, it would allow anyone to wipe the translation cache.
- **Impact:** Denial of service through cache invalidation; increased API costs from cache misses.
- **Fix:** Add auth middleware or at minimum an admin secret check:
  ```typescript
  export async function POST(request: NextRequest) {
    const secret = request.headers.get('Authorization');
    if (secret !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // ... proceed
  }
  ```

---

## HIGH PRIORITY FINDINGS

### H-1. No Security Headers on Web App

- **Severity:** High
- **Category:** OWASP A05:2021 — Security Misconfiguration
- **File:** `web-app/middleware.ts`, `web-app/next.config.ts`
- **Vulnerability:** No `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, or `Strict-Transport-Security` headers are configured anywhere.
- **Impact:** The web app is vulnerable to clickjacking, MIME-type sniffing, and has no CSP to limit script sources.
- **Fix:** Add security headers in `next.config.ts` or middleware:
  ```typescript
  // In middleware.ts, add headers to all responses
  const securityHeaders = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
  ```

---

### H-2. Extension API Keys Stored in Plaintext in chrome.storage.local

- **Severity:** High
- **Category:** OWASP A02:2021 — Cryptographic Failures
- **File:** `extension/lib/storage/settings-store.ts:51-52`
- **Vulnerability:** User-entered API keys are stored as plaintext in `chrome.storage.local`. Any extension with the `storage` permission, or a malicious extension, can read them. The keys are accessible via `chrome.storage.local.get('settings')` from any extension context.
- **Impact:** API key theft by malicious extensions. Users' BYOK keys for Gemini, Groq, GLM, Qwen are all exposed.
- **Fix:** This is an inherent Chrome extension limitation, but mitigate:
  1. Add a prominent warning in the UI that keys are stored locally
  2. Consider using `chrome.storage.session` (in-memory, cleared on browser close) for short-lived sessions
  3. Minimize the scope of keys stored — prefer proxy mode where keys live server-side
  4. At minimum, add a `permissions` check in the manifest to limit which extensions can access storage

---

### H-3. Proxy Rate Limiter is In-Memory, Resets on Worker Restart

- **Severity:** High
- **Category:** OWASP A04:2021 — Insecure Design
- **File:** `extension/proxy-server/src/rate-limiter.ts:11`
- **Vulnerability:** The rate limiter uses an in-memory `Map`. Cloudflare Workers are ephemeral — the Map resets on every deploy, restart, or scaling event. An attacker can simply retry after a worker restart to bypass limits.
- **Impact:** Rate limiting is effectively unreliable. Burst attacks succeed whenever workers recycle.
- **Fix:** Use Cloudflare Durable Objects or KV for rate limit state:
  ```typescript
  // Use a Durable Object or at minimum KV
  const key = `ratelimit:${ip}`;
  const count = await env.TRANSLATION_CACHE.get(key);
  // ... increment and check against limit
  ```
  Alternatively, use Cloudflare's built-in Rate Limiting Rules in the dashboard.

---

### H-4. Error Messages Leak Internal Details

- **Severity:** High
- **Category:** OWASP A04:2021 — Insecure Design
- **Files:**
  - `web-app/app/api/translate/route.ts:130` — `error.message` returned to client
  - `extension/proxy-server/src/index.ts:92` — `err.message` returned to client
- **Vulnerability:** Raw error messages from AI provider APIs are forwarded to the user. These may contain internal API URLs, key fragments, or infrastructure details.
- **Impact:** Information disclosure about backend architecture, API providers used, and potentially partial key data in error messages.
- **Fix:** Sanitize errors before returning:
  ```typescript
  catch (error: any) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Translation failed. Please try again later.', code: 'TRANSLATION_ERROR' },
      { status: 500 }
    );
  }
  ```

---

### H-5. Weak Translation Cache Key in Web App

- **Severity:** High
- **Category:** OWASP A04:2021 — Insecure Design
- **File:** `web-app/lib/redis.ts:68-69`
- **Vulnerability:** The cache key uses `text.substring(0, 100) + text.length`. This is a very weak hash — collisions are trivial. Two different texts with the same first 100 characters and same length will share a cache entry, causing wrong translations to be served.
- **Impact:** Cache poisoning — users receive incorrect translations. Not a security exploit per se, but a correctness and trust issue that could be weaponized.
- **Fix:** Use a proper hash function:
  ```typescript
  import { createHash } from 'crypto';

  generateKey(text: string, sourceLang: string, targetLang: string, provider: string): string {
    const hash = createHash('sha256').update(text).digest('hex').substring(0, 16);
    return `translation:${sourceLang}:${targetLang}:${provider}:${hash}`;
  }
  ```

---

### H-6. No Text Length Limit on Proxy Translate Endpoint

- **Severity:** High
- **Category:** OWASP A04:2021 — Insecure Design
- **File:** `extension/proxy-server/src/index.ts:154-165`
- **Vulnerability:** The proxy's `/api/translate` endpoint validates `text/from/to` presence but does **not limit text length**. The batch endpoint limits to 50 texts but each individual text has no size cap. The web app limits to 50,000 characters but the proxy has no such limit.
- **Impact:** An attacker can send arbitrarily large text payloads, causing excessive API costs and potential DoS.
- **Fix:**
  ```typescript
  if (body.text.length > 50000) {
    return errorResponse('Text too long. Maximum 50,000 characters.', 400);
  }
  ```

---

## MEDIUM PRIORITY FINDINGS

### M-1. File Upload Validation is Extension-Based Only (Client-Side)

- **Severity:** Medium
- **Category:** OWASP A04:2021 — Insecure Design
- **File:** `web-app/components/file-upload.tsx:33`
- **Vulnerability:** File type validation is based on filename extension (`detectFormatFromFilename`). While there is magic-byte validation in `isValidEpub`, `isValidPdf`, `isValidDocx` downstream, the initial gate is extension-based. A crafted file with a `.epub` extension but malicious content could pass the extension check.
- **Impact:** Malicious files reaching the parser. Parsers (EPUB uses JSZip, PDF uses pdf-parse) could be vulnerable to ZIP bombs or malformed payloads.
- **Fix:** Add file size limits at the API level. Consider adding a maximum file size check before parsing. The magic-byte validation helps, but add explicit file-size-after-decompression checks to prevent ZIP bombs.

---

### M-2. API Key Masked Too Generously in Logs

- **Severity:** Medium
- **Category:** OWASP A09:2021 — Security Logging and Monitoring Failures
- **File:** `web-app/lib/api-key-rotator.ts:188`
- **Vulnerability:** The `maskKey` function shows the first 8 characters of the API key. For many providers, the first 8 chars include the key prefix (e.g., `AIzaSyB...` for Gemini, `gsk_abc1...` for Groq), which significantly narrows the keyspace for brute-force attacks if logs are exposed.
- **Impact:** Reduced effective key entropy if logs leak. The first 8 chars of an API key often identify the provider and project.
- **Fix:** Show fewer characters:
  ```typescript
  private maskKey(key: string): string {
    if (key.length <= 8) return '***';
    return `***...${key.substring(key.length - 4)}`;
  }
  ```

---

### M-3. ReDoS Risk in EPUB HTML Tag Stripping

- **Severity:** Medium
- **Category:** OWASP A04:2021 — Insecure Design
- **File:** `web-app/lib/file-parsers/epub-parser.ts:105-106`
- **Vulnerability:** The regex patterns `/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi` and the similar `<style>` pattern use nested quantifiers with backtracking. On pathological input, these can exhibit catastrophic backtracking.
- **Impact:** Denial of service on the server when processing a crafted EPUB file.
- **Fix:** Use a simpler approach:
  ```typescript
  // Replace with non-backtracking patterns
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  ```

---

### M-4. Extension `.gitignore` Missing `.env` Entry

- **Severity:** Medium
- **Category:** OWASP A05:2021 — Security Misconfiguration
- **File:** `extension/.gitignore`
- **Vulnerability:** The extension's `.gitignore` does not include `.env` or `.env*`. The web app's `.gitignore` does include it. If someone adds a `.env` file with API keys in the extension directory, it would be committed.
- **Impact:** Potential secrets committed to version control.
- **Fix:** Add `.env*` to `extension/.gitignore`.

---

### M-5. Missing Root `.gitignore`

- **Severity:** Medium
- **Category:** OWASP A05:2021 — Security Misconfiguration
- **File:** Repository root
- **Vulnerability:** There is no root-level `.gitignore`. The `docs/` and `plans/` directories are managed but there is no global exclusion for `.env`, IDE files, or OS files at the repo root.
- **Impact:** Risk of accidentally committing sensitive files at the repo root level.
- **Fix:** Create a root `.gitignore` that includes `.env*`, `.DS_Store`, `.idea/`, `.vscode/`, etc.

---

### M-6. Gemini API Key Exposed in URL Query Parameter

- **Severity:** Medium
- **Category:** OWASP A02:2021 — Cryptographic Failures
- **Files:**
  - `web-app/lib/providers/gemini.ts:25` — `?key=${apiKey}`
  - `extension/lib/providers/gemini-provider.ts:16` — `?key=${apiKey}`
  - `extension/proxy-server/src/providers/gemini.ts:17` — `?key=${apiKey}`
- **Vulnerability:** The Gemini API key is passed as a URL query parameter. This means the key appears in server access logs, proxy logs, CDN logs, and browser network tabs (in extension BYOK mode). This is a Google API design choice, but it increases exposure surface.
- **Impact:** API key leakage through logs and network inspection. In the extension BYOK mode, the user's key is visible in the browser DevTools Network tab.
- **Fix:** This is a Google API limitation (Gemini REST API requires the key in the URL). Mitigate by:
  1. Ensuring server logs redact query parameters
  2. Using the proxy for Gemini calls instead of BYOK where possible
  3. Documenting the risk in the extension settings UI

---

### M-7. No Input Validation on Provider/Model Names (Web App)

- **Severity:** Medium
- **Category:** OWASP A03:2021 — Injection
- **File:** `web-app/app/api/translate/route.ts:48-49`
- **Vulnerability:** The `provider` and `model` fields from the request body are passed through without validation. While the `getProvider` switch-case provides implicit whitelisting for the provider, the model string is passed directly to the AI API without any validation.
- **Impact:** An attacker could specify an expensive or inappropriate model, potentially increasing API costs. Not a direct injection risk due to JSON serialization, but a business logic vulnerability.
- **Fix:** Add an allowlist for models per provider:
  ```typescript
  const ALLOWED_MODELS: Record<string, string[]> = {
    openrouter: ['openai/gpt-3.5-turbo', ...],
    qwen: ['qwen-mt-flash', 'qwen-turbo-latest'],
    // ...
  };
  const allowedModels = ALLOWED_MODELS[provider];
  if (model && allowedModels && !allowedModels.includes(model)) {
    return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
  }
  ```

---

### M-8. Batch Translate Has No Rate Limiting Per-Text

- **Severity:** Medium
- **Category:** OWASP A04:2021 — Insecure Design
- **File:** `extension/proxy-server/src/index.ts:179-181`
- **Vulnerability:** The batch translate endpoint fans out with `Promise.all` over all 50 texts, each potentially hitting an external AI API. A batch of 50 large texts can trigger 50 concurrent API calls. There is no concurrency control or per-text size limit.
- **Impact:** API rate limit overages, potential cost spikes, and downstream provider rate limit errors that cascade.
- **Fix:** Add per-text size validation and limit concurrency:
  ```typescript
  // Validate individual text sizes
  for (const text of body.texts) {
    if (text.length > 10000) {
      return errorResponse('Individual text too long. Maximum 10,000 characters per text.', 400);
    }
  }
  // Use p-limit or similar for concurrency control
  ```

---

## LOW PRIORITY FINDINGS

### L-1. `providerMode` Can Be Changed Without Re-authentication

- **Severity:** Low
- **Category:** OWASP A07:2021 — Identification and Authentication Failures
- **File:** `extension/lib/storage/settings-store.ts:37-56`
- **Vulnerability:** Any content script or extension page can call `updateSettings` and change `providerMode` from `proxy` to `byok`, or vice versa, without any confirmation. A compromised content script could switch modes to exfiltrate API keys or redirect traffic.
- **Impact:** Low probability but could be exploited in a targeted attack on the extension.
- **Fix:** Consider requiring user confirmation for mode changes, or at minimum, validate settings changes in the background script.

---

### L-2. No Request Timeout on Web App Translate Endpoint

- **Severity:** Low
- **Category:** OWASP A04:2021 — Insecure Design
- **File:** `web-app/app/api/translate/route.ts`
- **Vulnerability:** While `maxDuration = 300` is set, there is no per-request timeout. A slow AI provider response could hold a connection open for 5 minutes.
- **Impact:** Resource exhaustion under load.
- **Fix:** Add an AbortController with a reasonable timeout (e.g., 60 seconds).

---

### L-3. `console.log` Statements in Production Code

- **Severity:** Low
- **Category:** OWASP A09:2021 — Security Logging and Monitoring Failures
- **Files:** Throughout both web-app and extension code
- **Vulnerability:** Pervasive `console.log` statements that log operational details including API key rotation state, cache hits, etc.
- **Impact:** In production, these may leak to browser DevTools (extension) or server logs (web app), revealing operational patterns.
- **Fix:** Use a proper logging library with log levels. Strip debug logs in production builds.

---

### L-4. `ParsedDocument.metadata` Allows Arbitrary Key-Value Pairs

- **Severity:** Low
- **Category:** OWASP A08:2021 — Software and Data Integrity Failures
- **File:** `web-app/lib/file-parsers/index.ts:17` — `[key: string]: any`
- **Vulnerability:** The metadata interface allows arbitrary properties. Parser libraries (mammoth, epub, pdf-parse) return various metadata fields that flow unchecked through the system.
- **Impact:** Low — no known exploitable path, but violates input validation principles.
- **Fix:** Define explicit metadata fields and strip unknown properties.

---

## POSITIVE OBSERVATIONS

1. **Excellent XSS prevention**: All DOM rendering uses `textContent` (not `innerHTML`). `bilingual-renderer.ts`, `dual-subtitle-renderer.ts`, `chapter-view.tsx`, and all content scripts consistently use safe DOM APIs. No `dangerouslySetInnerHTML` found anywhere.

2. **API keys never reach client in web app**: Server-side providers read from `process.env` only. The API routes never expose keys to the frontend.

3. **Proper key rotation with masking**: The `APIKeyRotator` class masks keys in logs and stats (though the mask is a bit generous — see M-2).

4. **Magic-byte file validation**: PDF, EPUB, and DOCX parsers validate file signatures before parsing, preventing trivial file type confusion.

5. **Rate limiting on web app**: Upstash rate limiting is properly implemented with sliding window and proper headers.

6. **Cron endpoint has auth**: The `/api/cron/refresh-models` endpoint validates `CRON_SECRET` before executing.

7. **wrangler.toml is clean**: No secrets in the config file — all sensitive values are marked as wrangler secrets.

8. **Separation of concerns**: BYOK mode keeps user keys in the extension; proxy mode keeps operator keys on the server. Clean separation.

---

## SECURITY SCORECARD

| Category | Score | Notes |
|---|---|---|
| API Key Protection | 7/10 | Server-side keys well isolated; extension BYOK is inherently limited |
| XSS Prevention | 9/10 | Consistent textContent usage, no innerHTML |
| Input Validation | 6/10 | Missing text length limit on proxy, weak cache key |
| Auth & Access Control | 5/10 | Optional EXTENSION_SECRET, unauthenticated cache clear |
| CORS Configuration | 3/10 | Wildcard origin on proxy |
| Rate Limiting | 6/10 | Web app good; proxy is ephemeral in-memory |
| Security Headers | 2/10 | None configured |
| Error Handling | 5/10 | Raw error messages leaked to clients |
| Secrets Management | 7/10 | No hardcoded secrets; .env gitignored; extension gitignore needs .env |
| Code Quality | 8/10 | Clean TypeScript, good separation of concerns |

**Overall: 6.5/10**

---

## TOP 3 PRIORITIES

1. **Lock down the proxy**: Remove CORS wildcard, make `EXTENSION_SECRET` mandatory, add text length limits. This is the most exposed attack surface.

2. **Add security headers to web app**: CSP, X-Frame-Options, HSTS. This is low-effort, high-impact.

3. **Authenticate the cache-clear endpoint**: Either remove it or add admin authentication. Currently a DoS vector.

---

## UNRESOLVED QUESTIONS

1. Is the proxy intended to be public-facing, or should it only be accessible from the Chrome extension? If extension-only, the CORS fix is straightforward (restrict to `chrome-extension://` origins).
2. What is the intended deployment model for the web app? If behind Cloudflare or Vercel, some security headers may be handled at the CDN level.
3. Is there a plan to add Content Security Policy nonce-based or hash-based script allowlisting for the web app?
4. Should the extension's BYOK mode support key encryption at rest (e.g., using Web Crypto API to encrypt before storing in `chrome.storage.local`)?
