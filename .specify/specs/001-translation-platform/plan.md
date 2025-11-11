# Translation Platform - Technical Plan

## Tech Stack

### Web Application
- **Framework**: Next.js 14 (App Router, Server Components, Server Actions)
- **Language**: TypeScript 5.3+
- **Styling**: TailwindCSS 3.4 + shadcn/ui
- **State Management**: Zustand
- **Internationalization**: next-intl
- **File Parsing**:
  - epub: `epub.js` (v0.3)
  - pdf: `pdf-parse` (v1.1)
  - docx: `mammoth` (v1.6)
  - txt: Native Node.js fs
- **HTTP Client**: Native fetch API
- **Caching**: Upstash Redis (free tier, 10MB)
- **Deployment**: Vercel (free tier)

### Chrome Extension
- **Manifest**: V3
- **Language**: TypeScript
- **Content Scripts**: Injected into all pages
- **Background**: Service Worker
- **Storage**: chrome.storage.local
- **UI Framework**: Preact (lightweight React)
- **Build Tool**: Webpack 5
- **Bundler**: esbuild (for speed)

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint 8 + Prettier
- **Type Checking**: TypeScript strict mode
- **Git Hooks**: husky + lint-staged
- **Testing**: (Phase 2) Vitest + Playwright

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        USER LAYER                           │
├─────────────────────┬───────────────────────────────────────┤
│   Web Application   │      Chrome Extension                 │
│   (Next.js 14)      │      (Manifest V3)                    │
└──────────┬──────────┴──────────┬────────────────────────────┘
           │                     │
           │  API Routes         │  API Client
           │                     │
┌──────────▼─────────────────────▼────────────────────────────┐
│                    API LAYER (Next.js)                      │
│  ┌────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ /translate │  │ /providers  │  │ /cron       │         │
│  └────────────┘  └─────────────┘  └─────────────┘         │
└──────────┬──────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────┐
│                  BUSINESS LOGIC LAYER                       │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ API Key        │  │ Text         │  │ File           │ │
│  │ Rotator        │  │ Chunker      │  │ Parsers        │ │
│  └────────────────┘  └──────────────┘  └────────────────┘ │
└──────────┬──────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────┐
│                  AI PROVIDERS LAYER                         │
│  ┌──────────┐ ┌────────┐ ┌─────────┐ ┌──────┐            │
│  │OpenRouter│ │ Gemini │ │ Mistral │ │ Groq │            │
│  │(12 keys) │ │(3 keys)│ │(3 keys) │ │(2keys)│            │
│  └──────────┘ └────────┘ └─────────┘ └──────┘            │
└─────────────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────┐
│                     CACHE LAYER                             │
│            Upstash Redis (Web) + chrome.storage (Ext)       │
└─────────────────────────────────────────────────────────────┘
```

---

## AI Providers Integration

### OpenRouter
```typescript
// lib/providers/openrouter.ts
interface OpenRouterConfig {
  baseURL: 'https://openrouter.ai/api/v1';
  endpoints: {
    chat: '/chat/completions';
    models: '/models';
  };
  filters: [':free', 'qwen', 'deepseek', 'kimi', 'glm'];
}

// Auto-refresh daily via Vercel Cron
// app/api/cron/refresh-models/route.ts
export async function GET() {
  const models = await fetchOpenRouterModels();
  const filtered = models.filter(m =>
    m.id.includes(':free') ||
    m.id.includes('qwen') ||
    m.id.includes('deepseek') ||
    m.id.includes('kimi') ||
    m.id.includes('glm')
  );
  await redis.set('openrouter:models', filtered, { ex: 86400 });
  return Response.json({ count: filtered.length });
}
```

### Gemini
```typescript
// lib/providers/gemini.ts
const GEMINI_MODELS = ['gemini-2.0-flash-exp'];
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
```

### Mistral
```typescript
// lib/providers/mistral.ts
const MISTRAL_MODELS = ['mistral-small-latest'];
const MISTRAL_ENDPOINT = 'https://api.mistral.ai/v1/chat/completions';
```

### Groq
```typescript
// lib/providers/groq.ts
const GROQ_MODELS = ['llama3-70b-8192', 'mixtral-8x7b-32768'];
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
```

---

## API Key Rotation Strategy

```typescript
// lib/api-key-rotator.ts
export class APIKeyRotator {
  private keys: string[];
  private currentIndex: number = 0;
  private failedAttempts: Map<string, number> = new Map();
  private readonly MAX_RETRIES = 3;

  constructor(keys: string[]) {
    this.keys = keys.filter(k => k && k.length > 0);
    if (this.keys.length === 0) {
      throw new Error('No API keys provided');
    }
  }

  async executeWithRotation<T>(
    fn: (apiKey: string) => Promise<T>
  ): Promise<T> {
    const startIndex = this.currentIndex;
    let attempts = 0;

    while (attempts < this.keys.length) {
      const currentKey = this.keys[this.currentIndex];

      try {
        const result = await fn(currentKey);
        // Success - reset failed attempts
        this.failedAttempts.delete(currentKey);
        return result;
      } catch (error: any) {
        const isQuotaError =
          error.status === 429 ||
          error.message?.includes('quota') ||
          error.message?.includes('rate limit');

        if (isQuotaError) {
          console.warn(`Key ${this.currentIndex} quota exceeded, rotating...`);
          this.rotateKey();
          attempts++;
          continue;
        }

        // Non-quota error - throw immediately
        throw error;
      }
    }

    throw new Error('All API keys exhausted');
  }

  private rotateKey(): void {
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
  }

  getCurrentKey(): string {
    return this.keys[this.currentIndex];
  }

  getStats() {
    return {
      totalKeys: this.keys.length,
      currentIndex: this.currentIndex,
      failedAttempts: Object.fromEntries(this.failedAttempts)
    };
  }
}

// Usage
const rotator = new APIKeyRotator([
  process.env.OPENROUTER_API_KEY_1!,
  process.env.OPENROUTER_API_KEY_2!,
  // ... up to 12 keys
]);

const translation = await rotator.executeWithRotation(async (apiKey) => {
  return await translateWithOpenRouter(text, apiKey);
});
```

---

## Text Chunking Algorithm

```typescript
// lib/text-chunker.ts
interface ChunkOptions {
  maxTokens: number;
  overlap: number;
  preserveSentences: boolean;
}

export class TextChunker {
  private readonly APPROX_TOKENS_PER_CHAR = 0.25; // rough estimate

  chunkText(text: string, options: ChunkOptions): string[] {
    const maxChars = options.maxTokens / this.APPROX_TOKENS_PER_CHAR;
    const overlapChars = options.overlap / this.APPROX_TOKENS_PER_CHAR;

    if (options.preserveSentences) {
      return this.chunkBySentences(text, maxChars, overlapChars);
    }

    return this.chunkBySize(text, maxChars, overlapChars);
  }

  private chunkBySentences(
    text: string,
    maxChars: number,
    overlapChars: number
  ): string[] {
    // Split by sentence boundaries
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChars) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          // Add overlap from end of previous chunk
          const overlap = currentChunk.slice(-overlapChars);
          currentChunk = overlap + sentence;
        } else {
          // Single sentence exceeds maxChars - force split
          chunks.push(sentence.trim());
        }
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private chunkBySize(
    text: string,
    maxChars: number,
    overlapChars: number
  ): string[] {
    const chunks: string[] = [];
    let position = 0;

    while (position < text.length) {
      const end = Math.min(position + maxChars, text.length);
      chunks.push(text.slice(position, end));
      position = end - overlapChars;
    }

    return chunks;
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length * this.APPROX_TOKENS_PER_CHAR);
  }
}
```

---

## File Parsing Strategy

### EPUB Parser
```typescript
// lib/file-parsers/epub-parser.ts
import ePub from 'epub';

export async function parseEpub(file: File): Promise<ParsedDocument> {
  const buffer = await file.arrayBuffer();
  const epub = await ePub(Buffer.from(buffer));

  const chapters = await extractChapters(epub);
  const metadata = extractMetadata(epub);

  return {
    content: chapters.map(ch => ch.content).join('\n\n'),
    metadata: {
      title: metadata.title,
      author: metadata.creator,
      format: 'epub'
    },
    structure: chapters.map(ch => ({
      title: ch.title,
      startIndex: ch.startIndex,
      endIndex: ch.endIndex
    }))
  };
}
```

### PDF Parser
```typescript
// lib/file-parsers/pdf-parser.ts
import pdfParse from 'pdf-parse';

export async function parsePdf(file: File): Promise<ParsedDocument> {
  const buffer = await file.arrayBuffer();
  const data = await pdfParse(Buffer.from(buffer));

  return {
    content: data.text,
    metadata: {
      title: data.info?.Title || file.name,
      pages: data.numpages,
      format: 'pdf'
    }
  };
}
```

### DOCX Parser
```typescript
// lib/file-parsers/docx-parser.ts
import mammoth from 'mammoth';

export async function parseDocx(file: File): Promise<ParsedDocument> {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });

  return {
    content: result.value,
    metadata: {
      title: file.name,
      format: 'docx'
    },
    warnings: result.messages
  };
}
```

---

## Directory Structure

```
translation-platform/
├── .specify/
│   └── specs/
│       └── 001-translation-platform/
│           ├── spec.md
│           ├── plan.md
│           └── tasks.md
│
├── web-app/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx           # Root layout + providers
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── translate/
│   │   │   │   └── page.tsx          # Translation interface
│   │   │   └── settings/
│   │   │       └── page.tsx          # Settings page
│   │   ├── api/
│   │   │   ├── translate/
│   │   │   │   └── route.ts          # Main translation endpoint
│   │   │   ├── providers/
│   │   │   │   ├── openrouter/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── gemini/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── mistral/
│   │   │   │   │   └── route.ts
│   │   │   │   └── groq/
│   │   │   │       └── route.ts
│   │   │   └── cron/
│   │   │       └── refresh-models/
│   │   │           └── route.ts
│   │   └── layout.tsx                # HTML root
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── file-upload.tsx
│   │   ├── translation-output.tsx
│   │   ├── translation-progress.tsx
│   │   ├── provider-selector.tsx
│   │   ├── quota-display.tsx
│   │   ├── theme-toggle.tsx
│   │   ├── language-switcher.tsx
│   │   └── theme-provider.tsx
│   │
│   ├── lib/
│   │   ├── api-key-rotator.ts
│   │   ├── text-chunker.ts
│   │   ├── chunked-translator.ts
│   │   ├── file-parsers/
│   │   │   ├── epub-parser.ts
│   │   │   ├── pdf-parser.ts
│   │   │   ├── docx-parser.ts
│   │   │   └── index.ts
│   │   ├── providers/
│   │   │   ├── openrouter.ts
│   │   │   ├── gemini.ts
│   │   │   ├── mistral.ts
│   │   │   ├── groq.ts
│   │   │   └── types.ts
│   │   └── utils.ts
│   │
│   ├── store/
│   │   ├── translation-store.ts
│   │   ├── settings-store.ts
│   │   └── provider-store.ts
│   │
│   ├── messages/
│   │   ├── en.json
│   │   └── vi.json
│   │
│   ├── types/
│   │   ├── translation.ts
│   │   ├── provider.ts
│   │   └── index.ts
│   │
│   ├── public/
│   │   ├── icons/
│   │   └── images/
│   │
│   ├── .env.local.example
│   ├── .eslintrc.json
│   ├── .gitignore
│   ├── next.config.js
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── README.md
│
├── chrome-extension/
│   ├── src/
│   │   ├── background/
│   │   │   └── index.ts              # Service worker
│   │   ├── content/
│   │   │   ├── injector.ts           # Inject UI into page
│   │   │   ├── selector.ts           # Text selection handler
│   │   │   ├── tooltip.tsx           # Translation tooltip
│   │   │   ├── styles.css
│   │   │   └── index.ts
│   │   ├── popup/
│   │   │   ├── index.tsx             # Extension popup
│   │   │   ├── settings.tsx
│   │   │   └── styles.css
│   │   ├── options/
│   │   │   ├── index.html
│   │   │   └── index.tsx             # Options page
│   │   ├── shared/
│   │   │   ├── api-client.ts         # API calls to web app
│   │   │   ├── cache.ts              # chrome.storage wrapper
│   │   │   ├── types.ts
│   │   │   └── constants.ts
│   │   └── types/
│   │       └── chrome.d.ts
│   │
│   ├── public/
│   │   ├── icons/
│   │   │   ├── icon16.png
│   │   │   ├── icon48.png
│   │   │   └── icon128.png
│   │   ├── manifest.json
│   │   └── _locales/
│   │       ├── en/
│   │       │   └── messages.json
│   │       └── vi/
│   │           └── messages.json
│   │
│   ├── .eslintrc.json
│   ├── .gitignore
│   ├── package.json
│   ├── tsconfig.json
│   ├── webpack.config.js
│   └── README.md
│
└── README.md                          # Project root README
```

---

## Environment Variables

```bash
# .env.local (web-app)

# OpenRouter Keys (10-12 keys for rotation)
OPENROUTER_API_KEY_1=sk-or-v1-xxx1
OPENROUTER_API_KEY_2=sk-or-v1-xxx2
OPENROUTER_API_KEY_3=sk-or-v1-xxx3
OPENROUTER_API_KEY_4=sk-or-v1-xxx4
OPENROUTER_API_KEY_5=sk-or-v1-xxx5
OPENROUTER_API_KEY_6=sk-or-v1-xxx6
OPENROUTER_API_KEY_7=sk-or-v1-xxx7
OPENROUTER_API_KEY_8=sk-or-v1-xxx8
OPENROUTER_API_KEY_9=sk-or-v1-xxx9
OPENROUTER_API_KEY_10=sk-or-v1-xxx10
OPENROUTER_API_KEY_11=sk-or-v1-xxx11
OPENROUTER_API_KEY_12=sk-or-v1-xxx12

# Gemini Keys (3-4 keys)
GEMINI_API_KEY_1=AIzaSy...
GEMINI_API_KEY_2=AIzaSy...
GEMINI_API_KEY_3=AIzaSy...

# Mistral Keys (3-4 keys)
MISTRAL_API_KEY_1=xxx
MISTRAL_API_KEY_2=xxx
MISTRAL_API_KEY_3=xxx

# Groq Keys (2-3 keys)
GROQ_API_KEY_1=gsk_xxx
GROQ_API_KEY_2=gsk_xxx

# Upstash Redis (free tier)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Vercel Cron Secret (for securing cron endpoints)
CRON_SECRET=random-secret-key-here

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Security Considerations

### API Key Protection
- ✅ API keys stored in Vercel environment variables
- ✅ Never expose keys to client-side code
- ✅ Use Server Actions for sensitive operations
- ✅ Implement rate limiting per IP address

### CORS Configuration
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.EXTENSION_ORIGIN || '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};
```

### Input Sanitization
```typescript
// lib/sanitize.ts
export function sanitizeInput(text: string): string {
  // Remove potential XSS vectors
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .trim();
}
```

---

## Performance Optimizations

### Code Splitting
```typescript
// Dynamic imports for heavy parsers
const parseEpub = () => import('@/lib/file-parsers/epub-parser');
const parsePdf = () => import('@/lib/file-parsers/pdf-parser');
const parseDocx = () => import('@/lib/file-parsers/docx-parser');
```

### Caching Strategy
```typescript
// Cache translation results
const CACHE_TTL = 7 * 24 * 60 * 60; // 7 days

async function getCachedTranslation(key: string) {
  return await redis.get(key);
}

async function setCachedTranslation(key: string, value: string) {
  await redis.set(key, value, { ex: CACHE_TTL });
}

function generateCacheKey(text: string, sourceLang: string, targetLang: string) {
  const hash = createHash('md5').update(text).digest('hex');
  return `translation:${sourceLang}:${targetLang}:${hash}`;
}
```

### Rate Limiting
```typescript
// lib/rate-limiter.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
});
```

---

## Deployment Configuration

### Vercel Configuration
```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "crons": [
    {
      "path": "/api/cron/refresh-models",
      "schedule": "0 2 * * *"
    }
  ],
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_APP_URL": "https://translate.yourdomain.com"
  }
}
```

### Chrome Extension Build
```javascript
// webpack.config.js
module.exports = {
  mode: 'production',
  entry: {
    background: './src/background/index.ts',
    content: './src/content/index.ts',
    popup: './src/popup/index.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
};
```

---

## Error Handling Strategy

### Global Error Handler
```typescript
// lib/error-handler.ts
export class TranslationError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'TranslationError';
  }
}

export function handleProviderError(error: any, provider: string): TranslationError {
  if (error.status === 429) {
    return new TranslationError(
      'API quota exceeded',
      'QUOTA_EXCEEDED',
      provider,
      true
    );
  }

  if (error.status === 401) {
    return new TranslationError(
      'Invalid API key',
      'AUTH_ERROR',
      provider,
      false
    );
  }

  return new TranslationError(
    error.message || 'Unknown error',
    'UNKNOWN_ERROR',
    provider,
    false
  );
}
```

---

## Monitoring & Logging

### Usage Analytics
```typescript
// lib/analytics.ts
export async function logTranslation(data: {
  provider: string;
  model: string;
  sourceTokens: number;
  targetTokens: number;
  duration: number;
  success: boolean;
}) {
  await redis.hincrby(`analytics:${data.provider}`, 'requests', 1);
  await redis.hincrby(`analytics:${data.provider}`, 'tokens', data.sourceTokens);

  if (!data.success) {
    await redis.hincrby(`analytics:${data.provider}`, 'errors', 1);
  }
}
```

---

## Testing Strategy (Phase 2)

### Unit Tests
- Text chunker logic
- API key rotator
- File parsers
- Cache functions

### Integration Tests
- API endpoints
- Provider integrations
- Extension messaging

### E2E Tests (Playwright)
- File upload flow
- Translation progress
- Extension hover/translate
- Dark mode toggle
- Language switching

---

## Timeline Estimate

- **Phase 1** (Setup): 2-3 hours
- **Phase 2** (Foundation): 3-4 hours
- **Phase 3** (File Translation): 6-8 hours
- **Phase 4** (Extension): 5-7 hours
- **Phase 5** (AI Management): 4-5 hours
- **Phase 6** (Polish): 3-4 hours

**Total**: ~25-35 hours of development
