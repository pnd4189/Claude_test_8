# Phase 5: ePub Translation & Reader

## Context
- [Research — Section 4: ePub Translation](../reports/researcher-260322-1245-immersive-translate-analysis.md)

## Overview
- **Priority:** P2
- **Status:** pending
- **Effort:** 2-3 days
- **Blocked by:** Phase 1, Phase 2

## Key Insights
- ePub files are ZIP archives containing XHTML chapters
- JSZip for unpacking, DOMParser for chapter parsing
- Chapter-level translation maintains context
- Reader in Side Panel (default) + "Open in new tab" option
- Cannot handle DRM-protected books

## Requirements

### Functional
- Open ePub file via popup drag-drop or file picker
- Parse ePub: extract metadata (title, author, TOC) + chapters
- Translate chapters with bilingual display
- Built-in ePub reader in Side Panel and new tab
- Chapter navigation with TOC sidebar
- Reading progress saved to IndexedDB
- Export bilingual ePub option
- Display modes: bilingual stacked (default), side-by-side, translation-only

### Non-Functional
- Parse ePub < 2s for typical book (< 5MB)
- Chapter translation < 15s (depends on length)
- Smooth reading experience with pagination or scroll

## Architecture

```
Popup → File picker → Background (parse ePub)
                          ↓
                    Side Panel / New Tab (ePub Reader)
                    ├── TOC Sidebar
                    ├── Chapter View (bilingual)
                    ├── Progress Tracker
                    └── Settings (display mode, font)

lib/
├── parsers/epub-parser.ts      → JSZip + DOMParser
├── translators/epub-translator.ts → Chapter-level translation
└── storage/reading-progress.ts  → IndexedDB progress tracking
```

## Related Code Files

### Create
- `lib/parsers/epub-parser.ts` — ePub parsing (JSZip + DOMParser)
- `lib/translators/epub-translator.ts` — Chapter translation logic
- `lib/storage/reading-progress-store.ts` — Reading progress persistence
- `entrypoints/sidepanel/epub-reader.tsx` — ePub reader component
- `entrypoints/sidepanel/chapter-view.tsx` — Chapter display (bilingual)
- `entrypoints/sidepanel/toc-sidebar.tsx` — Table of contents
- `components/file-upload.tsx` — Drag-drop file picker
- `styles/epub-reader.css` — Reader styles

### Modify
- `entrypoints/popup/App.tsx` — Add ePub file upload
- `entrypoints/sidepanel/App.tsx` — Add ePub reader tab
- `entrypoints/background.ts` — Add ePub parsing handlers

### Dependencies to Install
- `jszip` — ePub unpacking

## Implementation Steps

1. **ePub Parser** (`epub-parser.ts`)
   - Accept File/ArrayBuffer input
   - Unpack with JSZip
   - Parse `META-INF/container.xml` → find `content.opf`
   - Extract metadata: title, author, language, cover image
   - Parse spine order → ordered chapter list
   - Parse TOC (`toc.ncx` or `nav.xhtml`)
   - Return: `{ metadata, chapters: { id, title, htmlContent }[], toc }`

2. **Chapter Text Extraction**
   - DOMParser to parse XHTML chapter content
   - Walk DOM tree, extract text from `<p>`, `<h1-h6>`, `<li>`, `<blockquote>`
   - Preserve paragraph boundaries for bilingual display
   - Skip images, SVG, MathML elements

3. **ePub Translator** (`epub-translator.ts`)
   - Translate chapter text paragraph-by-paragraph
   - Use batch translation from provider registry
   - Cache translated chapters in IndexedDB (key: `epub:{bookHash}:ch{n}`)
   - Progress callback for UI updates
   - Translate on-demand (current chapter + next chapter prefetch)

4. **ePub Reader UI** (`epub-reader.tsx`)
   - Side Panel layout: TOC sidebar (collapsible) + chapter content
   - Chapter view with bilingual paragraphs
   - Navigation: prev/next chapter buttons, TOC click
   - Settings: font size, display mode, theme (light/dark/sepia)
   - "Open in new tab" button — opens same reader in full tab

5. **Chapter View** (`chapter-view.tsx`)
   - Render paragraphs with bilingual display
   - Stacked mode: original paragraph → translated paragraph
   - Side-by-side mode: two columns
   - Translation-only mode: show only translated text
   - Loading state per paragraph while translating
   - Scroll position tracking for progress

6. **TOC Sidebar** (`toc-sidebar.tsx`)
   - List chapters from parsed TOC
   - Highlight current chapter
   - Click to navigate
   - Show translation status per chapter (pending/translating/done)

7. **Reading Progress** (`reading-progress-store.ts`)
   - Save: book hash, current chapter, scroll position, last read timestamp
   - Restore on re-open
   - IndexedDB store: `reading-progress`

8. **File Upload** (`file-upload.tsx`)
   - Drag-drop zone in popup
   - File picker button
   - Accept `.epub` files only
   - Size limit: 50MB
   - Send to background for parsing, then open Side Panel

9. **Bilingual ePub Export** (stretch goal)
   - Re-build ePub with bilingual XHTML chapters
   - Download as `.epub` file

## Todo List

- [ ] Install JSZip dependency
- [ ] Implement ePub parser (metadata + chapters + TOC)
- [ ] Implement chapter text extraction
- [ ] Implement ePub translator with caching
- [ ] Create ePub reader UI in Side Panel
- [ ] Create chapter view with bilingual display
- [ ] Create TOC sidebar with navigation
- [ ] Implement reading progress persistence
- [ ] Add file upload to popup
- [ ] Add "Open in new tab" functionality
- [ ] Implement display mode switching (stacked/side-by-side/translation-only)
- [ ] Test with various ePub files (different structures)
- [ ] Handle edge cases: no TOC, images-only chapters, large books

## Success Criteria
- ePub files parse correctly (metadata + chapters extracted)
- Bilingual reading works with smooth chapter navigation
- Reading progress persists across sessions
- Side Panel and new tab modes both functional
- Chapter translation cached (no re-translation on revisit)
- Works with standard ePub2 and ePub3 files

## Risk Assessment
- Large ePub files (100+ chapters) — lazy load chapters, translate on demand
- Non-standard ePub formats — handle gracefully, show error for unsupported
- DRM books — detect and show "DRM not supported" message
- Side Panel API availability — fallback to new tab only if not supported

## Next Steps
→ Phase 6 (PDF) follows similar reader pattern
→ Phase 7 (Polish) after all features complete
