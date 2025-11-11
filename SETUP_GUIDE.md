# Setup Guide - Free AI Translation Platform

Complete guide to get the translation platform running locally.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Web Application Setup](#web-application-setup)
3. [Chrome Extension Setup](#chrome-extension-setup)
4. [Getting API Keys](#getting-api-keys)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download](https://git-scm.com/)
- **Chrome Browser** (for extension)

### Required API Keys
1. **OpenRouter** (Required) - At least 1 key, recommended 10-12
2. **Upstash Redis** (Required) - Free tier available

### Optional API Keys
3. **Google Gemini** - For additional fallback
4. **Mistral AI** - For additional fallback
5. **Groq** - For additional fallback

---

## Web Application Setup

### Step 1: Clone Repository
```bash
git clone <your-repo-url>
cd Claude_test_8/web-app
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install:
- Next.js 14
- TypeScript
- TailwindCSS
- Zustand (state management)
- next-intl (i18n)
- File parsers (epub.js, pdf-parse, mammoth)
- Upstash Redis client

### Step 3: Configure Environment

1. Copy the example env file:
```bash
cp .env.local .env.local.real
```

2. Edit `.env.local.real` with your API keys:
```env
# OpenRouter Keys
OPENROUTER_API_KEY_1=sk-or-v1-xxxxxxxxxxxxx
OPENROUTER_API_KEY_2=sk-or-v1-xxxxxxxxxxxxx
# Add more keys for better rotation (up to 12)

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-db-xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 4: Run Development Server
```bash
npm run dev
```

The app will be available at: **http://localhost:3000**

### Step 5: Test the Application

1. Visit http://localhost:3000
2. Navigate to `/translate` page
3. Upload a test file (TXT is simplest)
4. Select languages
5. Click "Start Translation"

---

## Chrome Extension Setup

### Step 1: Navigate to Extension Directory
```bash
cd ../chrome-extension
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install:
- Preact (lightweight React)
- TypeScript
- Webpack 5
- Chrome types

### Step 3: Build Extension
```bash
npm run build
```

This creates a `dist/` folder with the compiled extension.

### Step 4: Load Extension in Chrome

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `chrome-extension/dist` folder
6. Extension should appear in your toolbar

### Step 5: Test Extension

1. Visit any website (e.g., Wikipedia)
2. Select some text with your mouse
3. A translation tooltip should appear
4. Click the extension icon for quick translate popup

---

## Getting API Keys

### OpenRouter (Required)

OpenRouter provides access to multiple AI models through a single API.

1. Go to [openrouter.ai](https://openrouter.ai)
2. Click "Sign In" (can use Google/GitHub)
3. Go to "Keys" section
4. Click "Create Key"
5. Copy the key (starts with `sk-or-v1-`)
6. Add to `.env.local.real`

**Tips:**
- Free tier available with rate limits
- Create multiple keys for rotation (10-12 recommended)
- Each key can be used independently
- Rotation prevents hitting quota limits

### Upstash Redis (Required)

Upstash provides serverless Redis for caching translations.

1. Go to [upstash.com](https://upstash.com)
2. Sign up (free tier available)
3. Click "Create Database"
4. Choose:
   - Type: **Redis**
   - Region: Closest to you
   - Plan: **Free** (up to 10MB)
5. After creation, go to **REST API** tab
6. Copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
7. Add both to `.env.local.real`

### Google Gemini (Optional)

1. Go to [makersuite.google.com](https://makersuite.google.com)
2. Sign in with Google account
3. Click "Get API Key"
4. Create new API key
5. Add as `GEMINI_API_KEY_1` in `.env.local.real`

### Mistral AI (Optional)

1. Go to [console.mistral.ai](https://console.mistral.ai)
2. Sign up for account
3. Navigate to API keys
4. Create new key
5. Add as `MISTRAL_API_KEY_1` in `.env.local.real`

### Groq (Optional)

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up for account
3. Get API key from dashboard
4. Add as `GROQ_API_KEY_1` in `.env.local.real`

---

## Troubleshooting

### Web App Issues

**Issue**: `npm install` fails
```bash
# Try clearing cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Issue**: Port 3000 already in use
```bash
# Use different port
npm run dev -- -p 3001
```

**Issue**: API key not working
- Check if key is valid
- Verify no extra spaces in `.env.local.real`
- Restart dev server after changing env vars

**Issue**: Translation fails
- Check browser console (F12) for errors
- Verify Redis is configured correctly
- Test Redis connection:
  ```bash
  curl -X POST "$UPSTASH_REDIS_REST_URL/SET/test/hello" \
    -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
  ```

### Chrome Extension Issues

**Issue**: Extension not loading
- Check if `dist/` folder exists
- Rebuild: `npm run build`
- Check for errors in `chrome://extensions/`

**Issue**: Extension not working on page
- Refresh the page after installing extension
- Some pages block extensions (chrome://, chrome-extension://)
- Check browser console for errors

**Issue**: Translations not appearing
- Make sure web app is running (http://localhost:3000)
- Check extension popup for errors
- Try reloading the extension

**Issue**: Build fails
```bash
# Clear and reinstall
rm -rf node_modules dist package-lock.json
npm install
npm run build
```

### General Issues

**Issue**: "Cannot find module..."
```bash
# Reinstall dependencies
cd web-app
npm install

cd ../chrome-extension
npm install
```

**Issue**: TypeScript errors
```bash
# Check TypeScript version
npx tsc --version  # Should be 5.3+

# Rebuild
npm run build
```

---

## Development Tips

### Hot Reload

The web app has hot reload enabled by default. Changes to code will automatically refresh the browser.

For extension:
```bash
# Watch mode (auto-rebuild on changes)
npm run dev
```

Then reload extension in Chrome after each build.

### VS Code Setup

Recommended extensions:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense

### Testing Files

Sample files for testing:
- **TXT**: Create any .txt file with text
- **PDF**: Any PDF document
- **DOCX**: Any Word document
- **EPUB**: Download free ebooks from [Project Gutenberg](https://www.gutenberg.org)

### Checking Logs

**Web App Logs**:
- Terminal where you ran `npm run dev`
- Browser console (F12)

**Extension Logs**:
- Chrome → Extensions → Details → Inspect views (background page)
- Browser console (F12) on any page

---

## Next Steps

After successful setup:

1. **Test File Translation**
   - Try different file types
   - Test large files (5MB+)
   - Check translation quality

2. **Test Extension**
   - Try different websites
   - Test text selection
   - Check popup translation

3. **Explore Features**
   - Switch languages
   - Toggle dark/light mode
   - Check cached vs fresh translations

4. **Optional: Deploy**
   - Follow Vercel deployment guide
   - Publish extension to Chrome Web Store

---

## Support

If you encounter issues:

1. Check this troubleshooting guide
2. Review error messages carefully
3. Check browser/terminal console logs
4. Verify all API keys are correct
5. Make sure web app is running before testing extension

For more help:
- Review `README.md` for architecture details
- Check `.specify/specs/` for specifications
- Review code comments for functionality

---

**Happy Translating! 🌐**
