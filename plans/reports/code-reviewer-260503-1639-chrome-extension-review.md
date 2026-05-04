# Code Review: Chrome Extension (WXT + React 19 + Cloudflare Worker)

## Scope
- **Files**: 42 source files across extension/entrypoints, extension/lib, extension/proxy-server
- **LOC**: ~2,800 (estimated)
- **Focus**: Full review of all listed files
- **Scout findings**: Edge cases in cache hashing, event listener leaks, unsanitized DOM, proxy auth bypass

## Overall Assessment

Well-structured codebase with clean separation of concerns. The WXT + React architecture is sound. Provider abstraction is clean with proper fallback chains. However, there are several security and correctness issues that should be addressed before production deployment.

**Quality Score: 7.5/10**

---

## Critical Issues

### CRIT-1: API Key Exposed in URL Query String (Gemini provider)
- **File**: `extension/lib/providers/gemini-provider.ts:16`, `extension/proxy-server/src/providers/gemini.ts:17`
- **Issue**: API key appended to URL as `?key=${apiKey}`. This exposes the key in server logs, browser network history, proxy logs, and referrer headers. Server-side variant leaks key in Cloudflare Worker logs.
- **Fix**: Use `x-goog-api-key` header instead:
  ```ts
  headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }
  // Remove ?key= from URL
  ```

### CRIT-2: CORS Allows All Origins on Proxy Server
- **File**: `extension/proxy-server/src/index.ts:36`
- **Issue**: `Access-Control-Allow-Origin: *` allows ANY website to call the proxy. Even with `EXTENSION_SECRET`, the secret is sent in a header which preflight exposes. If `EXTENSION_SECRET` is not set, the proxy is completely open to abuse from any origin.
- **Fix**: Restrict to extension origin:
  ```ts
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': 'chrome-extension://YOUR_EXTENSION_ID',
    // ...
  };
  ```
  Or validate `Origin` header dynamically against known extension IDs.

### CRIT-3: Hardcoded Target Language in Translators
- **Files**: `extension/lib/translators/subtitle-translator.ts:28`, `extension/lib/translators/epub-translator.ts:27`, `extension/lib/translators/pdf-translator.ts:33`
- **Issue**: All three translators hardcode `targetLang: 'vi'` in their `sendMessage` calls, ignoring user settings. Users who change the target language in settings will still get Vietnamese translations in ePub/PDF/subtitle modes.
- **Fix**: Read `targetLang` from settings before sending:
  ```ts
  const settings = await chrome.storage.local.get('settings');
  const targetLang = settings.settings?.targetLang ?? 'vi';
  ```

### CRIT-4: Translation Cache Hash Collisions
- **File**: `extension/lib/storage/translation-cache.ts:29-37`
- **Issue**: Uses a 32-bit DJB2-style hash for cache keys. With a 32-bit hash space, birthday paradox gives ~50% collision probability at ~77K entries. A collision causes wrong translations to be served silently. The proxy server uses SHA-256 (`kv-cache.ts`) but the client-side cache does not.
- **Fix**: Use `crypto.subtle.digest('SHA-256', ...)` (available in extensions) or at minimum use a 64-bit hash with separate chaining.

### CRIT-5: No Input Validation on Proxy Request Body
- **File**: `extension/proxy-server/src/index.ts:155,169`
- **Issue**: `body.text`, `body.texts[]`, `body.from`, `body.to` are not validated for type, length, or content. An attacker can send arbitrarily large `text` values (megabytes) to burn through API quota. `body.from` and `body.to` are injected directly into AI prompts without sanitization, enabling prompt injection.
- **Fix**: Add validation:
  ```ts
  if (typeof body.text !== 'string' || body.text.length > 10000) {
    return errorResponse('text must be a string under 10000 chars', 400);
  }
  const ALLOWED_LANGS = ['en', 'vi', 'zh', 'auto'];
  if (!ALLOWED_LANGS.includes(body.from) || !ALLOWED_LANGS.includes(body.to)) {
    return errorResponse('Invalid language code', 400);
  }
  ```

---

## Important Issues

### HIGH-1: Event Listener Leak in Hover Mode
- **File**: `extension/lib/translators/bilingual-renderer.ts:80-81`
- **Issue**: `mouseenter`/`mouseleave` listeners are added every time `renderHover` is called but `removeTranslation` only removes the DOM element, not the listeners on the original element. If display mode toggles between hover and other modes, listeners accumulate on original elements.
- **Fix**: Track and remove listeners in `removeTranslation`, or use event delegation on a container.

### HIGH-2: PDF Re-parses Entire Document Per Page
- **File**: `extension/lib/parsers/pdf-parser.ts:72-83`
- **Issue**: `renderPdfPage` calls `pdfjsLib.getDocument({ data })` every time a page changes. For a 100-page PDF, this means 100 full document parses. The document object should be cached.
- **Fix**: Cache the PDF document object:
  ```ts
  let docCache: Map<string, PDFDocumentProxy> = new Map();
  // key on ArrayBuffer byteLength or a hash
  ```

### HIGH-3: `nextId` Global Counter Never Resets
- **File**: `extension/lib/translators/paragraph-collector.ts:22`
- **Issue**: Module-level `let nextId = 0` keeps incrementing across page navigations in SPAs. While this doesn't cause bugs (IDs remain unique), it means IDs grow unboundedly (`ait-9999999...`) which is wasteful for DOM attributes. More critically, it's shared across all instances.
- **Fix**: Reset on `stopTranslation()` or use `crypto.randomUUID()` for uniqueness.

### HIGH-4: Batch Translate Creates Unbounded Concurrency
- **File**: `extension/lib/providers/provider-registry.ts:95-97`
- **Issue**: `batchTranslate` fallback uses `Promise.all(texts.map(...))` which fires all translations simultaneously. For a page with 200 paragraphs, this creates 200 concurrent API calls that will hit rate limits and likely fail.
- **Fix**: Add concurrency limiting (p-limit or manual semaphore). The `TranslationQueue` already has `MAX_CONCURRENT = 3` but the fallback bypasses it.

### HIGH-5: Rate Limiter Uses In-Memory Map (Lost on Worker Restart)
- **File**: `extension/proxy-server/src/rate-limiter.ts:11`
- **Issue**: `const store = new Map<string, RateEntry>()` resets on every Cloudflare Worker restart/redeploy. More critically, Cloudflare Workers can run multiple isolates, so different requests from the same IP may hit different isolates with independent rate limit counters. Rate limiting is effectively bypassed.
- **Fix**: Use Cloudflare KV or Durable Objects for consistent rate limiting, or at minimum document this limitation clearly.

### HIGH-6: Content Script Does Not Validate Message Sender
- **Files**: `extension/entrypoints/content.ts:100`, `extension/entrypoints/video-subtitle-hook.content.ts:43`
- **Issue**: Message handlers in content scripts accept messages from any extension or webpage (via `chrome.runtime.onMessage`). A malicious page could send `toggle-translation` or `toggle-subtitles` messages.
- **Fix**: Validate `_sender.id` matches the extension's own ID:
  ```ts
  if (_sender.id !== chrome.runtime.id) return;
  ```

### HIGH-7: Book Hash Collision Risk
- **File**: `extension/lib/storage/reading-progress-store.ts:36-43`
- **Issue**: Same 32-bit hash as the translation cache. Two different books with similar titles/authers can collide, causing wrong reading progress to be loaded.
- **Fix**: Use SHA-256 or at minimum include more distinguishing data (file size, chapter count).

---

## Medium Priority

### MED-1: DRY Violation - buildSystemPrompt Duplicated 6 Times
- **Files**: `glm-provider.ts`, `groq-provider.ts`, `qwen-provider.ts` (both extension/ and proxy-server/)
- **Issue**: Identical `buildSystemPrompt` function copy-pasted across 6 files. The Gemini `buildPrompt` is also identical logic with different format.
- **Fix**: Extract shared prompt builder to a common utility:
  ```ts
  // extension/lib/utils/prompt-builder.ts
  export function buildTranslationPrompt(text: string, from: string, to: string): string { ... }
  ```

### MED-2: `updateSettings` Race Condition
- **File**: `extension/lib/storage/settings-store.ts:37-55`
- **Issue**: `updateSettings` reads current state with `get()`, merges, then writes. If two rapid calls happen (e.g., user clicks two settings quickly), the second may read stale state before the first write completes. Zustand's `set` is synchronous but `chrome.storage.local.set` is async.
- **Fix**: Queue writes or use a lock:
  ```ts
  let writeLock = Promise.resolve();
  async updateSettings(partial) {
    // ...
    set(updated);
    writeLock = writeLock.then(() => chrome.storage.local.set({ settings: updated }));
    await writeLock;
  }
  ```

### MED-3: No Timeout on Direct API Provider Calls
- **Files**: `extension/lib/providers/gemini-provider.ts`, `glm-provider.ts`, `groq-provider.ts`, `qwen-provider.ts`
- **Issue**: Direct `fetch()` calls to AI providers have no timeout. If a provider hangs, the user sees no response and no error. The proxy client has a 30s timeout but direct calls do not.
- **Fix**: Add `AbortController` with timeout to all direct provider calls, matching the proxy client pattern.

### MED-4: `fileData` Re-parsed on Every Render in PDF Reader
- **File**: `extension/entrypoints/sidepanel/pdf-reader.tsx:29-32`
- **Issue**: `renderPdfPage` is called in a `useEffect` that depends on `[fileData, currentPage, scale]`. Since `fileData` is an `ArrayBuffer` (reference type), this works correctly. But the PDF document is re-loaded from scratch on every page/scale change (same as HIGH-2).

### MED-5: Subtitle Translator Does Not Handle Error Responses
- **File**: `extension/lib/translators/subtitle-translator.ts:31`
- **Issue**: `response.translations ?? texts` silently falls back to original text on error. If the background returns `{ error: 'All providers failed' }`, `response.translations` is undefined and the user sees original text as "translation" with no error indication.
- **Fix**: Check for `response.error` and surface it:
  ```ts
  if (response.error) throw new Error(response.error);
  ```

### MED-6: EPUB Export CSS Injection Without Scoping
- **File**: `extension/lib/exporters/epub-exporter.ts:81`
- **Issue**: Exported bilingual EPUBs use inline `style.cssText` with hardcoded colors (`#1a73e8`). This may clash with the book's existing CSS. No dark mode support in exported files.
- **Fix**: Use a class name that's less likely to clash (e.g., `ait-translated-bilingual`) and consider adding a small `<style>` block to the EPUB's CSS file.

### MED-7: MutationWatcher Debounce Accumulates Stale Elements
- **File**: `extension/lib/translators/mutation-watcher.ts:40-42`
- **Issue**: Each mutation batch creates a new timeout, replacing the previous one. Elements from the first batch are lost if a second batch arrives within the debounce window. The callback receives only the latest batch of elements.
- **Fix**: Accumulate elements across debounce windows:
  ```ts
  private pending: HTMLElement[] = [];
  private debouncedCallback(elements: HTMLElement[]) {
    this.pending.push(...elements);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      const batch = this.pending;
      this.pending = [];
      this.callback(batch);
    }, DEBOUNCE_MS);
  }
  ```

### MED-8: Proxy Error Response Leaks API Provider Error Details
- **File**: `extension/proxy-server/src/providers/*.ts` (all)
- **Issue**: Error messages include full API response body (e.g., `Gemini API error 403: { "error": { "message": "API key not valid...", "status": "INVALID_ARGUMENT" }}`). These are returned to the client, exposing internal API structure.
- **Fix**: Log full error server-side, return generic message to client:
  ```ts
  console.error(`Gemini API error: ${errBody}`);
  throw new Error('Translation provider unavailable');
  ```

### MED-9: `handleSave` in API Keys Section Does Nothing
- **File**: `extension/entrypoints/options/sections/api-keys-section.tsx:28`
- **Issue**: `handleSave` just sets `saved = true` for UI feedback but keys are already persisted on every keystroke via `updateSettings`. The "Save Keys" button is misleading -- it implies keys aren't saved until you click it.
- **Fix**: Either remove the button (keys are auto-saved) or change `handleChange` to not persist immediately and only persist on "Save Keys" click.

### MED-10: Video Subtitle Renderer Uses requestAnimationFrame Continuously
- **File**: `extension/lib/translators/dual-subtitle-renderer.ts:74-79`
- **Issue**: `requestAnimationFrame` runs at 60fps even when video is paused or no subtitle is active. This wastes CPU/battery. The `find()` in `updateDisplay` also does a linear scan over all subtitles every frame.
- **Fix**: Use `timeupdate` event on the video element instead, or at minimum pause the animation loop when video is paused. For subtitle lookup, use binary search or maintain a current-index pointer.

---

## Low Priority

### LOW-1: Unused `cn` Utility
- **File**: `extension/lib/utils/cn.ts`
- **Issue**: The `cn` function exists but is not imported anywhere. All components use raw template literal className strings.
- **Fix**: Remove or adopt consistently.

### LOW-2: `sites-section.tsx` Uses Array Index as Key
- **File**: `extension/entrypoints/options/sections/sites-section.tsx:38`
- **Issue**: `key={i}` on the site list items. While functional, it can cause subtle reorder bugs if items are removed.
- **Fix**: Use the site pattern string as key.

### LOW-3: No `return true` in Video Subtitle Message Listener for Non-Matching Messages
- **File**: `extension/entrypoints/video-subtitle-hook.content.ts:53`
- **Issue**: `return true` is only inside the `toggle-subtitles` branch. If the message doesn't match, the listener returns `undefined`, which is fine but inconsistent with the pattern in `content.ts` which always returns `true`.
- **Fix**: Move `return true` outside the `if` block.

### LOW-4: `ProxySection` "Built-in" Label Inconsistency
- **File**: `extension/entrypoints/options/sections/proxy-section.tsx:39`
- **Issue**: Button says "Built-in Proxy" but description says "Uses built-in AI (Qwen)". If user configures a custom proxy URL pointing to a different provider, the label is misleading.
- **Fix**: Rename to "Proxy Server" or make the label dynamic.

### LOW-5: EPUB Parser TOC Extraction Relies on Order
- **File**: `extension/lib/parsers/epub-parser.ts:152`
- **Issue**: `for (let i = 0; i < links.length && i < chapters.length; i++)` assumes TOC links map 1:1 to chapters by index. Many EPUBs have TOC entries that skip chapters or have nested structures.
- **Fix**: Match TOC links to chapters by `href` attribute instead of index.

---

## Edge Cases Found by Scout

1. **SPA Navigation**: Content script registers mutation watcher but does not handle `popstate` or `pushState` navigation. On SPA route changes, the watcher continues observing the old container. The `startTranslation()` function should be re-called on URL changes.

2. **Concurrent Translation Triggers**: `epub-reader.tsx` useEffect for translation (line 46) has `[epub, currentChapter]` deps. Rapid chapter switching can cause race conditions where translations arrive out of order. No cancellation of in-flight requests.

3. **Empty API Key Handling**: In BYOK mode, if all API keys are empty strings, the provider registry attempts proxy first, then direct (throws "No API key for X"), then fallback chain (all throw). The final error "All providers failed" is unhelpful -- should detect empty keys upfront.

4. **Side Panel Open in New Tab**: `sidepanel/App.tsx:86` calls `chrome.tabs.create({ url: chrome.runtime.getURL('/sidepanel.html') })`. The `/sidepanel.html` path may not be listed in `web_accessible_resources`, causing a 404 or blank page.

5. **Proxy URL Not Validated**: `proxy-section.tsx` accepts any URL. A user could enter `file:///etc/passwd` or `javascript:alert(1)`. While `fetch()` would reject these, the UI should validate the URL format.

6. **IndexedDB Not Closed**: `translation-cache.ts` opens an IDB connection that is never closed. In content scripts that may be injected/removed frequently, this could leak connections.

---

## Positive Observations

1. **Clean Provider Abstraction**: The provider registry with fallback chain is well-designed. Adding a new provider requires only implementing the translate function.
2. **Proper Chrome Extension Patterns**: Correct use of `defineBackground`, `defineContentScript`, message passing with `return true` for async responses.
3. **Good Separation**: Parsers, translators, renderers, and storage are cleanly separated modules.
4. **Translation Queue**: Well-designed batch + debounce + priority system for content script translations.
5. **TypeScript Strictness**: `tsconfig.json` enables `strict: true`, and the codebase generally respects it.
6. **Error Boundaries**: Most async operations have try/catch with user-visible error states.
7. **Content Script Safety**: Uses `textContent` (not `innerHTML`) for inserting translations -- good XSS prevention.
8. **KV Cache on Proxy**: Server-side cache uses SHA-256 for proper collision resistance with TTL.

---

## Recommended Actions

1. **CRIT-1**: Move Gemini API key from URL to header (both client and server)
2. **CRIT-2**: Restrict CORS to extension origins, not `*`
3. **CRIT-3**: Read target language from settings in subtitle/epub/pdf translators
4. **CRIT-4**: Replace 32-bit hash with SHA-256 in translation cache
5. **CRIT-5**: Add input validation on proxy server request body
6. **HIGH-1**: Fix event listener leak in hover mode renderer
7. **HIGH-2**: Cache PDF document object across page renders
8. **HIGH-4**: Add concurrency limiting to batch translate fallback
9. **HIGH-6**: Validate message sender in content scripts
10. **MED-1**: Extract shared prompt builder (6-copy DRY violation)
11. **MED-7**: Fix MutationWatcher to accumulate pending elements
12. **MED-8**: Sanitize proxy error responses before returning to client

---

## Metrics
- **Type Coverage**: ~90% (few `as` casts, mostly safe)
- **Test Coverage**: 0% (no test files found for extension code)
- **Linting Issues**: 0 (not checked -- no lint config found)
- **Security Issues**: 5 critical, 7 important
- **DRY Violations**: 1 major (6x duplicated prompt builder)

## Unresolved Questions

1. Is `EXTENSION_SECRET` intended to be set in production? If not, the proxy is fully open.
2. Is there a plan for the extension to authenticate with the proxy (e.g., per-user tokens)?
3. Why is the translation cache hash 32-bit while the server uses SHA-256? Was this intentional for performance?
4. Are there plans for automated tests for the extension code?
5. Does the `sidepanel.html` path need to be added to `web_accessible_resources` in the manifest?
