'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeProvider } from '@/components/theme-provider';

export default function HomePage() {
  const t = useTranslations();

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        {/* Header */}
        <header className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('common.appName')}
            </h1>

            <div className="flex items-center gap-4">
              <Link
                href="/settings"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                ⚙️ Settings
              </Link>
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            {/* Title */}
            <div className="mb-8">
              <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
                {t('home.title')}
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                {t('home.subtitle')}
              </p>
            </div>

            {/* CTA Button */}
            <div className="mb-16">
              <Link
                href="/translate"
                className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-lg shadow-lg transition-colors"
              >
                Start Translating →
              </Link>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              {/* Feature 1 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                <div className="text-4xl mb-4">📄</div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                  File Translation
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upload EPUB, PDF, DOCX, or TXT files and translate them
                  instantly
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                  Multiple AI Providers
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Automatic fallback across OpenRouter, Gemini, and
                  Groq
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                  Smart Chunking
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Handles large documents by intelligently splitting into chunks
                </p>
              </div>
            </div>

            {/* Supported Formats */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                {t('home.supportedFormats')}
              </h3>

              <div className="flex flex-wrap justify-center gap-4">
                <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                  EPUB
                </span>
                <span className="px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm font-medium">
                  PDF
                </span>
                <span className="px-4 py-2 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm font-medium">
                  DOCX
                </span>
                <span className="px-4 py-2 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-full text-sm font-medium">
                  TXT
                </span>
              </div>

              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                {t('home.maxSize')}
              </p>
            </div>

            {/* Extension Teaser */}
            <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
              <div className="text-3xl mb-4">🔌</div>
              <h3 className="text-2xl font-bold mb-2">
                Chrome Extension Coming Soon!
              </h3>
              <p className="text-blue-100 mb-4">
                Translate web content directly in your browser with hover
                tooltips
              </p>
              <button
                disabled
                className="px-6 py-3 bg-white/20 text-white rounded-lg cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-8 mt-16 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              Free AI Translator - Built with Next.js 14, OpenRouter, and ❤️
            </p>
            <p className="mt-2">
              Supports 10+ languages with automatic fallback across multiple AI
              providers
            </p>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}
