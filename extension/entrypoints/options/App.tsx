/** Extension options page — full settings UI for API keys, proxy, sites, and preferences */

import { useEffect } from 'react';
import { useSettingsStore } from '@/lib/storage/settings-store.ts';
import { ApiKeysSection } from './sections/api-keys-section.tsx';
import { ProxySection } from './sections/proxy-section.tsx';
import { GeneralSection } from './sections/general-section.tsx';
import { SitesSection } from './sections/sites-section.tsx';

export default function App() {
  const { loaded, loadSettings, resetSettings } = useSettingsStore();

  useEffect(() => { loadSettings(); }, [loadSettings]);

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--muted-foreground)]">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold">AI Translation Settings</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Configure API keys, translation mode, and preferences.
        </p>
      </header>

      <div className="space-y-8 divide-y divide-[var(--border)]">
        <ApiKeysSection />
        <div className="pt-6"><ProxySection /></div>
        <div className="pt-6"><GeneralSection /></div>
        <div className="pt-6"><SitesSection /></div>
      </div>

      {/* Reset */}
      <div className="border-t pt-6">
        <button
          onClick={() => {
            if (confirm('Reset all settings to defaults?')) resetSettings();
          }}
          className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
