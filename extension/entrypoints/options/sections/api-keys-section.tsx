/** API key configuration for all 4 providers */

import { useState } from 'react';
import { useSettingsStore } from '@/lib/storage/settings-store.ts';
import type { ProviderName } from '@/lib/providers/types.ts';

const PROVIDERS: { id: ProviderName; label: string; placeholder: string }[] = [
  { id: 'gemini', label: 'Gemini (Google)', placeholder: 'AIza...' },
  { id: 'glm', label: 'GLM (Z.AI / ChatGLM)', placeholder: 'Bearer token...' },
  { id: 'groq', label: 'Groq (Llama)', placeholder: 'gsk_...' },
  { id: 'qwen', label: 'Qwen (AlibabaCloud)', placeholder: 'sk-...' },
];

export function ApiKeysSection() {
  const { apiKeys, updateSettings } = useSettingsStore();
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  const toggleVisible = (id: string) =>
    setVisible((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleChange = (id: ProviderName, value: string) => {
    const updated = { ...apiKeys, [id]: value };
    updateSettings({ apiKeys: updated });
    setSaved(false);
  };

  const handleSave = () => setSaved(true);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">API Keys</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Enter your own API keys for BYOK (Bring Your Own Key) mode.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-600 dark:bg-amber-950/40">
        <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
        <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200">
          Your API keys are stored locally in Chrome&apos;s storage. Keep your browser secure and don&apos;t share this device with untrusted users.
        </p>
      </div>

      {PROVIDERS.map(({ id, label, placeholder }) => (
        <div key={id} className="space-y-1">
          <label className="text-sm font-medium" htmlFor={`key-${id}`}>
            {label}
          </label>
          <div className="flex gap-2">
            <input
              id={`key-${id}`}
              type={visible[id] ? 'text' : 'password'}
              value={apiKeys[id] || ''}
              placeholder={placeholder}
              onChange={(e) => handleChange(id, e.target.value)}
              className="flex-1 rounded-md border bg-[var(--background)] px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => toggleVisible(id)}
              className="rounded-md bg-[var(--secondary)] px-3 py-2 text-xs hover:bg-[var(--accent)]"
            >
              {visible[id] ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={handleSave}
        className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] hover:opacity-90"
      >
        {saved ? '✓ Saved' : 'Save Keys'}
      </button>
    </section>
  );
}
