'use client';

import { useTranslations } from 'next-intl';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ProviderSelector } from '@/components/provider-selector';
import { QuotaDisplay } from '@/components/quota-display';
import { FallbackChain } from '@/components/fallback-chain';
import { ThemeProvider } from '@/components/theme-provider';
import Link from 'next/link';
import { useState } from 'react';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleClearCache = async () => {
    try {
      const response = await fetch('/api/cache/clear', { method: 'POST' });
      if (response.ok) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <Link
                href="/"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2 inline-block"
              >
                ← Back to Home
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('title')}
              </h1>
            </div>
          </div>

          {/* Success Message */}
          {showSuccess && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-600 dark:text-green-400">
                ✓ {t('cacheCleared')}
              </p>
            </div>
          )}

          <div className="space-y-6">
            {/* Appearance Section */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Appearance
              </h2>

              <div className="space-y-4">
                <ThemeToggle />
                <LanguageSwitcher />
              </div>
            </section>

            {/* AI Provider Settings */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                AI Provider Settings
              </h2>

              <ProviderSelector />
            </section>

            {/* Quota Usage */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <QuotaDisplay />
            </section>

            {/* Fallback Chain */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <FallbackChain />
            </section>

            {/* Cache Management */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Cache Management
              </h2>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Clear cached translations to free up space or reset the cache.
                Cached translations are stored for 7 days.
              </p>

              <button
                onClick={handleClearCache}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                {t('clearCache')}
              </button>
            </section>

            {/* System Information */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                System Information
              </h2>

              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Version:</span>
                  <span className="font-mono">1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span>Framework:</span>
                  <span>Next.js 14</span>
                </div>
                <div className="flex justify-between">
                  <span>API Endpoint:</span>
                  <span className="font-mono text-xs">
                    {process.env.NEXT_PUBLIC_APP_URL || 'localhost:3000'}
                  </span>
                </div>
              </div>
            </section>

            {/* Links */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Quick Links
              </h2>

              <div className="space-y-2">
                <Link
                  href="/translate"
                  className="block text-blue-600 dark:text-blue-400 hover:underline"
                >
                  → Translate Files
                </Link>
                <Link
                  href="/"
                  className="block text-blue-600 dark:text-blue-400 hover:underline"
                >
                  → Home
                </Link>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-600 dark:text-blue-400 hover:underline"
                >
                  → Documentation ↗
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
