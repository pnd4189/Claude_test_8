import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'en' | 'vi';

interface SettingsStore {
  theme: Theme;
  language: Language;
  defaultProvider: string;
  defaultModel: string;
  translationMode: 'tooltip' | 'inline' | 'side-by-side';

  // Actions
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setDefaultProvider: (provider: string) => void;
  setDefaultModel: (model: string) => void;
  setTranslationMode: (mode: 'tooltip' | 'inline' | 'side-by-side') => void;
  reset: () => void;
}

const defaultSettings = {
  theme: 'system' as Theme,
  language: 'en' as Language,
  defaultProvider: 'openrouter',
  defaultModel: '',
  translationMode: 'tooltip' as const,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setTheme: (theme) => {
        set({ theme });
        // Apply theme to document
        if (typeof window !== 'undefined') {
          const root = window.document.documentElement;
          if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light';
            root.classList.remove('light', 'dark');
            root.classList.add(systemTheme);
          } else {
            root.classList.remove('light', 'dark');
            root.classList.add(theme);
          }
        }
      },

      setLanguage: (language) => set({ language }),

      setDefaultProvider: (provider) => set({ defaultProvider: provider }),

      setDefaultModel: (model) => set({ defaultModel: model }),

      setTranslationMode: (mode) => set({ translationMode: mode }),

      reset: () => set(defaultSettings),
    }),
    {
      name: 'translation-settings',
      skipHydration: false,
    }
  )
);
