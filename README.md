# Free AI Translation Platform

A comprehensive translation platform featuring:
- **Web Application** (Next.js 14) - Translate files and text
- **Chrome Extension** (Manifest V3) - Translate web content in real-time

## Features

### File Translation (✅ Completed)
- Upload EPUB, PDF, DOCX, or TXT files
- Auto-detect source language
- Smart chunking for large documents (handles 50MB+ files)
- Progress tracking with real-time updates
- Download translated files

### AI Provider Management (✅ In Progress)
- Multiple AI providers: OpenRouter, Gemini, Mistral, Groq
- Automatic API key rotation (10-12 keys per provider)
- Smart fallback when quota exhausted
- Auto-refresh models daily

### Chrome Extension (🚧 Coming Soon)
- Hover translation tooltips
- Batch translation mode
- Cache for instant results
- Side-by-side view

## Tech Stack

### Web Application
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State**: Zustand
- **i18n**: next-intl (English + Vietnamese)
- **Caching**: Upstash Redis
- **Deployment**: Vercel

### File Parsers
- EPUB: epub.js
- PDF: pdf-parse
- DOCX: mammoth
- TXT: Native Node.js

## Project Structure

```
.specify/specs/001-translation-platform/
├── spec.md   # Feature requirements
├── plan.md   # Technical architecture
└── tasks.md  # Implementation checklist

web-app/
├── app/
│   ├── [locale]/      # i18n routing
│   ├── api/          # API routes
│   └── layout.tsx
├── components/       # UI components
├── lib/
│   ├── providers/   # AI provider integrations
│   ├── file-parsers/
│   ├── api-key-rotator.ts
│   ├── text-chunker.ts
│   └── chunked-translator.ts
├── store/           # Zustand stores
├── messages/        # i18n translations
└── types/

chrome-extension/ (Coming Soon)
```

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- API keys for OpenRouter (and optionally Gemini, Mistral, Groq)
- Upstash Redis account (free tier)

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd Claude_test_8
```

2. Install dependencies:
```bash
cd web-app
npm install
```

3. Create `.env.local`:
```bash
cp .env.local.example .env.local
```

4. Add your API keys to `.env.local`:
```env
# OpenRouter Keys (minimum 1, recommended 10-12)
OPENROUTER_API_KEY_1=sk-or-v1-xxx
OPENROUTER_API_KEY_2=sk-or-v1-xxx
...

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

5. Run development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Usage

### File Translation

1. Navigate to `/translate` page
2. Upload a file (EPUB, PDF, DOCX, or TXT)
3. Select source and target languages
4. Click "Start Translation"
5. Download the translated file

### Supported Languages
- English, Vietnamese, Chinese, Japanese, Korean
- French, German, Spanish, Portuguese, Russian

### File Size Limits
- EPUB/PDF: 50MB max
- DOCX/TXT: 10MB max

## API Key Rotation

The platform automatically rotates through multiple API keys to handle quota limits:

```typescript
// Automatically tries all keys until success
OPENROUTER_API_KEY_1 → OPENROUTER_API_KEY_2 → ... → OPENROUTER_API_KEY_12
```

When all keys are exhausted, the user receives a clear error message.

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy!

The platform includes:
- Automatic model refresh cron job (daily at 2am UTC)
- Edge caching for translations
- Rate limiting (10 requests/minute per IP)

## Development Roadmap

- [x] Phase 1: Setup infrastructure
- [x] Phase 2: Foundational components
- [x] Phase 3: File translation feature
- [ ] Phase 4: Chrome Extension
- [ ] Phase 5: AI provider management UI
- [ ] Phase 6: Polish and deployment

## Contributing

This project follows the **spec-kit methodology**:
- `spec.md` - What & Why (requirements)
- `plan.md` - How (technical design)
- `tasks.md` - Implementation checklist

See `.specify/specs/001-translation-platform/` for details.

## License

MIT

## Acknowledgments

- Next.js team for the amazing framework
- OpenRouter for providing access to multiple AI models
- Upstash for free Redis tier
- All the open-source file parser libraries
