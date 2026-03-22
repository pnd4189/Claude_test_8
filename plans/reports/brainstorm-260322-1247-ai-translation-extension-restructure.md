# Brainstorm: AI Translation Chrome Extension - Full Restructure

**Date:** 2026-03-22
**Status:** Agreed
**Scope:** Drop web app, rebuild as extension-only with Immersive Translate-like features

---

## Problem Statement

Current project is a Next.js web app + basic Chrome extension (text selection only). Need to restructure into a **standalone Chrome Extension** with:
- Bilingual webpage translation (like Immersive Translate)
- Video subtitle translation (YouTube, Coursera, Udemy)
- PDF file translation with layout preservation
- ePub eBook bilingual reading
- AI providers: Gemini API + GLM API (OpenAI-compatible at `https://api.z.ai/api/coding/paas/v4`)

---

## Architecture Decision

### Extension-Only + Lightweight Proxy

```
┌─────────────────────────────────────┐
│         Chrome Extension (WXT)       │
│  ┌──────────┐  ┌──────────────────┐ │
│  │  Popup   │  │  Content Scripts  │ │
│  │ Settings │  │  - Page Translator│ │
│  │ Controls │  │  - Subtitle Hook  │ │
│  └──────────┘  │  - PDF Viewer     │ │
│                │  - ePub Reader    │ │
│  ┌──────────┐  └──────────────────┘ │
│  │  Service  │                       │
│  │  Worker   │  ┌──────────────────┐ │
│  │  (bg)     │  │  Storage Layer   │ │
│  └──────────┘  │  IndexedDB+Chrome │ │
│                └──────────────────┘ │
└───────────────┬─────────────────────┘
                │
    ┌───────────▼───────────┐
    │   Proxy API Server    │
    │  (Cloudflare Worker)  │
    │  - Hides API keys     │
    │  - Rate limiting      │
    │  - Usage tracking     │
    │  - Cache layer        │
    └───────────┬───────────┘
                │
    ┌───────────▼───────────┐
    │    AI Providers        │
    │  ┌─────┐  ┌─────┐    │
    │  │Gemini│  │ GLM │    │
    │  └─────┘  └─────┘    │
    │  (extensible for      │
    │   future providers)   │
    └───────────────────────┘
```

### Why Cloudflare Worker as Proxy
- **Security**: API keys never exposed to client/extension
- **Free tier**: 100K requests/day, generous for personal/small team use
- **Edge**: Low latency globally
- **Rate limiting**: Built-in via Cloudflare
- **Cache**: KV storage for translation cache (replaces Upstash Redis)
- **Fallback**: User can optionally provide own API key for direct calls

---

## Tech Stack (March 2026)

| Layer | Technology | Why |
|-------|-----------|-----|
| Extension Framework | **WXT** (latest) | Vite-based, 43% smaller bundles, framework-agnostic, best HMR, actively maintained |
| UI Framework | **React 19** + **Tailwind CSS 4** | Modern, fast, utility-first |
| UI Components | **shadcn/ui** (headless) | Accessible, customizable, no bloat |
| State Management | **Zustand** | Lightweight, already familiar |
| Build Tool | **Vite** (via WXT) | Fast builds, native ESM |
| Language | **TypeScript 5** | Type safety |
| Proxy Server | **Cloudflare Worker** | Edge compute, free tier, KV cache |
| PDF Parsing | **PDF.js** (Mozilla) | Industry standard, maintained |
| ePub Parsing | **epub.js** or **JSZip + DOMParser** | Browser-native ePub handling |
| Video Subtitles | **YouTube Transcript API** + HTML5 track hooks | Platform-specific extraction |
| Translation Cache | **IndexedDB** (extension) + **Cloudflare KV** (server) | Dual-layer caching |
| Testing | **Vitest** | Fast, Vite-native |

---

## Feature Breakdown

### 1. Webpage Bilingual Translation (P0 - Highest Priority)

**How it works:**
- Content script injects into all web pages
- Detects main content areas (article, main, .content, etc.)
- Translates paragraph-by-paragraph
- Displays bilingual: original text + translated text below each paragraph
- MutationObserver watches for dynamic content (SPA, infinite scroll)

**Key implementation details:**
- Paragraph-level granularity (not word/sentence) for semantic coherence
- Debounce translations (600ms) to avoid API spam
- Lazy translate: only visible paragraphs (IntersectionObserver)
- Skip code blocks, math formulas, proper nouns
- CSS injection for bilingual display styles (configurable: below, hover, side-by-side)
- Site-specific optimizations for popular sites (Google, Twitter, Reddit)

**Translation display modes:**
1. **Below original** (default): Translated text appears under each paragraph
2. **Hover tooltip**: Show translation on hover
3. **Side-by-side**: Two columns (for wide screens)

### 2. Video Subtitle Translation (P1)

**Supported platforms:**
- **YouTube**: Fetch via Transcript API (`/api/timedtext`)
- **Coursera**: Hook into `<track>` elements
- **Udemy**: Hook into `<track>` elements
- **Generic HTML5 video**: Any site with `<track kind="subtitles">`

**How it works:**
- Content script detects video player on page
- Extracts subtitle/caption data from platform-specific sources
- Batch translates all captions (not real-time per caption)
- Renders dual subtitle overlay synchronized with playback
- Original subtitle on top, translated below (or configurable)

**Key patterns:**
- YouTube: `GET /api/timedtext?v={videoId}&lang={lang}` returns timed text XML
- HTML5: Parse `<track>` VTT/SRT content
- Timing sync: Map translated text to original timestamps
- Font size/position customizable

### 3. ePub eBook Translation (P2)

**How it works:**
- User opens ePub file via extension popup or drag-drop
- Parse ePub (ZIP containing XHTML chapters)
- Extract text chapter-by-chapter
- Translate and display bilingual (original + translated)
- Render in extension's built-in reader (Side Panel or new tab)

**Implementation:**
- JSZip to unpack ePub
- DOMParser to parse XHTML chapters
- Chapter-level translation for context
- Reading progress saved to IndexedDB
- Export bilingual ePub option

### 4. PDF File Translation (P3)

**How it works:**
- User opens PDF via extension
- PDF.js renders and extracts text blocks with positioning
- Translate text blocks preserving layout
- Display bilingual PDF (original + translated overlay)
- Option to download bilingual PDF

**Implementation:**
- PDF.js for rendering and text extraction
- Text layer overlay with translations
- Preserve tables, images, formulas
- Page-by-page translation with progress

---

## AI Provider Architecture

### Provider Interface (Strategy Pattern)

```typescript
interface TranslationProvider {
  id: string;
  name: string;
  translate(text: string, from: string, to: string): Promise<string>;
  batchTranslate(texts: string[], from: string, to: string): Promise<string[]>;
  isAvailable(): Promise<boolean>;
}
```

### Gemini Provider
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- Free tier: 15 RPM, 1M tokens/day
- Best for: General translation, context-aware

### GLM Provider
- Endpoint: `https://api.z.ai/api/coding/paas/v4`
- OpenAI-compatible format (messages, model, temperature)
- Good for: Chinese ↔ Vietnamese translation

### Adding New Providers
- Implement `TranslationProvider` interface
- Register in provider registry
- Automatic fallback chain: Gemini → GLM → next provider

### Proxy Server Endpoints

```
POST /api/translate
  { text, from, to, provider? }
  → { translated, provider, cached }

POST /api/translate/batch
  { texts[], from, to, provider? }
  → { translated[], provider }

GET /api/providers
  → { providers[], status }
```

---

## Languages

| Direction | Use Case |
|-----------|----------|
| EN → VI | English content → Vietnamese |
| VI → EN | Vietnamese content → English |
| ZH → VI | Chinese content → Vietnamese |
| VI → ZH | Vietnamese content → Chinese |

Auto-detect source language via Gemini/GLM (send first 500 chars for detection).

---

## Migration Plan from Current Project

### What to Keep
- `lib/text-chunker.ts` - Smart text chunking logic
- `lib/file-parsers/` - EPUB, PDF, DOCX parsing logic (adapt for extension)
- `lib/api-key-rotator.ts` - Key rotation concept (move to proxy)
- Translation prompt templates
- Cache key hashing strategy

### What to Drop
- Next.js web app entirely
- Upstash Redis (replace with Cloudflare KV)
- Vercel deployment config
- Web app UI components
- next-intl i18n (use chrome.i18n instead)

### What to Build New
- WXT project structure
- Content scripts (webpage translator, subtitle hook)
- Popup UI (React + shadcn/ui)
- Cloudflare Worker proxy
- Provider abstraction layer
- IndexedDB cache layer
- PDF viewer (PDF.js integration)
- ePub reader
- Chrome side panel (for PDF/ePub reading)

---

## Project Structure (Proposed)

```
ai-translation-extension/
├── wxt.config.ts                    # WXT configuration
├── package.json
├── tsconfig.json
│
├── entrypoints/
│   ├── popup/                       # Popup UI
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.html
│   │
│   ├── background.ts               # Service worker
│   │
│   ├── content-scripts/
│   │   ├── webpage-translator.ts    # Bilingual page translation
│   │   ├── video-subtitle-hook.ts   # Video subtitle translation
│   │   └── index.ts                 # Content script entry
│   │
│   └── sidepanel/                   # Side panel (PDF/ePub reader)
│       ├── App.tsx
│       ├── main.tsx
│       └── index.html
│
├── components/                      # Shared UI components
│   ├── language-selector.tsx
│   ├── provider-selector.tsx
│   ├── translation-toggle.tsx
│   └── settings-panel.tsx
│
├── lib/
│   ├── providers/
│   │   ├── types.ts                 # Provider interfaces
│   │   ├── provider-registry.ts     # Provider management
│   │   ├── gemini-provider.ts       # Gemini API
│   │   ├── glm-provider.ts          # GLM API (z.ai)
│   │   └── proxy-client.ts          # Proxy server client
│   │
│   ├── translators/
│   │   ├── webpage-translator.ts    # DOM translation logic
│   │   ├── subtitle-translator.ts   # Video subtitle logic
│   │   ├── pdf-translator.ts        # PDF translation logic
│   │   └── epub-translator.ts       # ePub translation logic
│   │
│   ├── parsers/
│   │   ├── pdf-parser.ts            # PDF.js wrapper
│   │   ├── epub-parser.ts           # ePub parser
│   │   └── subtitle-parser.ts       # VTT/SRT parser
│   │
│   ├── platform-hooks/
│   │   ├── youtube.ts               # YouTube subtitle extraction
│   │   ├── coursera.ts              # Coursera subtitle hooks
│   │   ├── udemy.ts                 # Udemy subtitle hooks
│   │   └── generic-html5.ts         # Generic HTML5 video
│   │
│   ├── utils/
│   │   ├── text-chunker.ts          # Smart text splitting
│   │   ├── language-detector.ts     # Auto language detection
│   │   ├── dom-utils.ts             # DOM manipulation helpers
│   │   └── cache.ts                 # IndexedDB cache layer
│   │
│   └── storage/
│       ├── settings-store.ts        # Extension settings (Zustand)
│       └── translation-cache.ts     # Translation cache (IndexedDB)
│
├── styles/
│   ├── bilingual.css                # Bilingual display styles
│   ├── subtitle-overlay.css         # Video subtitle styles
│   └── popup.css                    # Popup styles
│
├── proxy-server/                    # Cloudflare Worker
│   ├── src/
│   │   ├── index.ts                 # Worker entry
│   │   ├── providers/
│   │   │   ├── gemini.ts
│   │   │   └── glm.ts
│   │   ├── cache.ts                 # KV cache
│   │   └── rate-limiter.ts
│   ├── wrangler.toml                # Cloudflare config
│   └── package.json
│
├── _locales/                        # Chrome i18n
│   ├── en/messages.json
│   └── vi/messages.json
│
└── public/
    ├── icons/
    └── manifest.json                # Generated by WXT
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| WXT learning curve | Low | Good docs, similar to Vite projects |
| Manifest V3 service worker limits | Medium | Use chrome.storage + alarms for persistence |
| YouTube API changes | Medium | Fallback to page scraping, version detection |
| API rate limits (Gemini free tier) | Medium | Cache aggressively, batch translations, fallback to GLM |
| Extension size (PDF.js is large) | Medium | Lazy load PDF.js only when needed |
| DRM ePub books | Low | Skip DRM, document limitation |

---

## Success Metrics

- [ ] Webpage translation works on top 20 popular sites
- [ ] YouTube subtitle translation with <2s delay
- [ ] PDF translation preserves 90%+ layout
- [ ] ePub bilingual reading with chapter navigation
- [ ] Extension size < 5MB (excluding lazy-loaded modules)
- [ ] Translation latency < 3s per paragraph
- [ ] Cache hit rate > 60% for repeated content

---

## Unresolved Questions

1. ~~Should PDF/ePub reader open in Side Panel or new tab?~~ **Resolved: Both — default Side Panel + "Open in new tab" button**
2. Gemini free tier limits — 15 RPM enough for full-page translation?
3. GLM API rate limits and pricing?
4. Should we support offline translation (local models)?
5. Image/manga translation (OCR) — future scope?
