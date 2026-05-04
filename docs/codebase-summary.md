# Codebase Summary — AI Translation Platform

> Last updated: 2026-05-04

## Overview

Free AI-powered translation platform with 3 components: Next.js web app, Chrome extension (WXT + React 19), and Cloudflare Worker proxy server. Supports EPUB/PDF/DOCX/TXT file translation, web page translation, video subtitles, and dual AI provider modes (BYOK or proxy).

## Architecture

```
AI-Translation-Platform/
├── web-app/                     Next.js 16 — file translation UI + API
│   ├── app/                     App Router: pages, API routes, i18n
│   ├── components/              10 UI components (upload, progress, settings)
│   ├── lib/                     Core logic: providers, parsers, exporters, chunking
│   ├── store/                   Zustand stores (provider, settings, translation)
│   └── messages/                EN/VI locale files
├── extension/                   Chrome Extension (WXT + React 19)
│   ├── entrypoints/             popup, options, sidepanel, content scripts
│   ├── lib/                     translators, parsers, providers, storage, utils
│   └── proxy-server/            Cloudflare Worker — shared AI proxy with KV cache
└── docs/                        Project documentation
```

## Component Details

### Web App (`web-app/`)

| Area | Files | Key Tech |
|------|-------|----------|
| Pages & API routes | 8 | Next.js 16 App Router, next-intl |
| Components | 10 | React 19, Tailwind CSS 4 |
| Providers | 9 | FreeLLMAPI, OpenRouter, Qwen, Groq, GLM, Gemini |
| Shared utilities | 3 | logger, translation-prompt, model-filters |
| File parsers | 4 | pdf-parse, mammoth, epub, JSZip |
| Exporters | 1 | EPUB bilingual/translated export |
| Stores | 3 | Zustand 5 |

**Key features:** File upload & translation (EPUB/PDF/DOCX/TXT), smart chunking for 50MB+ files, real-time progress, API key rotation (up to 20 keys), Redis cache + rate limiting, dark/light theme, EN/VI i18n.

### Chrome Extension (`extension/`)

| Area | Files | Key Tech |
|------|-------|----------|
| Entrypoints | 12 | WXT 0.20, React 19 |
| Translators | 9 | Content detection, bilingual rendering, queue |
| Providers | 8 | FreeLLMAPI, Qwen, Groq, GLM, Gemini, proxy client |
| Shared utilities | 6 | logger, prompt-builder, text-chunker, language-detector, cn, message-types |
| Parsers | 4 | EPUB, PDF, subtitles |
| Storage | 3 | IndexedDB (idb), reading progress |
| Platform hooks | 3 | YouTube, HTML5 video, platform detection |

**Key features:** Web translation (3 modes: below/hover/side-by-side), SPA support, video subtitles (YouTube/Udemy/Coursera/HTML5), EPUB reader with TOC + bilingual display, PDF reader with canvas rendering + translation overlay, dual mode (BYOK or proxy).

### Proxy Server (`extension/proxy-server/`)

| Area | Files | Key Tech |
|------|-------|----------|
| Core | 4 | Cloudflare Workers, KV cache, rate limiter, prompt-builder |
| Providers | 5 | FreeLLMAPI, Qwen, Groq, GLM, Gemini |

**Key features:** Shared AI proxy with KV caching, rate limiting, multi-provider support, deployed to Cloudflare Workers (free tier).

## AI Provider Support

| Provider | Web App | Extension | Proxy | API Format |
|----------|---------|-----------|-------|------------|
| FreeLLMAPI | Yes | Yes | Yes | OpenAI-compatible |
| OpenRouter | Yes | — | — | OpenAI-compatible |
| Qwen (AlibabaCloud) | Yes | Yes | Yes | OpenAI-compatible |
| Groq (Llama) | Yes | Yes | Yes | OpenAI-compatible |
| GLM (ChatGLM) | Yes | Yes | Yes | OpenAI-compatible |
| Gemini (Google) | Yes | Yes | Yes | Custom REST |

FreeLLMAPI là self-hosted proxy chạy trên miniPC, gom 11 free-tier provider (~1B tokens/tháng). #1 priority trong fallback chain — các provider còn lại làm fallback khi miniPC offline.

All providers support API key rotation (up to 20 keys) with automatic fallback chain.

## Tech Stack

| Area | Technology |
|------|------------|
| Web framework | Next.js 16 (App Router) |
| UI | React 19.2, Tailwind CSS 4 |
| Language | TypeScript 5 |
| State | Zustand 5 |
| Extension | WXT 0.20 |
| Proxy | Cloudflare Workers + KV |
| Caching | Upstash Redis (web), CF KV (proxy) |
| i18n | next-intl 4.5 (web), Chrome _locales (ext) |
| Doc parsing | pdf-parse, mammoth, epub, pdfjs-dist, JSZip |

## Statistics

| Metric | Value |
|--------|-------|
| Source files | ~100 |
| Lines of code | ~8,200 |
| Components | 3 (web-app, extension, proxy-server) |
| AI providers | 6 |
| Languages supported | EN, VI (UI) |

## Notes

- Web-app and extension have separate provider implementations (different runtime constraints: server-side vs browser)
- No test files found — testing strategy not yet implemented
- EPUB exporter exists in both web-app and extension (shared logic, different environments)
- Shared utilities extracted for DRY: translation prompt, model filters, prompt builder, logger
- Security hardened: CORS restricted to extension origins, input validation on all endpoints, security headers, sender.id validation in content scripts, error sanitization
