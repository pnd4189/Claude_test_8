# Phase 4: Video Subtitle Translation

## Context
- [Research — Section 2: Video Subtitles](../reports/researcher-260322-1245-immersive-translate-analysis.md)

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 2-3 days
- **Blocked by:** Phase 1, Phase 2, Phase 3 (content script patterns)

## Key Insights
- YouTube: Transcript API (`/api/timedtext`) — documented, stable
- Coursera/Udemy: HTML5 `<track>` element hooks
- Batch translate entire subtitle file before playback (not real-time)
- Dual subtitle rendering: original top + translated bottom

## Requirements

### Functional
- Detect video player on page (YouTube, Coursera, Udemy, generic HTML5)
- Extract subtitle/caption data from platform-specific sources
- Batch translate all captions
- Render dual subtitles synchronized with video playback
- Toggle bilingual subtitles on/off
- Cache translated subtitles per video URL

### Non-Functional
- Subtitle extraction < 2s
- Translation of full subtitle file < 10s (batch)
- Sync accuracy within 100ms of original timing
- No interference with native video controls

## Architecture

```
Content Script (video-subtitle-hook.ts)
├── PlatformDetector     → Identify video platform
├── SubtitleExtractor    → Platform-specific extraction
│   ├── YouTubeExtractor
│   ├── HTML5TrackExtractor (Coursera, Udemy, generic)
│   └── VTTParser
├── SubtitleTranslator   → Batch translate captions
└── DualSubtitleRenderer → Overlay bilingual subtitles on video
```

## Related Code Files

### Create
- `entrypoints/content-scripts/video-subtitle-hook.ts` — Video content script
- `lib/translators/subtitle-translator.ts` — Batch subtitle translation
- `lib/parsers/subtitle-parser.ts` — VTT/SRT parser
- `lib/platform-hooks/youtube-extractor.ts` — YouTube subtitle extraction
- `lib/platform-hooks/html5-track-extractor.ts` — Generic HTML5 track extraction
- `lib/platform-hooks/platform-detector.ts` — Detect video platform
- `lib/translators/dual-subtitle-renderer.ts` — Bilingual subtitle overlay
- `styles/subtitle-overlay.css` — Subtitle display styles

### Modify
- `entrypoints/background.ts` — Add subtitle-related handlers
- `entrypoints/popup/App.tsx` — Add subtitle toggle control
- `wxt.config.ts` — Add video platform URL patterns for content script

## Implementation Steps

1. **Platform Detector** (`platform-detector.ts`)
   - Check URL patterns: `youtube.com`, `coursera.org`, `udemy.com`
   - Detect HTML5 `<video>` elements with `<track>` children
   - Return platform type + video element reference

2. **YouTube Extractor** (`youtube-extractor.ts`)
   - Extract video ID from URL: `/watch?v={id}` or `/embed/{id}`
   - Fetch captions list: intercept `ytInitialPlayerResponse` or use timedtext API
   - Parse XML response into `{ start, duration, text }[]`
   - Handle auto-generated vs manual captions

3. **HTML5 Track Extractor** (`html5-track-extractor.ts`)
   - Query `video > track[kind="subtitles"]` or `track[kind="captions"]`
   - Fetch VTT/SRT content from track.src
   - Parse into timestamped entries

4. **VTT/SRT Parser** (`subtitle-parser.ts`)
   - Parse WebVTT format: timestamps + text blocks
   - Parse SRT format: numbered entries + timestamps + text
   - Output: `SubtitleEntry { start: number, end: number, text: string }`

5. **Subtitle Translator** (`subtitle-translator.ts`)
   - Batch translate: group captions into chunks (20-30 per batch)
   - Preserve timing information
   - Cache translated subtitles by video URL hash in IndexedDB
   - Output: `TranslatedSubtitle { start, end, original, translated }`

6. **Dual Subtitle Renderer** (`dual-subtitle-renderer.ts`)
   - Create overlay container positioned over video player
   - Sync with video `timeupdate` event
   - Display current caption: original (top) + translated (bottom)
   - Handle caption transitions smoothly
   - Respect video fullscreen mode
   - Customizable: font size, position, background opacity

7. **Video subtitle CSS** (`subtitle-overlay.css`)
   - Subtitle container: absolute positioned over video
   - Original text: top, semi-transparent background
   - Translated text: bottom, slightly different style
   - Responsive to video size changes
   - Fullscreen support

8. **Popup controls**
   - Subtitle toggle: enable/disable bilingual subtitles
   - Show when video detected on page

## Todo List

- [ ] Implement platform detector
- [ ] Implement YouTube subtitle extractor
- [ ] Implement HTML5 track extractor (Coursera/Udemy/generic)
- [ ] Implement VTT/SRT parser
- [ ] Implement batch subtitle translator
- [ ] Implement dual subtitle renderer with video sync
- [ ] Create subtitle overlay CSS
- [ ] Add subtitle toggle to popup
- [ ] Test on YouTube (auto-generated + manual captions)
- [ ] Test on Coursera
- [ ] Test on Udemy
- [ ] Test with generic HTML5 video + track elements
- [ ] Handle edge cases: no captions, live streams, embedded iframes

## Success Criteria
- YouTube bilingual subtitles work with < 2s initial delay
- Coursera/Udemy subtitle translation functional
- Subtitle timing sync within 100ms accuracy
- Font size/position customizable
- Subtitles cached per video (no re-translation on replay)
- Fullscreen mode supported

## Risk Assessment
- YouTube may change DOM structure — use version detection, multiple selectors
- Coursera/Udemy may use custom video players — test extensively
- Some videos have no captions — show user-friendly message
- iframe-embedded videos — may need `all_frames: true` in manifest

## Next Steps
→ Phase 5 (ePub) and Phase 6 (PDF) can start in parallel after this
