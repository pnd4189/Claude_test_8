/** General settings: language, display mode, provider selection */

import { useSettingsStore } from '@/lib/storage/settings-store.ts';
import type { ProviderName, TargetLanguage, DisplayMode } from '@/lib/providers/types.ts';

export function GeneralSection() {
  const { sourceLang, targetLang, provider, displayMode, updateSettings } = useSettingsStore();

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">General</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Language, provider, and display preferences.
        </p>
      </div>

      {/* Language */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="source-lang">Source Language</label>
          <select
            id="source-lang"
            value={sourceLang}
            onChange={(e) => updateSettings({ sourceLang: e.target.value as 'en' | 'zh' | 'auto' })}
            className="w-full rounded-md border bg-[var(--background)] px-3 py-2 text-sm"
          >
            <option value="auto">Auto Detect</option>
            <option value="en">English</option>
            <option value="zh">Chinese</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="target-lang">Target Language</label>
          <select
            id="target-lang"
            value={targetLang}
            onChange={(e) => updateSettings({ targetLang: e.target.value as TargetLanguage })}
            className="w-full rounded-md border bg-[var(--background)] px-3 py-2 text-sm"
          >
            <option value="vi">Vietnamese</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      {/* Default Provider */}
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="provider">Default AI Provider</label>
        <select
          id="provider"
          value={provider}
          onChange={(e) => updateSettings({ provider: e.target.value as ProviderName })}
          className="w-full rounded-md border bg-[var(--background)] px-3 py-2 text-sm"
        >
          <option value="gemini">Gemini (Google)</option>
          <option value="glm">GLM (ChatGLM)</option>
          <option value="groq">Groq (Llama)</option>
          <option value="qwen">Qwen (AlibabaCloud)</option>
        </select>
      </div>

      {/* Display Mode */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Display Mode</label>
        <div className="flex gap-2">
          {(['below', 'hover', 'side-by-side'] as DisplayMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => updateSettings({ displayMode: mode })}
              className={`flex-1 rounded-md px-3 py-2 text-sm capitalize transition-colors ${
                displayMode === mode
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--accent)]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
