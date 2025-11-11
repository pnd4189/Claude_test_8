'use client';

import { useTranslations } from 'next-intl';

interface TranslationProgressProps {
  current: number;
  total: number;
  status?: 'idle' | 'processing' | 'completed' | 'failed';
  onCancel?: () => void;
}

export function TranslationProgress({
  current,
  total,
  status = 'processing',
  onCancel,
}: TranslationProgressProps) {
  const t = useTranslations('translation');
  const progress = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full space-y-3">
      {/* Status Text */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {status === 'processing' && t('translating', { progress })}
          {status === 'completed' && t('completed')}
          {status === 'failed' && 'Translation failed'}
        </p>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('chunks', { current, total })}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full transition-all duration-300 rounded-full ${
            status === 'failed'
              ? 'bg-red-500'
              : status === 'completed'
                ? 'bg-green-500'
                : 'bg-blue-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Cancel Button */}
      {status === 'processing' && onCancel && (
        <button
          onClick={onCancel}
          className="text-sm text-red-600 dark:text-red-400 hover:underline"
        >
          {t('cancel', { defaultValue: 'Cancel' })}
        </button>
      )}
    </div>
  );
}
