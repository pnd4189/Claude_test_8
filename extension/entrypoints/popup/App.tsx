import { useEffect, useCallback } from 'react';
import { useSettingsStore } from '@/lib/storage/settings-store.ts';
import type { ProviderName, TargetLanguage, DisplayMode } from '@/lib/providers/types.ts';

/** Send message to the active tab's content script */
async function sendToActiveTab(message: Record<string, unknown>): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) await chrome.tabs.sendMessage(tab.id, message);
  } catch { /* tab may not have content script */ }
}

/** Popup width for Chrome extension */
const POPUP_STYLE = { width: 360, minHeight: 400 };

export default function App() {
  const {
    loaded, enabled, targetLang, provider, providerMode, displayMode, sourceLang,
    loadSettings, updateSettings,
  } = useSettingsStore();

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const toggleTranslation = useCallback(async () => {
    const newEnabled = !enabled;
    await updateSettings({ enabled: newEnabled });
    sendToActiveTab({ action: 'toggle-translation', enabled: newEnabled });
  }, [enabled, updateSettings]);

  const changeDisplayMode = useCallback(async (mode: DisplayMode) => {
    await updateSettings({ displayMode: mode });
    sendToActiveTab({ action: 'update-display-mode', displayMode: mode });
  }, [updateSettings]);

  if (!loaded) {
    return (
      <div style={POPUP_STYLE} className="flex items-center justify-center p-6">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div style={POPUP_STYLE} className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">AI Translation</h1>
        <button
          onClick={toggleTranslation}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Language */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Language</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-[var(--muted-foreground)]">
            Source
            <select
              value={sourceLang}
              onChange={(e) => updateSettings({ sourceLang: e.target.value as 'en' | 'zh' | 'auto' })}
              className="mt-1 block w-full rounded-md border bg-[var(--background)] px-2 py-1.5 text-sm"
            >
              <option value="auto">Auto Detect</option>
              <option value="en">English</option>
              <option value="zh">Chinese</option>
            </select>
          </label>
          <label className="text-xs text-[var(--muted-foreground)]">
            Target
            <select
              value={targetLang}
              onChange={(e) => updateSettings({ targetLang: e.target.value as TargetLanguage })}
              className="mt-1 block w-full rounded-md border bg-[var(--background)] px-2 py-1.5 text-sm"
            >
              <option value="vi">Vietnamese</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>
      </fieldset>

      {/* Provider Mode */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Mode</legend>
        <div className="flex gap-1">
          <button
            onClick={() => updateSettings({ providerMode: 'byok' })}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs transition-colors ${
              providerMode === 'byok'
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                : 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--accent)]'
            }`}
          >
            Free (BYOK)
          </button>
          <button
            onClick={() => updateSettings({ providerMode: 'proxy' })}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs transition-colors ${
              providerMode === 'proxy'
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                : 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--accent)]'
            }`}
          >
            Built-in
          </button>
        </div>
      </fieldset>

      {/* Provider (BYOK mode only) */}
      {providerMode === 'byok' ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">AI Provider</legend>
          <select
            value={provider}
            onChange={(e) => updateSettings({ provider: e.target.value as ProviderName })}
            className="block w-full rounded-md border bg-[var(--background)] px-2 py-1.5 text-sm"
          >
            <option value="gemini">Gemini</option>
            <option value="glm">GLM (ChatGLM)</option>
            <option value="groq">Groq (Llama)</option>
            <option value="qwen">Qwen (Alibaba)</option>
          </select>
          <p className="text-xs text-[var(--muted-foreground)]">Configure API keys in Settings</p>
        </fieldset>
      ) : (
        <div className="rounded-md bg-[var(--secondary)] px-3 py-2 text-xs text-[var(--secondary-foreground)]">
          Using built-in AI (Qwen) — no API key needed
        </div>
      )}

      {/* Display Mode */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Display Mode</legend>
        <div className="flex gap-1">
          {(['below', 'hover', 'side-by-side'] as DisplayMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => changeDisplayMode(mode)}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs capitalize transition-colors ${
                displayMode === mode
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--accent)]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Footer actions */}
      <div className="flex gap-2 pt-2 border-t">
        <button
          onClick={() => chrome.runtime.openOptionsPage?.()}
          className="flex-1 rounded-md bg-[var(--secondary)] px-3 py-1.5 text-xs hover:bg-[var(--accent)] transition-colors"
        >
          Settings
        </button>
        <button
          onClick={() => chrome.sidePanel?.open?.({ windowId: chrome.windows?.WINDOW_ID_CURRENT })}
          className="flex-1 rounded-md bg-[var(--secondary)] px-3 py-1.5 text-xs hover:bg-[var(--accent)] transition-colors"
        >
          Open Reader
        </button>
      </div>
    </div>
  );
}
