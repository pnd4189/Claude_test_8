'use client';

import { useEffect, useState } from 'react';
import { useProviderStore } from '@/store/provider-store';

export function QuotaDisplay() {
  const { providers } = useProviderStore();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    // Fetch quota stats from API
    fetchQuotaStats();
  }, []);

  const fetchQuotaStats = async () => {
    try {
      const response = await fetch('/api/providers/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch quota stats:', error);
    }
  };

  if (!stats) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        API Quota Usage
      </h3>

      {providers.map((provider) => {
        const providerStats = stats.providers?.[provider.id];
        const quotaUsed = providerStats?.requestsToday || 0;
        const quotaLimit = 1000; // Example limit
        const percentage = (quotaUsed / quotaLimit) * 100;

        return (
          <div key={provider.id} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {provider.name}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {quotaUsed.toLocaleString()} / {quotaLimit.toLocaleString()}
              </span>
            </div>

            <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`absolute left-0 top-0 h-full transition-all duration-300 rounded-full ${
                  percentage > 80
                    ? 'bg-red-500'
                    : percentage > 60
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{percentage.toFixed(1)}% used</span>
              {providerStats?.lastUsed && (
                <span>
                  Last used:{' '}
                  {new Date(providerStats.lastUsed).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        );
      })}

      <button
        onClick={fetchQuotaStats}
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
      >
        Refresh
      </button>
    </div>
  );
}
