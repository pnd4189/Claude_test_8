---
status: complete
created: 2026-04-02
completed: 2026-04-02
branch: claude/translation-platform-setup-011CV1WzhyEsboaayPTmcVnM
---

# Hybrid AI Provider System - Phase 1

## Overview

Add Groq + Qwen providers to Chrome Extension and Proxy Server. Enable hybrid mode: Free BYOK (user's own keys) + Paid Built-in (Qwen via CF Proxy).

Based on: `plans/reports/brainstorm-260402-1113-chrome-extension-ai-provider-strategy.md`

## Architecture

```
Extension (BYOK direct calls)     CF Worker Proxy (built-in keys)
├── Gemini  ✅ exists              ├── Gemini  ✅ exists
├── GLM     ✅ exists              ├── GLM     ✅ exists
├── Groq    🆕 add                 ├── Qwen    🆕 add (PRIMARY)
└── Qwen    🆕 add                 └── Fallback: Qwen → Gemini → GLM
```

## Phases

| # | Phase | Priority | Status | Effort | File |
|---|-------|----------|--------|--------|------|
| 1 | [Groq + Qwen Extension Providers](phase-01-extension-providers.md) | Critical | **complete** | 2h | Types, providers, registry |
| 2 | [Qwen Proxy Server Provider](phase-02-proxy-qwen-provider.md) | Critical | **complete** | 1h | Proxy server code |
| 3 | [Settings & UI Updates](phase-03-settings-ui-updates.md) | High | **complete** | 2h | Settings types, Popup UI |

## Key Decisions

- Groq + Qwen both use OpenAI-compatible chat/completions format (same as GLM)
- Qwen endpoint: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions`
- Groq endpoint: `https://api.groq.com/openai/v1/chat/completions`
- Qwen is PRIMARY provider on proxy (best Vietnamese quality, cheapest)
- Fallback chain on proxy: Qwen → Gemini → GLM
- Extension fallback: Proxy → selected BYOK provider → other BYOK providers
