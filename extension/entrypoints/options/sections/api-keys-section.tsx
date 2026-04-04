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
