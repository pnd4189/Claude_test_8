# Free AI Translator - Chrome Extension

A Chrome extension for translating web content using multiple free AI providers.

## Features

- ✅ **Text Selection Translation** - Select any text on a webpage to see instant translation
- ✅ **Tooltip Display** - Hover translation tooltip with clean UI
- ✅ **Quick Translate** - Popup interface for quick translations
- ✅ **Smart Caching** - Cache translations for 30 days for instant results
- ✅ **Auto Fallback** - Automatically switches providers when quota exceeded
- 🚧 **Batch Translation** - Translate entire pages (coming soon)
- 🚧 **Settings Page** - Configure languages and providers (coming soon)

## Installation

### From Source (Development)

1. Install dependencies:
```bash
cd chrome-extension
npm install
```

2. Build the extension:
```bash
npm run build
```

3. Load in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `chrome-extension/dist` folder

### From Chrome Web Store

Coming soon! Extension will be published after review.

## Usage

### Text Selection Translation

1. Select any text on a webpage
2. A tooltip will appear with the translation
3. The tooltip shows:
   - Translated text
   - Provider used
   - Cache status (📦 Cached or ✨ Fresh)

### Quick Translate Popup

1. Click the extension icon in toolbar
2. Enter or paste text
3. Click "Translate"
4. Copy or use the translation

## Configuration

The extension connects to the translation web app API by default at `http://localhost:3000/api/translate`.

To configure:
1. Open extension popup
2. (Settings UI coming soon)
3. Update API endpoint, languages, and provider preferences

## Development

### Project Structure

```
chrome-extension/
├── src/
│   ├── background/
│   │   └── index.ts         # Service worker
│   ├── content/
│   │   ├── index.ts         # Content script
│   │   └── content.css      # Injected styles
│   ├── popup/
│   │   ├── index.tsx        # Popup UI (Preact)
│   │   └── popup.html       # Popup HTML
│   └── shared/
│       ├── types.ts         # Type definitions
│       ├── cache.ts         # Cache utilities
│       └── api-client.ts    # API client
├── public/
│   ├── manifest.json        # Extension manifest
│   └── icons/              # Extension icons
├── webpack.config.js
├── package.json
└── tsconfig.json
```

### Build Commands

```bash
# Development build (watch mode)
npm run dev

# Production build
npm run build

# Clean build artifacts
npm run clean
```

### Tech Stack

- **Framework**: Preact (lightweight React alternative)
- **Language**: TypeScript
- **Build**: Webpack 5
- **Manifest**: V3 (latest Chrome extension standard)

## API Integration

The extension calls the translation web app API:

```typescript
POST /api/translate
{
  "text": "Hello world",
  "sourceLang": "en",
  "targetLang": "vi",
  "provider": "openrouter",
  "model": "openai/gpt-3.5-turbo"
}
```

Response:
```typescript
{
  "translatedText": "Xin chào thế giới",
  "provider": "openrouter",
  "model": "openai/gpt-3.5-turbo",
  "cached": false
}
```

## Caching

The extension uses `chrome.storage.local` for persistent caching:

- **TTL**: 30 days
- **Max Size**: 1000 translations
- **Auto-cleanup**: Removes oldest entries when limit reached
- **Instant Results**: Cached translations show immediately

## Permissions

Required permissions:
- `storage` - For caching translations
- `activeTab` - For accessing current tab content
- `scripting` - For injecting content scripts
- `<all_urls>` - For translating any webpage

## Known Limitations

1. Cannot inject into:
   - `chrome://` pages
   - Chrome Web Store
   - Extension settings pages

2. Text selection limit: 500 characters (to avoid long requests)

3. Requires internet connection for fresh translations

## Troubleshooting

### Extension not working

1. Check if web app is running (`http://localhost:3000`)
2. Open browser console (F12) and check for errors
3. Try reloading the extension
4. Clear cache: Click extension icon → Clear Cache (coming soon)

### Translations slow or failing

1. Check network connection
2. Verify API endpoint in settings
3. Check if API quotas are exhausted
4. Try different provider/model

### Tooltip not appearing

1. Make sure you're selecting text (not clicking)
2. Check if page allows content scripts
3. Reload the page
4. Check browser console for errors

## Publishing to Chrome Web Store

Steps to publish:

1. Build production version:
```bash
npm run build
```

2. Create ZIP file:
```bash
cd dist
zip -r ../extension.zip *
```

3. Create developer account ($5 one-time fee)

4. Upload to Chrome Web Store Developer Dashboard

5. Fill in store listing:
   - Description (EN + VI)
   - Screenshots (1280x800 or 640x400)
   - Promotional images
   - Privacy policy

6. Submit for review (1-3 days)

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## License

MIT

## Acknowledgments

- Chrome Extension API documentation
- Preact team for the lightweight framework
- Translation API providers
