'use client';

import { useProviderStore } from '@/store/provider-store';

export function FallbackChain() {
  const { providers, selectedProvider } = useProviderStore();

  // Define fallback order
  const fallbackOrder = ['openrouter', 'gemini', 'mistral', 'groq'];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Fallback Chain
      </h3>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        When a provider fails or runs out of quota, the system automatically
        tries the next one:
      </p>

      <div className="relative">
        {fallbackOrder.map((providerId, index) => {
          const provider = providers.find((p) => p.id === providerId);
          if (!provider) return null;

          const isActive = providerId === selectedProvider;
          const isAvailable = provider.available;

          return (
            <div key={providerId} className="flex items-center gap-3 mb-3">
              {/* Step Number */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isAvailable
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                }`}
              >
                {index + 1}
              </div>

              {/* Provider Info */}
              <div
                className={`flex-1 p-3 rounded-lg border ${
                  isActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : isAvailable
                      ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {provider.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {provider.models.length} models available
                    </p>
                  </div>

                  {isActive && (
                    <span className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded">
                      Active
                    </span>
                  )}

                  {!isAvailable && (
                    <span className="px-2 py-1 text-xs font-medium bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                      Unavailable
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              {index < fallbackOrder.length - 1 && (
                <div className="absolute left-4 mt-11 w-0.5 h-3 bg-gray-300 dark:bg-gray-600" />
              )}
            </div>
          );
        })}
      </div>

      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          💡 <strong>Tip:</strong> The system tries each provider in order
          until one succeeds. Configure multiple API keys per provider for best
          reliability.
        </p>
      </div>
    </div>
  );
}
