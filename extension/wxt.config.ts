import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'AI Translation',
    description: 'AI-powered bilingual translation for webpages, videos, ePub & PDF',
    permissions: ['storage', 'activeTab', 'sidePanel', 'scripting', 'contextMenus'],
    default_locale: 'en',
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
