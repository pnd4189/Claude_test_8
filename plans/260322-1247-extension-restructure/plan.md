---
status: complete
created: 2026-03-22
branch: claude/translation-platform-setup-011CV1WzhyEsboaayPTmcVnM
completed: 2026-03-22
---

# AI Translation Chrome Extension - Full Restructure Plan

## Overview

Rebuild AI Translation Platform from Next.js web app + basic extension into a **standalone Chrome Extension** with Immersive Translate-like features: bilingual webpage translation, video subtitles, ePub/PDF translation.

## Architecture

Extension-only (WXT + React 19) + Cloudflare Worker proxy for API key security.
AI Providers: Gemini API + GLM API (OpenAI-compatible). Languages: EN↔VI, ZH↔VI.

## Reports

- [Brainstorm](../reports/brainstorm-260322-1247-ai-translation-extension-restructure.md)
- [Research](../reports/researcher-260322-1245-immersive-translate-analysis.md)

## Phases

| # | Phase | Priority | Status | Effort |
|---|-------|----------|--------|--------|
| 1 | [WXT Project Setup & Core Infrastructure](phase-01-wxt-setup-core-infrastructure.md) | Critical | complete | 1-2 days |
| 2 | [Cloudflare Worker Proxy & AI Providers](phase-02-cloudflare-proxy-ai-providers.md) | Critical | complete | 1-2 days |
| 3 | [Webpage Bilingual Translation](phase-03-webpage-bilingual-translation.md) | P0 | complete | 2-3 days |
| 4 | [Video Subtitle Translation](phase-04-video-subtitle-translation.md) | P1 | complete | 2-3 days |
| 5 | [ePub Translation & Reader](phase-05-epub-translation-reader.md) | P2 | complete | 2-3 days |
| 6 | [PDF Translation & Reader](phase-06-pdf-translation-reader.md) | P3 | complete | 2-3 days |
| 7 | [Testing, Polish & Packaging](phase-07-testing-polish-packaging.md) | High | complete | 1-2 days |

## Dependency Graph

```
Phase 1 (WXT Setup) ──┐
                       ├──→ Phase 3 (Webpage Translation) ──→ Phase 4 (Video Subtitles)
Phase 2 (Proxy/AI) ───┘                                   ──→ Phase 5 (ePub)
                                                           ──→ Phase 6 (PDF)
                                                                      ↓
                                                              Phase 7 (Polish)
```

Phases 1 & 2 run in parallel. Phases 3-6 depend on both 1 & 2. Phase 3 first (foundation patterns), then 4-6 can parallel. Phase 7 last.

## Key Decisions

- **Drop**: Next.js web app, Upstash Redis, Vercel, Webpack, Preact
- **Keep**: text-chunker logic, file parser concepts, cache key strategy
- **New**: WXT, React 19, Tailwind 4, shadcn/ui, Cloudflare Worker, IndexedDB
- **UI**: Popup for controls, Side Panel + new tab for PDF/ePub reader
