# Deployment Guide — AI Translation Platform

> Last updated: 2026-05-04

## Prerequisites

- Node.js 18+
- npm or pnpm
- Cloudflare account (for proxy)
- Vercel account (for web app, optional)
- AI provider API keys (at least one)

## Web App Deployment

### Local Development

```bash
cd web-app
npm install
cp .env.example .env.local
# Add API keys to .env.local
npm run dev  # http://localhost:3000
```

### Vercel Deployment

1. Connect repo to Vercel
2. Set root directory to `web-app`
3. Configure environment variables (see `.env.example`)
4. Deploy

### Required Environment Variables

```env
# AI Providers (at least one required)
OPENROUTER_API_KEY_1=sk-or-...
QWEN_API_KEY_1=sk-...
GROQ_API_KEY_1=gsk_...
GLM_API_KEY_1=...
GEMINI_API_KEY_1=AIza...

# Cache (optional but recommended)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Cache clear auth (required for admin cache operations)
ADMIN_SECRET=your-secret-here
```

## Chrome Extension

### Local Development

```bash
cd extension
npm install
npm run dev  # Load .output/chrome-mv3 in chrome://extensions
```

### Production Build

```bash
npm run build  # Output in .output/chrome-mv3
```

### Chrome Web Store

1. Build production zip: `npm run build && npm run zip`
2. Upload to Chrome Web Store Developer Dashboard
3. Configure API keys in extension Settings page (user enters their own)

## Proxy Server

> **Important:** EXTENSION_SECRET is now REQUIRED. The proxy will return 500 if not configured.
> Set it via: `wrangler secret put EXTENSION_SECRET`
>
> CORS is restricted to `chrome-extension://` and `chromiumapp.org` origins only.

### Local Development

```bash
cd extension/proxy-server
npm install
wrangler secret put EXTENSION_SECRET
wrangler secret put GEMINI_API_KEY
wrangler secret put GLM_API_KEY
wrangler secret put QWEN_API_KEY
wrangler dev
```

### Cloudflare Deployment

```bash
wrangler deploy
```

### KV Namespace Setup

KV namespace is configured in `wrangler.toml`. Created automatically on first deploy.

## Configuration

### Extension Modes

| Mode | Description | API Keys |
|------|-------------|----------|
| BYOK | User provides their own keys | Settings page |
| Proxy | Uses shared proxy server | Pre-configured endpoint |
