# Phase 3: Webpage Bilingual Translation

## Context
- [Brainstorm Report](../reports/brainstorm-260322-1247-ai-translation-extension-restructure.md)
- [Research — Section 1: Webpage Translation](../reports/researcher-260322-1245-immersive-translate-analysis.md)

## Overview
- **Priority:** P0 (highest priority feature)
- **Status:** complete
- **Effort:** 2-3 days
- **Blocked by:** Phase 1, Phase 2

## Key Insights
- Immersive Translate uses MutationObserver + paragraph-level granularity
- 600ms debounce prevents API spam on dynamic content
- IntersectionObserver for lazy translation (only visible paragraphs)
- Must preserve original DOM — insert translation elements, don't replace
- Site-specific optimizations critical for popular sites

## Requirements

### Functional
- Detect main content area of any webpage
- Translate paragraphs with bilingual display (original + translated)
- 3 display modes: below original (default), hover tooltip, side-by-side
- MutationObserver for dynamic content (SPA, infinite scroll)
- IntersectionObserver for lazy translation (viewport-only)
- Toggle translation on/off per page via popup
- Auto-detect source language
- Skip code blocks, math formulas, already-translated content
- Context menu: "Translate this paragraph"

### Non-Functional
- Translation latency < 3s per visible paragraph
- No layout breakage on translated pages
- XSS-safe DOM manipulation (textContent, not innerHTML)
- Memory efficient — unload translations when scrolled away on huge pages

## Architecture

```
Content Script (webpage-translator.ts)
├── ContentDetector      → Identify main content area
├── ParagraphCollector   → Collect translatable paragraphs
├── TranslationQueue     → Batch + debounce API calls
├── BilingualRenderer    → Insert translated elements into DOM
├── MutationWatcher      → Watch for new content (SPA)
└── LazyLoader           → IntersectionObserver for viewport

Background Service Worker
├── Receives translate requests from content script
├── Checks IndexedDB cache first
├── Calls provider registry (proxy/direct)
└── Returns translation + caches result
```

## Related Code Files

### Create
- `entrypoints/content-scripts/webpage-translator.ts` — Main content script
- `lib/translators/content-detector.ts` — Main content area detection
- `lib/translators/paragraph-collector.ts` — Collect translatable text nodes
- `lib/translators/translation-queue.ts` — Batch + debounce queue
- `lib/translators/bilingual-renderer.ts` — DOM insertion (3 display modes)
- `lib/translators/mutation-watcher.ts` — MutationObserver wrapper
- `lib/utils/language-detector.ts` — Auto-detect source language
- `styles/bilingual-display.css` — Bilingual translation styles
- `components/translation-toggle.tsx` — Popup toggle button

### Modify
- `entrypoints/background.ts` — Add translate message handlers
- `entrypoints/popup/App.tsx` — Add translation controls
- `lib/storage/settings-store.ts` — Add display mode setting

## Implementation Steps

1. **Content Detector** (`content-detector.ts`)
   - Query selectors: `article`, `main`, `[role="main"]`, `.content`, `.post-body`
   - Fallback: largest text-dense container via text density heuristic
   - Skip: nav, header, footer, sidebar, ads, scripts

2. **Paragraph Collector** (`paragraph-collector.ts`)
   - Walk content area, collect `<p>`, `<h1-h6>`, `<li>`, `<td>`, `<blockquote>`
   - Filter: skip empty, code blocks (`<pre>`, `<code>`), very short text (<10 chars)
   - Mark collected elements with `data-translate-id` attribute
   - Track translation state: `pending`, `translating`, `translated`

3. **Translation Queue** (`translation-queue.ts`)
   - Debounce: 600ms after last paragraph added
   - Batch: group up to 20 paragraphs per API call
   - Priority: visible paragraphs first (from IntersectionObserver)
   - Concurrency: max 3 parallel batch requests

4. **Bilingual Renderer** (`bilingual-renderer.ts`)
   - **Below mode**: Insert `<div class="it-translated">` after each paragraph
   - **Hover mode**: Show tooltip on mouseenter, hide on mouseleave
   - **Side-by-side mode**: Wrap in flex container with 50/50 split
   - Use `textContent` for XSS safety
   - Add data attributes for styling: `data-translate-lang`, `data-translate-mode`
   - CSS transitions for smooth appearance

5. **Mutation Watcher** (`mutation-watcher.ts`)
   - MutationObserver: `{ childList: true, subtree: true }`
   - 600ms debounce on mutations
   - Re-run paragraph collector on new content
   - Skip already-translated elements

6. **Lazy Translation** (IntersectionObserver in main script)
   - Observe all collected paragraphs
   - Only queue translation when paragraph enters viewport
   - Threshold: 0.1 (10% visible triggers translation)

7. **Language Detection** (`language-detector.ts`)
   - Send first 500 chars of page to AI provider
   - Prompt: "Detect the language of this text. Reply with only the ISO 639-1 code."
   - Cache detected language per hostname
   - Fallback: use `document.documentElement.lang` attribute

8. **Background handler updates**
   - Handle `translate` message: check cache → call provider → cache result → respond
   - Handle `batchTranslate` message: same flow for arrays
   - Handle `detectLanguage` message

9. **Popup controls**
   - Toggle: enable/disable translation for current site
   - Display mode selector (below/hover/side-by-side)
   - Language pair display (detected source → target)
   - Translation progress indicator

10. **CSS Styles** (`bilingual-display.css`)
    - `.it-translated` base styles (font, color, spacing)
    - Below mode: block, margin-top
    - Hover mode: absolute positioning, tooltip appearance
    - Side-by-side mode: flex layout
    - Dark/light mode support via CSS variables
    - Configurable opacity, font size

## Todo List

- [x] Implement content detector
- [x] Implement paragraph collector
- [x] Implement translation queue with debounce + batching
- [x] Implement bilingual renderer (below mode first)
- [x] Add hover tooltip mode
- [x] Add side-by-side mode
- [x] Implement MutationObserver watcher
- [x] Implement IntersectionObserver lazy loading
- [x] Implement language detector
- [x] Update background service worker with translate handlers
- [x] Add translation toggle to popup
- [x] Add display mode selector to popup
- [x] Create bilingual CSS styles
- [x] Test on: Google Search, Wikipedia, Reddit, Twitter/X, Medium
- [x] Handle edge cases: iframes, shadow DOM, dynamically loaded content

## Success Criteria
- Bilingual translation displays correctly on top 10 popular sites
- Display mode switching works without page reload
- Dynamic content (SPA navigation) gets auto-translated
- Lazy loading reduces API calls by 50%+ on long pages
- No layout breakage or XSS vulnerabilities
- Translation toggle works per-site

## Risk Assessment
- Shadow DOM (YouTube, Twitter) — may need special handling
- CSP headers blocking style injection — use `chrome.scripting.insertCSS`
- Performance on very long pages (1000+ paragraphs) — lazy loading + memory management

## Next Steps
→ Phase 4 (Video Subtitles) builds on content script patterns
→ Popup controls pattern reused in all feature phases
