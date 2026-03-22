# Phase 1: WXT Project Setup & Core Infrastructure

## Context
- [Brainstorm Report](../reports/brainstorm-260322-1247-ai-translation-extension-restructure.md)
- [Research Report](../reports/researcher-260322-1245-immersive-translate-analysis.md)

## Overview
- **Priority:** Critical (foundation for all features)
- **Status:** complete
- **Effort:** 1-2 days
- **Blocked by:** Nothing

## Key Insights
- WXT is the recommended Chrome extension framework (Vite-based, 43% smaller bundles, actively maintained)
- Manifest V3 mandatory — service workers not persistent, use chrome.storage + IndexedDB
- React 19 + Tailwind CSS 4 + shadcn/ui for modern, accessible UI

## Requirements

### Functional
- Initialize WXT project with React 19 + TypeScript 5
- Configure Tailwind CSS 4 + shadcn/ui components
- Create popup entrypoint with basic settings UI
- Create side panel entrypoint (for PDF/ePub reader later)
- Create background service worker with message routing
- Create content script entry point (skeleton)
- Setup IndexedDB cache layer
- Setup Zustand stores (settings, translation state)
- Setup chrome.i18n for EN/VI localization

### Non-Functional
- Extension bundle < 2MB (before PDF.js/epub.js lazy loading)
- HMR working for all entrypoints in dev
- TypeScript strict mode

## Architecture

```
entrypoints/
├── popup/           → React app (settings, controls)
├── background.ts    → Service worker (message router, API orchestrator)
├── content.ts       → Content script skeleton (injected into pages)
└── sidepanel/       → React app (PDF/ePub reader)

lib/
├── storage/
│   ├── settings-store.ts      → Zustand + chrome.storage.local sync
│   └── translation-cache.ts   → IndexedDB wrapper (idb library)
├── providers/
│   └── types.ts               → TranslationProvider interface
└── utils/
    ├── text-chunker.ts        → Migrated from current project
    └── message-types.ts       → Chrome message type definitions
```

## Related Code Files

### Create
- `wxt.config.ts` — WXT configuration
- `package.json` — Dependencies
- `tsconfig.json` — TypeScript config
- `tailwind.config.ts` — Tailwind CSS 4 config
- `entrypoints/popup/index.html`
- `entrypoints/popup/main.tsx`
- `entrypoints/popup/App.tsx`
- `entrypoints/background.ts`
- `entrypoints/content.ts`
- `entrypoints/sidepanel/index.html`
- `entrypoints/sidepanel/main.tsx`
- `entrypoints/sidepanel/App.tsx`
- `lib/storage/settings-store.ts`
- `lib/storage/translation-cache.ts`
- `lib/providers/types.ts`
- `lib/utils/text-chunker.ts`
- `lib/utils/message-types.ts`
- `components/ui/` — shadcn/ui base components
- `_locales/en/messages.json`
- `_locales/vi/messages.json`
- `public/icons/` — Extension icons (16, 48, 128)

## Implementation Steps

1. **Initialize WXT project**
   ```bash
   npx wxt@latest init ai-translation-extension --template react
   cd ai-translation-extension
   ```

2. **Install dependencies**
   ```bash
   npm install react@19 react-dom@19 zustand idb tailwindcss@4 @tailwindcss/postcss
   npm install -D typescript @types/chrome @types/react @types/react-dom
   ```

3. **Configure WXT** (`wxt.config.ts`)
   - Set manifest permissions: `storage`, `activeTab`, `sidePanel`, `scripting`, `contextMenus`
   - Configure content scripts to match all URLs
   - Set popup and sidepanel entrypoints

4. **Setup Tailwind CSS 4 + shadcn/ui**
   - Configure postcss with `@tailwindcss/postcss`
   - Init shadcn/ui with `npx shadcn@latest init`
   - Add base components: Button, Input, Select, Switch, Tabs

5. **Create Popup UI**
   - Language selector (EN↔VI, ZH↔VI)
   - Provider selector (Gemini, GLM)
   - Translation toggle (enable/disable per site)
   - Settings: display mode (below/hover/side-by-side), API endpoint config

6. **Create Service Worker** (`background.ts`)
   - Message routing: `translate`, `batchTranslate`, `getSettings`, `updateSettings`
   - Context menu: "Translate selection" right-click option
   - chrome.storage sync for settings persistence

7. **Create Content Script skeleton** (`content.ts`)
   - Basic injection check (skip chrome://, extension pages)
   - Message listener skeleton
   - DOM readiness detection

8. **Create Side Panel skeleton**
   - Basic React app with tab navigation (PDF / ePub)
   - "Open in new tab" button

9. **Setup IndexedDB cache** (`translation-cache.ts`)
   - Schema: `{ id, sourceText, translatedText, sourceLang, targetLang, provider, timestamp }`
   - Methods: `get(hash)`, `set(hash, translation)`, `clear()`, `getStats()`
   - TTL: 30 days, auto-cleanup on startup

10. **Setup Settings Store** (`settings-store.ts`)
    - Zustand store synced with `chrome.storage.local`
    - Settings: targetLang, provider, displayMode, enabledSites, proxyUrl, apiKeys

11. **Migrate text-chunker** from `web-app/lib/text-chunker.ts`
    - Adapt for browser environment (no Node.js APIs)

12. **Setup chrome.i18n**
    - `_locales/en/messages.json` and `_locales/vi/messages.json`
    - Basic strings: extension name, description, UI labels

13. **Create extension icons**
    - 16x16, 48x48, 128x128 PNG icons

## Todo List

- [x] Initialize WXT project with React 19
- [x] Install and configure all dependencies
- [x] Setup Tailwind CSS 4 + shadcn/ui
- [x] Create popup entrypoint with settings UI
- [x] Create background service worker with message routing
- [x] Create content script skeleton
- [x] Create side panel skeleton
- [x] Implement IndexedDB cache layer
- [x] Implement Zustand settings store with chrome.storage sync
- [x] Migrate text-chunker utility
- [x] Setup chrome.i18n localization (EN/VI)
- [x] Create extension icons
- [x] Verify dev build + HMR works
- [x] Verify extension loads in Chrome

## Success Criteria
- Extension loads in Chrome without errors
- Popup opens with settings UI
- Service worker responds to messages
- Content script injects on web pages
- IndexedDB cache read/write works
- Settings persist across browser restarts

## Risk Assessment
- WXT + React 19 compatibility — verify latest WXT supports React 19
- shadcn/ui in extension context — may need custom CSS injection approach
- Service worker termination — all state must be in chrome.storage/IndexedDB

## Next Steps
→ Phase 2 (Proxy & AI Providers) can start in parallel
→ Phase 3 (Webpage Translation) depends on this phase completing
