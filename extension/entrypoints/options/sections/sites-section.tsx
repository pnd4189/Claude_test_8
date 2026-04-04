/** Enabled sites list management */

import { useState } from 'react';
import { useSettingsStore } from '@/lib/storage/settings-store.ts';

export function SitesSection() {
  const { enabledSites, updateSettings } = useSettingsStore();
  const [newSite, setNewSite] = useState('');

  const addSite = () => {
    const pattern = newSite.trim();
    if (!pattern || enabledSites.includes(pattern)) return;
    updateSettings({ enabledSites: [...enabledSites, pattern] });
    setNewSite('');
  };

  const removeSite = (index: number) => {
    const updated = enabledSites.filter((_, i) => i !== index);
    updateSettings({ enabledSites: updated.length > 0 ? updated : ['*'] });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); addSite(); }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Enabled Sites</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          URL patterns where translation is active. Use <code>*</code> for all sites.
        </p>
      </div>

      {/* Site list */}
      <div className="space-y-1">
        {enabledSites.map((site, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="flex-1 rounded-md border bg-[var(--background)] px-3 py-1.5 text-sm font-mono">
              {site}
            </span>
            <button
              onClick={() => removeSite(i)}
              className="rounded-md bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Add new site */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newSite}
          onChange={(e) => setNewSite(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="*.example.com"
          className="flex-1 rounded-md border bg-[var(--background)] px-3 py-2 text-sm"
        />
        <button
          onClick={addSite}
          className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] hover:opacity-90"
        >
          Add
        </button>
      </div>
    </section>
  );
}
