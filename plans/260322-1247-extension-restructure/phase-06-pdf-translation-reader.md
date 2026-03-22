# Phase 6: PDF Translation & Reader

## Context
- [Research — Section 3: PDF Translation](../reports/researcher-260322-1245-immersive-translate-analysis.md)

## Overview
- **Priority:** P3
- **Status:** complete
- **Effort:** 2-3 days
- **Blocked by:** Phase 1, Phase 2, Phase 5 (shared reader infrastructure)

## Key Insights
- PDF.js (Mozilla) for rendering and text extraction with positioning
- Text layer overlay approach for bilingual display
- Lazy load PDF.js (~2MB) only when user opens a PDF
- Page-by-page translation with progress tracking
- Reuse Side Panel + new tab reader from Phase 5

## Requirements

### Functional
- Open PDF via popup file picker or drag-drop
- Render PDF pages with PDF.js
- Extract text blocks with position/layout metadata
- Translate text blocks preserving approximate layout
- Bilingual display: original PDF + translated text overlay
- Page navigation, zoom, scroll
- Page-by-page translation with progress indicator
- Download option (translated text as separate document)

### Non-Functional
- PDF.js loaded lazily (not in initial bundle)
- Page render < 1s, text extraction < 2s per page
- Support PDFs up to 100MB

## Architecture

```
Popup → File picker → Background (store PDF blob)
                          ↓
                    Side Panel / New Tab (PDF Reader)
                    ├── PDF.js Canvas Renderer
                    ├── Text Layer (original)
                    ├── Translation Overlay Layer
                    ├── Page Navigation
                    └── Progress Tracker

lib/
├── parsers/pdf-parser.ts           → PDF.js text extraction
├── translators/pdf-translator.ts   → Page-level translation
└── (reuse reading-progress-store from Phase 5)
```

## Related Code Files

### Create
- `lib/parsers/pdf-parser.ts` — PDF.js wrapper for text extraction
- `lib/translators/pdf-translator.ts` — Page-level translation logic
- `entrypoints/sidepanel/pdf-reader.tsx` — PDF reader component
- `entrypoints/sidepanel/pdf-page-view.tsx` — Single page render + overlay
- `styles/pdf-reader.css` — PDF reader styles

### Modify
- `entrypoints/popup/App.tsx` — Add PDF file upload (extend existing file picker)
- `entrypoints/sidepanel/App.tsx` — Add PDF reader tab
- `entrypoints/background.ts` — Add PDF-related handlers
- `components/file-upload.tsx` — Accept `.pdf` files

### Dependencies to Install
- `pdfjs-dist` — PDF.js library (lazy loaded)

## Implementation Steps

1. **PDF.js Lazy Loading**
   - Dynamic import: `const pdfjsLib = await import('pdfjs-dist')`
   - Configure worker: `pdfjsLib.GlobalWorkerOptions.workerSrc`
   - Only load when user opens a PDF file

2. **PDF Parser** (`pdf-parser.ts`)
   - Load PDF document from ArrayBuffer
   - Extract per-page text content with positioning
   - Group text items into logical paragraphs (by Y-coordinate proximity)
   - Return: `{ numPages, pages: { pageNum, textBlocks: { text, x, y, width, height }[] }[] }`

3. **PDF Translator** (`pdf-translator.ts`)
   - Translate page text blocks in batches
   - Cache per page: `pdf:{fileHash}:page{n}`
   - Translate current page + prefetch next 2 pages
   - Progress callback for UI
   - Handle: tables (preserve cell structure), headers, footnotes

4. **PDF Reader UI** (`pdf-reader.tsx`)
   - Reuse Side Panel / new tab pattern from Phase 5
   - PDF.js canvas rendering per page
   - Page navigation: prev/next, page number input, scroll-based
   - Zoom controls: fit width, fit page, percentage
   - Translation toggle per page
   - Progress bar: X/Y pages translated

5. **PDF Page View** (`pdf-page-view.tsx`)
   - Canvas layer: PDF.js rendered page
   - Text layer: selectable original text (PDF.js text layer)
   - Translation overlay: positioned translated text blocks
   - Overlay mode: semi-transparent background with translated text
   - Toggle between original-only, bilingual, translation-only

6. **Translation Overlay Rendering**
   - Position translated text blocks at same coordinates as original
   - Adjust font size to fit within original text block bounds
   - Semi-transparent background for readability
   - Different color for translated text vs original

7. **File handling**
   - Extend file-upload component to accept `.pdf`
   - Store PDF blob in IndexedDB (too large for chrome.storage)
   - Open Side Panel with PDF reader tab active

## Todo List

- [x] Install pdfjs-dist dependency
- [x] Implement PDF.js lazy loading
- [x] Implement PDF parser with text extraction
- [x] Implement text block grouping (paragraphs from positions)
- [x] Implement PDF translator with per-page caching
- [x] Create PDF reader UI in Side Panel
- [x] Create page view with canvas + text layer + translation overlay
- [x] Implement page navigation and zoom
- [x] Add PDF to file upload component
- [x] Implement translation progress tracking
- [x] Test with various PDFs (academic papers, books, forms)
- [x] Handle edge cases: scanned PDFs (no text), huge PDFs, encrypted PDFs

## Success Criteria
- PDF renders correctly with PDF.js
- Text extraction captures 90%+ of readable text
- Bilingual overlay positioned accurately
- Page navigation smooth (< 200ms page switch)
- Translation cached per page (no re-translation)
- PDF.js lazy loaded (not in initial bundle)

## Risk Assessment
- Scanned PDFs (images, no text layer) — show "OCR not supported" message, future scope
- Complex layouts (multi-column, tables) — best-effort text grouping
- PDF.js bundle size (~2MB) — lazy load mitigates initial load impact
- Very large PDFs (100+ pages) — translate on-demand, not all at once

## Next Steps
→ Phase 7 (Testing & Polish) after all features complete
