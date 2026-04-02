/** Zustand store for extension settings, synced with chrome.storage.local */

import { create } from 'zustand';
import type { ExtensionSettings } from '../utils/message-types.ts';
import { DEFAULT_SETTINGS } from '../utils/message-types.ts';

interface SettingsState extends ExtensionSettings {
  loaded: boolean;
  /** Load settings from chrome.storage.local */
  loadSettings: () => Promise<void>;
  /** Update partial settings and persist to chrome.storage.local */
  updateSettings: (partial: Partial<ExtensionSettings>) => Promise<void>;
  /** Reset to defaults */
  resetSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  loaded: false,

  async loadSettings() {
    try {
      const stored = await chrome.storage.local.get('settings');
      if (stored.settings) {
        set({ ...DEFAULT_SETTINGS, ...stored.settings, loaded: true });
      } else {
        // First run — persist defaults
        await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
        set({ loaded: true });
      }
    } catch {
      // Fallback for non-extension context (dev)
      set({ loaded: true });
    }
  },

  async updateSettings(partial) {
    const current = get();
    const updated: ExtensionSettings = {
      targetLang: partial.targetLang ?? current.targetLang,
      sourceLang: partial.sourceLang ?? current.sourceLang,
      provider: partial.provider ?? current.provider,
      providerMode: partial.providerMode ?? current.providerMode,
      displayMode: partial.displayMode ?? current.displayMode,
      enabledSites: partial.enabledSites ?? current.enabledSites,
      proxyUrl: partial.proxyUrl ?? current.proxyUrl,
      apiKeys: partial.apiKeys ?? current.apiKeys,
      enabled: partial.enabled ?? current.enabled,
    };
    set(updated);
    try {
      await chrome.storage.local.set({ settings: updated });
    } catch {
      // Non-extension context
    }
  },

  async resetSettings() {
    set({ ...DEFAULT_SETTINGS });
    try {
      await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    } catch {
      // Non-extension context
    }
  },
}));
