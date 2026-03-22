# Phase 7: Testing, Polish & Packaging

## Context
- All feature phases (1-6) must be complete before this phase

## Overview
- **Priority:** High
- **Status:** pending
- **Effort:** 1-2 days
- **Blocked by:** Phase 3, Phase 4, Phase 5, Phase 6

## Requirements

### Functional
- Unit tests for all providers, parsers, utilities
- Integration tests for translation flow
- E2E tests for critical user paths
- Error handling polish (user-friendly messages)
- Extension packaging for Chrome Web Store

### Non-Functional
- Test coverage > 70% for lib/ modules
- Extension size < 5MB (excluding lazy-loaded PDF.js)
- No console errors in production build
- Chrome Web Store compliance (permissions justified)

## Implementation Steps

1. **Unit Tests** (Vitest)
   - Provider tests: Gemini, GLM, proxy client, registry fallback
   - Parser tests: ePub parser, PDF parser, subtitle parser (VTT/SRT)
   - Utility tests: text chunker, language detector, cache layer
   - Mock chrome APIs for testing

2. **Integration Tests**
   - Translation flow: content script → background → provider → cache → response
   - Settings persistence: Zustand → chrome.storage roundtrip
   - Provider fallback: primary fails → secondary succeeds

3. **E2E Tests** (if feasible with extension testing tools)
   - Open popup, change settings
   - Toggle translation on a test page
   - Open ePub file, navigate chapters
   - Open PDF file, view translated overlay

4. **Error Handling Polish**
   - Network errors: "Translation service unavailable, please try again"
   - Rate limit: "Too many requests, please wait {n} seconds"
   - Invalid file: "This file format is not supported"
   - No captions: "No subtitles found for this video"
   - DRM ePub: "DRM-protected books cannot be translated"

5. **Performance Optimization**
   - Audit bundle size, tree-shake unused code
   - Verify PDF.js lazy loading works
   - Check memory usage on long pages
   - Optimize IndexedDB queries

6. **Chrome Web Store Packaging**
   - Build production bundle: `wxt build`
   - Create ZIP for Chrome Web Store upload
   - Write extension description (EN + VI)
   - Create promotional screenshots
   - Justify all permissions in store listing
   - Privacy policy (no data collection)

7. **Documentation**
   - Update README with new architecture
   - User guide: how to use each feature
   - Developer guide: how to add new providers

## Todo List

- [ ] Write unit tests for providers
- [ ] Write unit tests for parsers
- [ ] Write unit tests for utilities
- [ ] Write integration tests for translation flow
- [ ] Polish error handling across all features
- [ ] Audit and optimize bundle size
- [ ] Verify lazy loading works in production build
- [ ] Build production extension
- [ ] Create Chrome Web Store listing materials
- [ ] Update project documentation

## Success Criteria
- All tests pass
- Production build runs without errors
- Extension size < 5MB (pre lazy-load)
- All permissions justified
- Clean install + basic workflow works end-to-end
