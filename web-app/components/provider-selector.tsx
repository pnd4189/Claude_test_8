'use client';

import { useEffect } from 'react';
import { useProviderStore } from '@/store/provider-store';
import { useTranslations } from 'next-intl';

interface ProviderSelectorProps {
  onProviderChange?: (providerId: string) => void;
  onModelChange?: (modelId: string) => void;
}

export function ProviderSelector({
  onProviderChange,
  onModelChange,
}: ProviderSelectorProps) {
  const t = useTranslations('translation');
  const {
    providers,
    selectedProvider,
    selectedModel,
    isLoading,
    setSelectedProvider,
    setSelectedModel,
    fetchProviders,
  } = useProviderStore();

  useEffect(() => {
    // Fetch providers on mount
    if (providers.length === 0) {
      fetchProviders();
    }
  }, [providers.length, fetchProviders]);

  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId);
    onProviderChange?.(providerId);
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    onModelChange?.(modelId);
  };

  const currentProvider = providers.find((p) => p.id === selectedProvider);
  const availableModels = currentProvider?.models || [];

  return (
    <div className="space-y-4">
      {/* Provider Selection */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          {t('selectProvider')}
        </label>
        <select
          value={selectedProvider}
          onChange={(e) => handleProviderChange(e.target.value)}
          disabled={isLoading}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
              {!provider.available && ' (Unavailable)'}
            </option>
          ))}
        </select>
      </div>

      {/* Model Selection */}
      {availableModels.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            {t('selectModel')}
          </label>
          <select
            value={selectedModel}
            onChange={(e) => handleModelChange(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {availableModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name || model.id}
              </option>
            ))}
          </select>

          {/* Model Info */}
          {currentProvider && selectedModel && (
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                {availableModels.find((m) => m.id === selectedModel)
                  ?.description && (
                  <p>
                    {
                      availableModels.find((m) => m.id === selectedModel)
                        ?.description
                    }
                  </p>
                )}
                {availableModels.find((m) => m.id === selectedModel)
                  ?.context_length && (
                  <p>
                    Context:{' '}
                    {availableModels
                      .find((m) => m.id === selectedModel)
                      ?.context_length?.toLocaleString()}{' '}
                    tokens
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Loading providers...
        </div>
      )}
    </div>
  );
}
