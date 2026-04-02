# Phase 3: Settings & UI Updates

## Overview
- **Priority:** High
- **Status:** complete
- **Completed:** 2026-04-02
- **Effort:** ~2 hours
- **Description:** Update Extension settings types, default values, Popup UI to support 4 providers (Gemini, GLM, Groq, Qwen). Add provider mode selector (BYOK vs Built-in proxy).

## Context Links
- Message types & settings: `extension/lib/utils/message-types.ts`
- Settings store: `extension/lib/storage/settings-store.ts`
- Popup UI: `extension/entrypoints/popup/App.tsx`
- Background service worker: `extension/entrypoints/background.ts`

## Key Insights

- `ExtensionSettings.apiKeys` is currently `Record<ProviderName, string>` — auto-expands when ProviderName gets new values
- `DEFAULT_SETTINGS.apiKeys` needs 4 entries: `{ gemini: '', glm: '', groq: '', qwen: '' }`
- `DEFAULT_SETTINGS.provider` should remain `'gemini'` (most users have Gemini free key)
- Popup provider `<select>` currently only lists Gemini + GLM
- Need to add provider mode concept: `'byok'` (direct) vs `'proxy'` (built-in)

## Related Code Files

### Files to Modify
1. `extension/lib/utils/message-types.ts` — Update DEFAULT_SETTINGS.apiKeys, add providerMode
2. `extension/lib/storage/settings-store.ts` — Handle new providerMode field in updateSettings
3. `extension/entrypoints/popup/App.tsx` — Add Groq/Qwen to provider select, add mode toggle

## Implementation Steps

### Step 1: Update `message-types.ts`

```typescript
// Add to ExtensionSettings interface
export interface ExtensionSettings {
  targetLang: TargetLanguage;
  sourceLang: SourceLanguage;
  provider: ProviderName;
  providerMode: 'byok' | 'proxy';  // NEW
  displayMode: DisplayMode;
  enabledSites: string[];
  proxyUrl: string;
  apiKeys: Record<ProviderName, string>;
  enabled: boolean;
}

// Update DEFAULT_SETTINGS
export const DEFAULT_SETTINGS: ExtensionSettings = {
  targetLang: 'vi',
  sourceLang: 'auto',
  provider: 'gemini',
  providerMode: 'byok',  // NEW — default to BYOK
  displayMode: 'below',
  enabledSites: ['*'],
  proxyUrl: '',
  apiKeys: { gemini: '', glm: '', groq: '', qwen: '' },  // UPDATED
  enabled: true,
};
```

### Step 2: Update `settings-store.ts`

Add `providerMode` to the `updateSettings` method's spread:

```typescript
const updated: ExtensionSettings = {
  // ... existing fields ...
  providerMode: partial.providerMode ?? current.providerMode,  // NEW
};
```

### Step 3: Update Popup `App.tsx`

**a) Add provider mode toggle (BYOK vs Proxy):**

Above the provider selector, add mode toggle buttons:
```tsx
{/* Provider Mode */}
<fieldset className="space-y-2">
  <legend className="text-sm font-medium">Mode</legend>
  <div className="flex gap-1">
    <button onClick={() => updateSettings({ providerMode: 'byok' })}
      className={`flex-1 rounded-md px-2 py-1.5 text-xs ${
        providerMode === 'byok' ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
        : 'bg-[var(--secondary)] ...'}`}>
      Free (BYOK)
    </button>
    <button onClick={() => updateSettings({ providerMode: 'proxy' })}
      className={`flex-1 rounded-md px-2 py-1.5 text-xs ${
        providerMode === 'proxy' ? '...' : '...'}`}>
      Built-in
    </button>
  </div>
</fieldset>
```

**b) Update provider `<select>` to show all 4:**
```tsx
<select value={provider} onChange={...}>
  <option value="gemini">Gemini</option>
  <option value="glm">GLM (ChatGLM)</option>
  <option value="groq">Groq (Llama)</option>
  <option value="qwen">Qwen (Alibaba)</option>
</select>
```

**c) Conditionally show provider select based on mode:**
- BYOK mode → show provider selector + note about API keys
- Proxy mode → show "Using built-in AI (Qwen)" label, hide provider select

**d) Extract `providerMode` from settings store:**
```typescript
const { ..., providerMode, ... } = useSettingsStore();
```

### Step 4: Update provider-registry.ts to respect providerMode

In the `translate()` function, check mode:
- `'proxy'` mode: always try proxy first, skip BYOK direct calls
- `'byok'` mode: skip proxy, use direct calls only

```typescript
export async function translate(text, from, to, options) {
  // 1. Proxy mode OR proxy available as fallback
  if (options.providerMode === 'proxy' && options.proxyUrl) {
    try {
      const result = await proxyTranslate(text, from, to, 'qwen', { ... });
      return { translatedText: result.translatedText, usedProvider: `proxy:${result.provider}` };
    } catch {
      // proxy-only mode: throw, don't fall through to BYOK
      if (options.providerMode === 'proxy') throw new Error('Proxy unavailable');
    }
  }

  // 2. BYOK: try selected provider, then fallbacks
  // ... existing logic with 4 providers ...
}
```

## Todo List

- [x] Update `ExtensionSettings` interface — add `providerMode` field
- [x] Update `DEFAULT_SETTINGS` — add providerMode, expand apiKeys to 4 entries
- [x] Update `settings-store.ts` — handle providerMode in updateSettings
- [x] Update Popup `App.tsx` — mode toggle, 4-provider select, conditional UI
- [x] Update `provider-registry.ts` — respect providerMode in translate()
- [x] Verify TypeScript compilation passes
- [x] Manual test: toggle BYOK/Proxy mode in popup

## Success Criteria

- Settings include `providerMode: 'byok' | 'proxy'`
- Popup shows mode toggle (Free BYOK / Built-in)
- Provider selector lists all 4 providers
- BYOK mode: direct API calls with user's keys
- Proxy mode: calls proxy only, no BYOK fallback
- Existing users: backward compatible (defaults to BYOK + gemini)
- No TypeScript errors

## Risk Assessment

- **Settings migration:** Existing users have old settings without `providerMode`/new apiKeys. Mitigation: `DEFAULT_SETTINGS` spread in `loadSettings()` already handles missing fields.
- **Popup width:** Adding mode toggle may push content below fold. Mitigation: Keep mode toggle compact (2 small buttons).
