# Translation Platform - Implementation Tasks

**Legend:**
- `[P]` = Parallel-safe (có thể làm đồng thời với tasks khác)
- `[US1/2/3]` = Liên quan đến User Story cụ thể
- `[BLOCKED]` = Đang chờ task khác hoàn thành

---

## Phase 1: Setup (Shared Infrastructure)

### T001: Initialize Next.js 14 project với TypeScript, TailwindCSS
**Status**: ⬜ Pending
**Effort**: 30 mins
**Dependencies**: None
**Commands**:
```bash
npx create-next-app@latest web-app --typescript --tailwind --app --eslint
cd web-app
npm install zustand next-intl @upstash/redis @upstash/ratelimit
```

---

### T002: [P] Setup i18n với next-intl
**Status**: ⬜ Pending
**Effort**: 45 mins
**Dependencies**: T001
**Files**:
- `messages/en.json`
- `messages/vi.json`
- `app/[locale]/layout.tsx`
- `i18n.ts`

---

### T003: [P] Configure shadcn/ui components
**Status**: ⬜ Pending
**Effort**: 30 mins
**Dependencies**: T001
**Commands**:
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input select toast progress dropdown-menu
```

---

### T004: [P] Setup Zustand store
**Status**: ⬜ Pending
**Effort**: 20 mins
**Dependencies**: T001
**Files**:
- `store/translation-store.ts`
- `store/settings-store.ts`
- `store/provider-store.ts`

---

### T005: Create Chrome extension boilerplate
**Status**: ⬜ Pending
**Effort**: 45 mins
**Dependencies**: None
**Commands**:
```bash
mkdir chrome-extension
cd chrome-extension
npm init -y
npm install --save-dev webpack webpack-cli typescript ts-loader
npm install preact
```
**Files**:
- `manifest.json`
- `webpack.config.js`
- `tsconfig.json`

---

### T006: [P] Setup Vercel project với environment variables
**Status**: ⬜ Pending
**Effort**: 15 mins
**Dependencies**: T001
**Files**:
- `.env.local.example`
- `vercel.json`

---

### T007: [P] Configure Upstash Redis connection
**Status**: ⬜ Pending
**Effort**: 20 mins
**Dependencies**: T001
**Files**:
- `lib/redis.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

### T008: Implement APIKeyRotator class
**Status**: ⬜ Pending
**Effort**: 1 hour
**Dependencies**: T001
**Files**:
- `lib/api-key-rotator.ts`
**Tests**:
- Rotation logic
- Quota exceeded handling
- All keys exhausted scenario

---

### T009: [P] Create text chunking utility
**Status**: ⬜ Pending
**Effort**: 1 hour
**Dependencies**: T001
**Files**:
- `lib/text-chunker.ts`
**Tests**:
- Chunk by sentences
- Chunk by size
- Overlap logic
- Token estimation

---

### T010: [P] Setup theme provider với dark/light mode
**Status**: ⬜ Pending
**Effort**: 30 mins
**Dependencies**: T003
**Files**:
- `components/theme-provider.tsx`
- `components/theme-toggle.tsx`

---

### T011: [P] Create language switcher component
**Status**: ⬜ Pending
**Effort**: 30 mins
**Dependencies**: T002, T003
**Files**:
- `components/language-switcher.tsx`

---

### T012: Implement file parsers
**Status**: ⬜ Pending
**Effort**: 3 hours
**Dependencies**: T001

#### T012a: epub-parser.ts
**Status**: ⬜ Pending
**Effort**: 1 hour
**Commands**:
```bash
npm install epub
```
**Files**:
- `lib/file-parsers/epub-parser.ts`

#### T012b: pdf-parser.ts
**Status**: ⬜ Pending
**Effort**: 1 hour
**Commands**:
```bash
npm install pdf-parse
```
**Files**:
- `lib/file-parsers/pdf-parser.ts`

#### T012c: docx-parser.ts
**Status**: ⬜ Pending
**Effort**: 1 hour
**Commands**:
```bash
npm install mammoth
```
**Files**:
- `lib/file-parsers/docx-parser.ts`

---

### T013: Create base API route structure
**Status**: ⬜ Pending
**Effort**: 45 mins
**Dependencies**: T001, T008
**Files**:
- `app/api/translate/route.ts`
- `lib/providers/types.ts`

---

## Phase 3: User Story 1 - File Translation (P1)

### T014: [US1] Create file upload UI
**Status**: ⬜ Pending
**Effort**: 1 hour
**Dependencies**: T003
**Files**:
- `components/file-upload.tsx`
**Features**:
- Drag & drop
- File type validation
- Size validation (max 50MB)
- Preview uploaded file info

---

### T015: [US1] Implement file validation
**Status**: ⬜ Pending
**Effort**: 30 mins
**Dependencies**: T014
**Files**:
- `lib/file-validator.ts`
**Validations**:
- File extensions: .epub, .pdf, .txt, .docx
- Max size: 50MB
- MIME type check

---

### T016: [US1] Create translation progress component
**Status**: ⬜ Pending
**Effort**: 45 mins
**Dependencies**: T003
**Files**:
- `components/translation-progress.tsx`
**Features**:
- Progress bar with percentage
- Current chunk indicator
- Estimated time remaining
- Cancel button

---

### T017: [US1] Implement chunked translation logic
**Status**: ⬜ Pending
**Effort**: 2 hours
**Dependencies**: T009, T013
**Files**:
- `lib/chunked-translator.ts`
**Features**:
- Split text into chunks
- Translate chunks sequentially
- Merge results
- Progress tracking
- Error recovery

---

### T018: [US1] Create download button với format preservation
**Status**: ⬜ Pending
**Effort**: 1.5 hours
**Dependencies**: T012, T017
**Files**:
- `lib/file-generators/epub-generator.ts`
- `lib/file-generators/pdf-generator.ts`
- `lib/file-generators/docx-generator.ts`
- `components/download-button.tsx`

---

### T019: [P] [US1] Implement OpenRouter integration
**Status**: ⬜ Pending
**Effort**: 1.5 hours
**Dependencies**: T008, T013
**Files**:
- `lib/providers/openrouter.ts`
- `app/api/providers/openrouter/route.ts`
**Features**:
- Chat completions endpoint
- Models list fetching
- Filter ":free" models + Qwen/DeepSeek/Kimi/GLM
- Error handling

---

### T020: [P] [US1] Implement Gemini integration
**Status**: ⬜ Pending
**Effort**: 1 hour
**Dependencies**: T008, T013
**Files**:
- `lib/providers/gemini.ts`
- `app/api/providers/gemini/route.ts`
**Models**:
- gemini-2.0-flash-exp

---

### T021: [P] [US1] Implement Mistral integration
**Status**: ⬜ Pending
**Effort**: 1 hour
**Dependencies**: T008, T013
**Files**:
- `lib/providers/mistral.ts`
- `app/api/providers/mistral/route.ts`
**Models**:
- mistral-small-latest

---

### T022: [P] [US1] Implement Groq integration
**Status**: ⬜ Pending
**Effort**: 1 hour
**Dependencies**: T008, T013
**Files**:
- `lib/providers/groq.ts`
- `app/api/providers/groq/route.ts`
**Models**:
- llama3-70b-8192
- mixtral-8x7b-32768

---

### T023: [US1] Create main translation page
**Status**: ⬜ Pending
**Effort**: 2 hours
**Dependencies**: T014, T016, T017, T018
**Files**:
- `app/[locale]/translate/page.tsx`
**Features**:
- File upload area
- Source/target language selection
- Provider/model selection
- Translation output display
- Download button

---

## Phase 4: User Story 2 - Chrome Extension (P2)

### T024: [US2] Implement content script injector
**Status**: ⬜ Pending
**Effort**: 1 hour
**Dependencies**: T005
**Files**:
- `src/content/injector.ts`
- `src/content/styles.css`
**Features**:
- Inject UI elements into page
- Handle DOM mutations
- Exclude chrome:// pages

---

### T025: [US2] Create text selection handler
**Status**: ⬜ Pending
**Effort**: 1.5 hours
**Dependencies**: T024
**Files**:
- `src/content/selector.ts`
**Features**:
- Detect text hover
- Handle text selection
- Calculate tooltip position
- Avoid conflicts with page scripts

---

### T026: [US2] Build translation tooltip UI
**Status**: ⬜ Pending
**Effort**: 1.5 hours
**Dependencies**: T025
**Files**:
- `src/content/tooltip.tsx`
**Features**:
- Hover tooltip
- Loading state
- Error state
- Copy translation button
- "Translate All" button

---

### T027: [US2] Implement background service worker
**Status**: ⬜ Pending
**Effort**: 1 hour
**Dependencies**: T005
**Files**:
- `src/background/index.ts`
**Features**:
- Message handling from content scripts
- API request management
- Cache management

---

### T028: [US2] Create extension popup
**Status**: ⬜ Pending
**Effort**: 1.5 hours
**Dependencies**: T005
**Files**:
- `src/popup/index.tsx`
- `src/popup/styles.css`
- `public/popup.html`
**Features**:
- Quick translate textarea
- Provider/model selection
- Settings link
- Recent translations

---

### T029: [US2] Setup chrome.storage cache wrapper
**Status**: ⬜ Pending
**Effort**: 45 mins
**Dependencies**: T005
**Files**:
- `src/shared/cache.ts`
**Features**:
- Get/set cache
- TTL management (30 days)
- Cache size limits
- Clear old entries

---

### T030: [US2] Connect extension to web app API
**Status**: ⬜ Pending
**Effort**: 1 hour
**Dependencies**: T013, T027
**Files**:
- `src/shared/api-client.ts`
**Features**:
- API endpoint configuration
- Request/response handling
- Error handling
- Retry logic

---

### T031: [US2] Implement "Translate All" batch mode
**Status**: ⬜ Pending
**Effort**: 2 hours
**Dependencies**: T026, T030
**Files**:
- `src/content/batch-translator.ts`
**Features**:
- Find all text nodes on page
- Queue translations
- Progress indicator
- Pause/resume
- Cancel

---

### T032: [US2] Add extension settings page
**Status**: ⬜ Pending
**Effort**: 1 hour
**Dependencies**: T005
**Files**:
- `src/options/index.html`
- `src/options/index.tsx`
- `src/options/styles.css`
**Features**:
- API endpoint configuration
- Default provider/model
- Translation mode preference
- Shortcut keys
- Cache management

---

## Phase 5: User Story 3 - AI Management (P3)

### T033: [US3] Create provider selector dropdown
**Status**: ⬜ Pending
**Effort**: 1 hour
**Dependencies**: T003, T004
**Files**:
- `components/provider-selector.tsx`
**Features**:
- Provider list
- Model list (filtered by provider)
- Search/filter
- Model metadata display

---

### T034: [US3] Implement model fetcher cho OpenRouter
**Status**: ⬜ Pending
**Effort**: 1 hour
**Dependencies**: T019
**Files**:
- `lib/model-fetcher.ts`
**Features**:
- Fetch all OpenRouter models
- Filter ":free" + Qwen/DeepSeek/Kimi/GLM
- Cache in Redis

---

### T035: [US3] Setup Vercel Cron job
**Status**: ⬜ Pending
**Effort**: 30 mins
**Dependencies**: T034
**Files**:
- `app/api/cron/refresh-models/route.ts`
- `vercel.json` (update)
**Schedule**: Daily at 2am UTC (0 2 * * *)

---

### T036: [US3] Create models cache trong Upstash Redis
**Status**: ⬜ Pending
**Effort**: 30 mins
**Dependencies**: T007, T034
**Files**:
- `lib/models-cache.ts`
**Features**:
- Set models with TTL (24 hours)
- Get cached models
- Fallback to hardcoded list if cache miss

---

### T037: [US3] Implement filter logic cho ":free" models
**Status**: ⬜ Pending
**Effort**: 45 mins
**Dependencies**: T034
**Files**:
- `lib/model-filter.ts`
**Filters**:
- id contains ":free"
- id contains "qwen"
- id contains "deepseek"
- id contains "kimi"
- id contains "glm"

---

### T038: [US3] Create settings page
**Status**: ⬜ Pending
**Effort**: 1.5 hours
**Dependencies**: T003, T033
**Files**:
- `app/[locale]/settings/page.tsx`
**Features**:
- Default provider/model selection
- API quota display
- Cache management
- Theme preference
- Language preference

---

### T039: [US3] Display API quota usage
**Status**: ⬜ Pending
**Effort**: 1 hour
**Dependencies**: T004, T007
**Files**:
- `components/quota-display.tsx`
**Features**:
- Per-provider quota bars
- Refresh timestamp
- Warning when quota low

---

### T040: [US3] Implement fallback chain visualization
**Status**: ⬜ Pending
**Effort**: 1 hour
**Dependencies**: T008, T039
**Files**:
- `components/fallback-chain.tsx`
**Features**:
- Visual flow diagram
- Current active provider highlight
- Failed providers marked
- Next fallback indicator

---

## Phase 6: Polish & Deployment

### T041: Add loading states và error boundaries
**Status**: ⬜ Pending
**Effort**: 1 hour
**Dependencies**: All UI components
**Files**:
- `components/error-boundary.tsx`
- `components/loading-skeleton.tsx`
**Features**:
- Global error boundary
- Per-component error boundaries
- Skeleton loaders for async components

---

### T042: Implement toast notifications (sonner)
**Status**: ⬜ Pending
**Effort**: 30 mins
**Dependencies**: T003
**Commands**:
```bash
npm install sonner
```
**Files**:
- `components/toaster.tsx`
**Use cases**:
- Translation success
- API errors
- File upload errors
- Quota warnings

---

### T043: Create landing page với feature showcase
**Status**: ⬜ Pending
**Effort**: 2 hours
**Dependencies**: T002, T003, T010
**Files**:
- `app/[locale]/page.tsx`
**Sections**:
- Hero with CTA
- Features grid (3 columns)
- Demo video/screenshots
- Supported file formats
- AI providers logos
- Extension download CTA

---

### T044: Write README với setup instructions
**Status**: ⬜ Pending
**Effort**: 1 hour
**Dependencies**: All phases completed
**Files**:
- `web-app/README.md`
- `chrome-extension/README.md`
- `README.md` (root)
**Sections**:
- Project overview
- Features list
- Prerequisites
- Installation steps
- Environment variables setup
- Development commands
- Deployment guide
- Troubleshooting

---

### T045: Add demo video/GIFs
**Status**: ⬜ Pending
**Effort**: 1.5 hours
**Dependencies**: T043, All features working
**Tools**: Screen recording (OBS, QuickTime, etc.)
**Content**:
- Web app file upload flow
- Extension hover translation
- Extension "Translate All"
- Settings configuration
- Dark/light mode toggle

---

### T046: Setup Vercel deployment
**Status**: ⬜ Pending
**Effort**: 30 mins
**Dependencies**: T006, All web-app tasks
**Steps**:
1. Connect GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Configure build settings
4. Enable Vercel Cron
5. Test production deployment

---

### T047: Publish Chrome Extension to Web Store
**Status**: ⬜ Pending
**Effort**: 1 hour
**Dependencies**: All extension tasks
**Steps**:
1. Create developer account ($5 one-time fee)
2. Prepare store listing:
   - Description (EN + VI)
   - Screenshots (1280x800 or 640x400)
   - Promotional images
   - Privacy policy
3. Upload ZIP file
4. Submit for review (1-3 days)

---

### T048: Create user documentation
**Status**: ⬜ Pending
**Effort**: 2 hours
**Dependencies**: All phases completed
**Files**:
- `docs/user-guide-en.md`
- `docs/user-guide-vi.md`
**Sections**:
- Getting started
- Web app guide
  - File upload
  - Language selection
  - Provider selection
- Extension guide
  - Installation
  - Hover translation
  - Batch translation
  - Settings
- FAQ
- Troubleshooting
- Contact/support

---

## Summary

**Total Tasks**: 48
**Estimated Total Time**: 25-35 hours

### Progress Tracking
- ⬜ Pending: 48
- 🟡 In Progress: 0
- ✅ Completed: 0

### Critical Path
```
T001 → T008 → T013 → T017 → T023
  ↓      ↓      ↓      ↓      ↓
T005 → T024 → T030 → T031 → T047
```

### Parallel Work Opportunities
**Group A** (Web App Setup):
- T002, T003, T004, T006, T007

**Group B** (Foundation):
- T009, T010, T011, T012

**Group C** (Providers):
- T019, T020, T021, T022

**Group D** (Polish):
- T041, T042, T043, T044, T045

---

## Testing Checklist

### Web App Tests
- [ ] Upload epub file → translates → downloads with preserved format
- [ ] Upload 10MB file → progress bar updates real-time
- [ ] API key rotation works when quota exceeded
- [ ] Dark/light mode toggle persists after reload
- [ ] Language switch (Vi ↔ En) updates UI instantly
- [ ] Multiple providers fallback works correctly
- [ ] Cache hit shows instant result

### Extension Tests
- [ ] Hover text → tooltip appears <1s
- [ ] Click "Translate All" → sequential paragraph translation
- [ ] Cache hit → instant display (no API call)
- [ ] Settings persist across browser restart
- [ ] Extension works on regular websites
- [ ] Extension blocked on chrome:// pages
- [ ] Popup quick translate works

### Integration Tests
- [ ] Extension calls web app API successfully
- [ ] CORS headers allow extension origin
- [ ] Rate limiting prevents abuse
- [ ] Cron job refreshes models daily
- [ ] Redis cache TTL expires correctly

### Security Tests
- [ ] API keys not exposed in client bundle
- [ ] Input sanitization prevents XSS
- [ ] CORS only allows whitelisted origins
- [ ] Rate limiting per IP address works

---

## Deployment Checklist

### Pre-Deployment
- [ ] All 48 tasks completed
- [ ] All tests passing
- [ ] README documentation complete
- [ ] Environment variables documented
- [ ] Demo video/screenshots ready

### Web App Deployment
- [ ] Vercel project created
- [ ] Environment variables added
- [ ] Vercel Cron configured
- [ ] Custom domain configured (optional)
- [ ] Production build successful
- [ ] Live site tested

### Extension Deployment
- [ ] Chrome Web Store developer account created
- [ ] Extension built for production
- [ ] Store listing prepared (EN + VI)
- [ ] Screenshots uploaded
- [ ] Privacy policy published
- [ ] Submitted for review
- [ ] Review approved & published

---

## Post-Launch

### Monitoring
- [ ] Setup error tracking (Sentry optional)
- [ ] Monitor API quota usage
- [ ] Track extension installs
- [ ] Monitor Upstash Redis usage

### Marketing
- [ ] Post on Product Hunt
- [ ] Share on Reddit (r/sideproject, r/translator)
- [ ] Tweet announcement
- [ ] Create demo YouTube video

### Maintenance
- [ ] Weekly check of API quotas
- [ ] Monthly update of OpenRouter models
- [ ] Respond to user feedback
- [ ] Fix bugs reported in issues

---

**Last Updated**: 2025-11-11
**Spec Version**: 1.0
