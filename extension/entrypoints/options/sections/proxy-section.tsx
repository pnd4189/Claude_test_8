/** Proxy URL and provider mode configuration */

import { useSettingsStore } from '@/lib/storage/settings-store.ts';

export function ProxySection() {
  const { proxyUrl, providerMode, updateSettings } = useSettingsStore();

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Translation Mode</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Choose between your own API keys or the built-in proxy.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Provider Mode</label>
        <div className="flex gap-2">
          <button
            onClick={() => updateSettings({ providerMode: 'byok' })}
            className={`flex-1 rounded-md px-3 py-2 text-sm transition-colors ${
              providerMode === 'byok'
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                : 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--accent)]'
            }`}
          >
            Free (BYOK)
          </button>
          <button
            onClick={() => updateSettings({ providerMode: 'proxy' })}
            className={`flex-1 rounded-md px-3 py-2 text-sm transition-colors ${
              providerMode === 'proxy'
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                : 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--accent)]'
            }`}
          >
            Built-in Proxy
          </button>
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">
          {providerMode === 'byok'
            ? 'Uses your own API keys — free, no limits.'
            : 'Uses built-in AI (Qwen) — no key needed, shared quota.'}
        </p>
      </div>

      {/* Proxy URL */}
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="proxy-url">
          Proxy Server URL
        </label>
        <input
          id="proxy-url"
          type="url"
          value={proxyUrl}
          placeholder="https://your-proxy.workers.dev"
          onChange={(e) => updateSettings({ proxyUrl: e.target.value })}
          className="w-full rounded-md border bg-[var(--background)] px-3 py-2 text-sm"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          {providerMode === 'proxy'
            ? 'Required for Built-in mode.'
            : 'Optional fallback when BYOK fails.'}
        </p>
      </div>
    </section>
  );
}
