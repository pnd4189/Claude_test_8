/**
 * Shared types for Chrome Extension
 */

export interface TranslationRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
  provider?: string;
  model?: string;
}

export interface TranslationResponse {
  translatedText: string;
  provider: string;
  model: string;
  cached: boolean;
}

export interface CachedTranslation {
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  provider: string;
  timestamp: number;
}

export interface ExtensionSettings {
  apiEndpoint: string;
  defaultSourceLang: string;
  defaultTargetLang: string;
  defaultProvider: string;
  defaultModel: string;
  translationMode: 'tooltip' | 'inline' | 'side-by-side';
  enableCache: boolean;
  showShortcut: boolean;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  apiEndpoint: 'http://localhost:3000/api/translate',
  defaultSourceLang: 'en',
  defaultTargetLang: 'vi',
  defaultProvider: 'openrouter',
  defaultModel: 'openai/gpt-3.5-turbo',
  translationMode: 'tooltip',
  enableCache: true,
  showShortcut: true,
};
