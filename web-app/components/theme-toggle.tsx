'use client';

import { useTheme } from './theme-provider';
import { useTranslations } from 'next-intl';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations('settings');

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium">{t('theme')}:</label>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as any)}
        className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="light">{t('light')}</option>
        <option value="dark">{t('dark')}</option>
        <option value="system">{t('system')}</option>
      </select>
    </div>
  );
}
