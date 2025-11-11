# Deployment Guide - Translation Platform

Complete guide for deploying the web application and publishing the Chrome extension.

## Table of Contents
1. [Web Application Deployment (Vercel)](#web-application-deployment)
2. [Chrome Extension Publishing](#chrome-extension-publishing)
3. [Environment Configuration](#environment-configuration)
4. [Post-Deployment](#post-deployment)

---

## Web Application Deployment

### Prerequisites
- Vercel account (free tier available)
- GitHub repository with the code
- All required API keys
- Upstash Redis database created

### Step 1: Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Select `web-app` as the root directory

### Step 2: Configure Build Settings

Vercel should auto-detect Next.js, but verify:

```
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm install
Root Directory: web-app
```

### Step 3: Add Environment Variables

In Vercel dashboard → Settings → Environment Variables, add:

```bash
# OpenRouter Keys (Required)
OPENROUTER_API_KEY_1=sk-or-v1-xxxxx
OPENROUTER_API_KEY_2=sk-or-v1-xxxxx
# ... add all your keys (up to 12)

# Upstash Redis (Required)
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# Optional: Additional Providers
GEMINI_API_KEY_1=AIzaSy...
MISTRAL_API_KEY_1=xxx
GROQ_API_KEY_1=gsk_xxx

# Cron Secret (generate random string)
CRON_SECRET=your-random-secret-here

# Public URL (will be your Vercel domain)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Step 4: Deploy

1. Click "Deploy"
2. Wait for build to complete (~2-3 minutes)
3. Your app will be live at: `https://your-app.vercel.app`

### Step 5: Configure Custom Domain (Optional)

1. Go to Settings → Domains
2. Add your custom domain
3. Configure DNS records as shown
4. Update `NEXT_PUBLIC_APP_URL` environment variable

### Step 6: Enable Cron Jobs

The platform includes a cron job to refresh AI models daily.

1. Verify `vercel.json` has cron configuration:
```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-models",
      "schedule": "0 2 * * *"
    }
  ]
}
```

2. Cron will automatically run after deployment
3. Monitor in Vercel dashboard → Deployments → Functions

---

## Chrome Extension Publishing

### Prerequisites
- Chrome Web Store developer account ($5 one-time fee)
- Built extension (production build)
- Store assets (icons, screenshots, descriptions)

### Step 1: Build Extension for Production

```bash
cd chrome-extension
npm install
npm run build
```

This creates a `dist/` folder with production-ready files.

### Step 2: Create ZIP Package

```bash
cd dist
zip -r ../extension.zip *
cd ..
```

You now have `extension.zip` ready for upload.

### Step 3: Create Developer Account

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay $5 one-time registration fee
3. Complete developer profile

### Step 4: Prepare Store Listing

Create the following assets:

**Icons** (already in `public/icons/`):
- 16x16px (icon16.png)
- 48x48px (icon48.png)
- 128x128px (icon128.png)

**Screenshots** (capture from browser):
- 1280x800px or 640x400px
- Show key features:
  - Text selection translation
  - Tooltip appearance
  - Popup interface
  - Settings page

**Promotional Images** (optional):
- Small tile: 440x280px
- Large tile: 920x680px
- Marquee: 1400x560px

### Step 5: Fill Store Listing

**English Listing**:
```
Title: Free AI Translator - Multi-Provider Translation

Short Description:
Translate web content instantly using multiple free AI providers with automatic fallback

Description:
Free AI Translator brings powerful translation capabilities to your browser.

Features:
• Select any text to see instant translation
• Clean, unobtrusive tooltip interface
• Quick translate popup
• 30-day translation caching
• Automatic fallback across multiple AI providers
• Supports 10+ languages
• Works on all websites

The extension connects to a free translation API that uses OpenRouter, Gemini, Mistral, and Groq for reliable translations even when one provider is unavailable.

Privacy-focused: We only store translation cache locally in your browser.

Free and open-source. No tracking, no ads, no data collection.
```

**Vietnamese Listing** (same format in Vietnamese)

### Step 6: Configure Extension

**Category**: Productivity
**Language**: English (add Vietnamese as additional)
**Visibility**: Public

**Permissions Justification**:
- `storage`: Required for caching translations locally
- `activeTab`: Required for accessing current page content
- `scripting`: Required for injecting translation UI
- `<all_urls>`: Required for translating any website

### Step 7: Privacy Practice

Create a privacy policy page (can be on your deployed web app):

```
Privacy Policy - Free AI Translator

Data Collection:
We do NOT collect any personal data. All translation cache is stored locally in your browser using chrome.storage.local.

API Usage:
When you translate text, it is sent to our translation API which uses third-party AI providers (OpenRouter, Gemini, Mistral, Groq). These providers may process your text according to their privacy policies.

No Tracking:
We do not use analytics, tracking pixels, or any data collection tools.

Contact:
[Your email or contact page]
```

Add privacy policy URL in manifest and store listing.

### Step 8: Submit for Review

1. Upload `extension.zip`
2. Fill all required fields
3. Add screenshots
4. Add privacy policy URL
5. Save draft and preview
6. Click "Submit for Review"

**Review Timeline**: Usually 1-3 business days

### Step 9: After Approval

1. Extension will be live on Chrome Web Store
2. Share your extension URL: `https://chrome.google.com/webstore/detail/[your-id]`
3. Update `web-app` homepage with extension link
4. Announce on social media, Product Hunt, etc.

---

## Environment Configuration

### Production Environment Variables

**Critical Variables**:
```bash
# Must Have
OPENROUTER_API_KEY_1=...  # At least 1 key
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Recommended
OPENROUTER_API_KEY_2 through _12  # For rotation
CRON_SECRET=...  # Secure cron endpoint
```

**Optional Variables**:
```bash
# Additional providers for fallback
GEMINI_API_KEY_1=...
MISTRAL_API_KEY_1=...
GROQ_API_KEY_1=...
```

### Security Best Practices

1. **API Keys**:
   - Use unique keys for production
   - Rotate keys regularly
   - Never commit keys to git
   - Use Vercel's encrypted environment variables

2. **Cron Secret**:
   - Generate strong random string
   - Keep it secret
   - Regenerate if compromised

3. **Rate Limiting**:
   - Default: 10 requests/minute per IP
   - Adjust in `lib/redis.ts` if needed

4. **CORS**:
   - Configure allowed origins in production
   - Restrict to your extension's origin

---

## Post-Deployment

### Monitoring

**Vercel Dashboard**:
- Deployment status
- Function logs
- Analytics (if enabled)
- Cron job execution

**Upstash Dashboard**:
- Redis usage
- Cache hit rate
- Storage used

**Chrome Web Store Dashboard**:
- Install count
- User reviews
- Crash reports

### Maintenance Tasks

**Weekly**:
- Check API quota usage
- Review error logs
- Monitor Redis storage

**Monthly**:
- Update dependencies
- Review security updates
- Check for new AI models

**As Needed**:
- Rotate API keys
- Update extension (requires review)
- Respond to user feedback

### Updating the Extension

1. Make changes to code
2. Update version in `manifest.json`
3. Build: `npm run build`
4. Create new ZIP
5. Upload to Chrome Web Store
6. Submit for review
7. Update automatically pushed to users after approval

### Updating the Web App

Vercel auto-deploys on git push:

```bash
git add .
git commit -m "feat: your changes"
git push origin main
```

Vercel builds and deploys automatically.

### Scaling Considerations

**If Usage Grows**:

1. **Upgrade Upstash**: Move from free to paid tier
2. **Add More Keys**: Increase API key count
3. **Optimize Caching**: Extend TTL, improve hit rate
4. **Add CDN**: Use Vercel's edge functions
5. **Monitor Costs**: Track API usage across providers

### Troubleshooting Production Issues

**High API Costs**:
- Check if caching is working
- Verify TTL settings
- Review request patterns

**Extension Not Working**:
- Check API endpoint URL
- Verify CORS settings
- Review extension permissions

**Slow Translations**:
- Check Redis latency
- Verify API response times
- Consider using faster models

**Cron Job Failing**:
- Verify CRON_SECRET matches
- Check function logs in Vercel
- Ensure Redis is accessible

---

## Rollback Procedure

### Web App Rollback

In Vercel dashboard:
1. Go to Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

### Extension Rollback

1. Upload previous version ZIP
2. Update version number (increment)
3. Submit for expedited review
4. Explain urgency in review notes

---

## Success Metrics

Track these KPIs:

**Web App**:
- Daily active users
- Translation requests/day
- Average translation time
- Cache hit rate
- API error rate

**Extension**:
- Install count
- Active users
- Daily translations
- User reviews/ratings
- Crash rate

**Business**:
- Cost per translation
- API quota utilization
- User retention
- Feature usage

---

## Support & Resources

**Documentation**:
- [Vercel Docs](https://vercel.com/docs)
- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [Upstash Docs](https://docs.upstash.com/)

**Help**:
- Vercel Support (in dashboard)
- Chrome Web Store Support
- Project GitHub Issues

---

**Deployment Checklist**:
- [ ] Web app deployed to Vercel
- [ ] All environment variables set
- [ ] Cron job running
- [ ] Extension built for production
- [ ] Extension submitted to Chrome Web Store
- [ ] Privacy policy published
- [ ] Monitoring set up
- [ ] Documentation updated
- [ ] Users notified

**Congratulations! Your translation platform is live! 🚀**
