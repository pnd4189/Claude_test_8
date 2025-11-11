import { create } from 'zustand';

export interface AIModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
}

export interface AIProvider {
  id: string;
  name: string;
  models: AIModel[];
  available: boolean;
  quotaUsed?: number;
  quotaLimit?: number;
  lastError?: string;
}

interface ProviderStore {
  providers: AIProvider[];
  selectedProvider: string;
  selectedModel: string;
  isLoading: boolean;
  error: string | null;

  // Actions
  setProviders: (providers: AIProvider[]) => void;
  updateProvider: (id: string, updates: Partial<AIProvider>) => void;
  setSelectedProvider: (providerId: string) => void;
  setSelectedModel: (modelId: string) => void;
  fetchProviders: () => Promise<void>;
  fetchModels: (providerId: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useProviderStore = create<ProviderStore>((set, get) => ({
  providers: [],
  selectedProvider: 'openrouter',
  selectedModel: '',
  isLoading: false,
  error: null,

  setProviders: (providers) => set({ providers }),

  updateProvider: (id, updates) =>
    set((state) => ({
      providers: state.providers.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  setSelectedProvider: (providerId) => {
    set({ selectedProvider: providerId });
    // Auto-select first model if available
    const provider = get().providers.find((p) => p.id === providerId);
    if (provider?.models.length) {
      set({ selectedModel: provider.models[0].id });
    }
  },

  setSelectedModel: (modelId) => set({ selectedModel: modelId }),

  fetchProviders: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/providers');
      if (!response.ok) throw new Error('Failed to fetch providers');

      const data = await response.json();
      set({ providers: data.providers, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  fetchModels: async (providerId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/providers/${providerId}/models`);
      if (!response.ok) throw new Error('Failed to fetch models');

      const data = await response.json();

      set((state) => ({
        providers: state.providers.map((p) =>
          p.id === providerId ? { ...p, models: data.models } : p
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
