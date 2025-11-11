'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileUpload } from '@/components/file-upload';
import { TranslationProgress } from '@/components/translation-progress';
import { parseFile, detectFormatFromFilename, type FileFormat } from '@/lib/file-parsers';
import { translateWithChunks } from '@/lib/chunked-translator';
import type { TranslationChunk } from '@/store/translation-store';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
];

export default function TranslatePage() {
  const t = useTranslations();

  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('vi');
  const [provider] = useState('openrouter');
  const [model] = useState('openai/gpt-3.5-turbo');

  const [isTranslating, setIsTranslating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [translatedText, setTranslatedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setTranslatedText('');
    setError(null);
  };

  const handleTranslate = async () => {
    if (!selectedFile) return;

    setIsTranslating(true);
    setError(null);
    setProgress({ current: 0, total: 0 });

    try {
      // Parse file
      const format = detectFormatFromFilename(selectedFile.name) as FileFormat;
      const arrayBuffer = await selectedFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log(`Parsing ${format} file...`);
      const parsed = await parseFile(buffer, format);

      console.log(`Extracted ${parsed.content.length} characters`);

      // Translate with chunking
      const result = await translateWithChunks({
        text: parsed.content,
        sourceLang,
        targetLang,
        provider,
        model,
        maxTokensPerChunk: 800,
        overlap: 50,
        onProgress: (current, total) => {
          setProgress({ current, total });
        },
      });

      console.log(
        `Translation complete: ${result.successCount}/${result.totalChunks} chunks`
      );

      setTranslatedText(result.translatedText);

      if (result.failureCount > 0) {
        setError(
          `${result.failureCount} chunks failed to translate. Some content may be missing.`
        );
      }
    } catch (err) {
      console.error('Translation error:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleDownload = () => {
    if (!translatedText) return;

    const blob = new Blob([translatedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translated-${selectedFile?.name || 'document'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('home.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('home.subtitle')}
          </p>
        </div>

        {/* File Upload */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Step 1: Upload File
          </h2>

          {!selectedFile ? (
            <FileUpload onFileSelect={handleFileSelect} />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-2xl">📄</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Language Selection */}
        {selectedFile && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Step 2: Select Languages
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {t('translation.selectSource')}
                </label>
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {t('translation.selectTarget')}
                </label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleTranslate}
              disabled={isTranslating || !selectedFile}
              className="mt-6 w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
            >
              {isTranslating ? 'Translating...' : 'Start Translation'}
            </button>
          </div>
        )}

        {/* Progress */}
        {isTranslating && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <TranslationProgress
              current={progress.current}
              total={progress.total}
              status="processing"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Result */}
        {translatedText && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Translation Result
              </h2>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                {t('translation.download')}
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono">
                {translatedText}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
