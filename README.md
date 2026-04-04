# AI Translation Platform

Free AI-powered translation platform with web app, Chrome extension, and proxy server.

## Architecture

```
AI-Translation-Platform/
├── web-app/          Next.js 14 — file translation (EPUB, PDF, DOCX, TXT)
├── extension/        Chrome Extension (WXT + React 19) — web & video translation
└── extension/proxy-server/   Cloudflare Worker — shared proxy with caching
```

## Features

### Web App
- Upload & translate EPUB, PDF, DOCX, TXT files
- **EPUB export preserving original format** (bilingual or translated-only)
- Smart chunking for large documents (50MB+)
- Real-time progress tracking
- Redis cache (Upstash) + rate limiting
- Dark/Light theme, i18n (EN/VI)

### Chrome Extension
- **Web translation**: 3 modes (below, hover, side-by-side), SPA support
- **Video subtitles**: YouTube, Udemy, Coursera, any HTML5 video with tracks
- **ePub reader**: chapter navigation, TOC, bilingual display, EPUB export
- **PDF reader**: canvas rendering, zoom, translation overlay
- Dual mode: Free BYOK (your keys) or Built-in proxy (no key needed)

### AI Providers

| Provider | Web App | Extension | API Format |
|----------|---------|-----------|------------|
| OpenRouter | ✅ | — | OpenAI-compatible |
| Qwen (AlibabaCloud) | ✅ | ✅ | OpenAI-compatible |
| Groq (Llama) | ✅ | ✅ | OpenAI-compatible |
| GLM (ChatGLM) | ✅ | ✅ | OpenAI-compatible |
| Gemini (Google) | ✅ | ✅ | Custom REST |

All providers support API key rotation (up to 20 keys each) with automatic fallback.

## Tech Stack

| Component | Stack | Deploy |
|-----------|-------|--------|
| Web App | Next.js 14, React 19, TailwindCSS, Zustand, Upstash Redis | Vercel (free) |
| Extension | WXT 0.20, React 19, TailwindCSS, IndexedDB, JSZip | Chrome Web Store |
| Proxy | Cloudflare Workers, KV cache, rate limiting | Cloudflare (free) |

## Quick Start

### Web App

```bash
cd web-app
npm install
cp .env.example .env.local  # Add API keys
npm run dev                  # http://localhost:3000
```

**Environment variables:**
```env
OPENROUTER_API_KEY_1=sk-or-...
QWEN_API_KEY_1=sk-...
GROQ_API_KEY_1=gsk_...
GLM_API_KEY_1=...
GEMINI_API_KEY_1=AIza...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

### Chrome Extension

```bash
cd extension
npm install
npm run dev     # Load .output/chrome-mv3 in chrome://extensions
```

Configure API keys in extension Settings page (Options → API Keys).

### Proxy Server

```bash
cd extension/proxy-server
npm install
wrangler secret put GEMINI_API_KEY
wrangler secret put GLM_API_KEY
wrangler secret put QWEN_API_KEY    # Primary provider
wrangler dev                         # Local dev
wrangler deploy                      # Deploy to Cloudflare
```

## Development

```bash
# Web app
cd web-app && npm run dev

# Extension (hot reload)
cd extension && npm run dev

# Proxy (local)
cd extension/proxy-server && npm run dev
```

## License

MIT
