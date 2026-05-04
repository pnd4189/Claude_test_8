# System Architecture — AI Translation Platform

> Last updated: 2026-05-04

## High-Level Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Web App       │     │  Chrome Extension │     │  Proxy Server   │
│   (Next.js 16)  │     │  (WXT + React 19) │     │  (CF Workers)   │
│                 │     │                   │     │                 │
│ • File upload   │     │ • Web translation │     │ • AI proxy      │
│ • Translation   │     │ • Video subtitles │     │ • KV caching    │
│ • File export   │     │ • EPUB/PDF reader │     │ • Rate limiting  │
└────────┬────────┘     └────────┬──────────┘     └────────┬────────┘
         │                       │                         │
         ▼                       ▼                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        AI Providers                                  │
│  FreeLLMAPI │ OpenRouter │ Qwen │ Groq │ GLM (ChatGLM) │ Gemini (Google) │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Communication

- **Web App** → Direct API calls to AI providers (server-side)
- **Extension** → Direct API calls (BYOK mode) OR via Proxy Server (built-in mode)
- **Proxy Server** → Forwards requests to AI providers, caches responses in KV
- **FreeLLMAPI** → Self-hosted on miniPC via Cloudflare Tunnel; #1 priority in fallback chain; aggregates 11 free-tier providers (~1B tokens/month)

## Data Flow

### File Translation (Web App)

```
Upload → Parse (PDF/EPUB/DOCX/TXT) → Chunk → Translate (provider chain) → Export
```

### Web Translation (Extension)

```
Content script detects text → Paragraph collector → Translation queue → Bilingual renderer → DOM injection
```

### Video Subtitles (Extension)

```
Platform detector → Subtitle/track extractor → Subtitle translator → Dual subtitle renderer
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Separate provider impls (web vs ext) | Different runtimes: Node.js server vs browser |
| Provider fallback chain | Resilience when one provider is down |
| API key rotation (up to 20) | Distribute load, avoid rate limits |
| KV cache in proxy | Reduce AI API costs, faster responses |
| IndexedDB in extension | Persist settings, translations, reading progress client-side |
| Upstash Redis in web app | Server-side caching, rate limiting |
| SHA-256 cache keys | Collision-free key generation for translation cache |
| Provider singleton caching | Reuse provider instances, avoid repeated initialization |

## Security

| Layer | Measure | Detail |
|-------|---------|--------|
| Proxy | CORS restriction | Only `chrome-extension://` and `chromiumapp.org` origins |
| Proxy | EXTENSION_SECRET | Required header for all proxy requests; 500 if missing |
| Web app | Security headers | CSP, HSTS, X-Frame-Options, X-Content-Type-Options |
| Content scripts | sender.id validation | Only process messages from own extension ID |
| Cache clear | Bearer token auth | ADMIN_SECRET required for `POST /api/cache/clear` |
| Input | Validation | Language codes (ISO), text length, provider enum, batch limits |
| YouTube | SSRF prevention | Caption URL validation, no arbitrary fetch |
| Errors | Sanitization | Internal details (provider names, stack traces) never exposed to clients |

## State Management

| Component | Store | Persistence |
|-----------|-------|-------------|
| Web App | Zustand (3 stores) | Redis cache |
| Extension | Zustand (settings, progress) | IndexedDB |
| Proxy | Stateless | Cloudflare KV |
| Shared | logger utility | Console (structured) |

## API Routes (Web App)

| Route | Purpose |
|-------|---------|
| `POST /api/translate` | File/text translation |
| `GET /api/providers` | List available providers |
| `GET /api/providers/openrouter/models` | Fetch OpenRouter models |
| `POST /api/cache/clear` | Clear Redis cache |
| `GET /api/cron/refresh-models` | Scheduled model list refresh |
