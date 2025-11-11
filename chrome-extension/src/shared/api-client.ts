/**
 * API Client for calling translation web app
 */

import type { TranslationRequest, TranslationResponse, ExtensionSettings } from './types';
import { getCachedTranslation, setCachedTranslation } from './cache';

/**
 * Get extension settings
 */
async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get('settings');
  return result.settings || {
    apiEndpoint: 'http://localhost:3000/api/translate',
    defaultProvider: 'openrouter',
    defaultModel: 'openai/gpt-3.5-turbo',
  };
}

/**
 * Translate text via API
 */
export async function translateText(
  request: TranslationRequest
): Promise<TranslationResponse> {
  const settings = await getSettings();

  // Check cache first
  const cached = await getCachedTranslation(
    request.text,
    request.sourceLang,
    request.targetLang,
    request.provider || settings.defaultProvider
  );

  if (cached) {
    console.log('Cache hit for translation');
    return {
      translatedText: cached,
      provider: request.provider || settings.defaultProvider,
      model: request.model || settings.defaultModel,
      cached: true,
    };
  }

  // Call API
  try {
    const response = await fetch(settings.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: request.text,
        sourceLang: request.sourceLang,
        targetLang: request.targetLang,
        provider: request.provider || settings.defaultProvider,
        model: request.model || settings.defaultModel,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Translation failed');
    }

    const data: TranslationResponse = await response.json();

    // Cache the result
    await setCachedTranslation(
      request.text,
      data.translatedText,
      request.sourceLang,
      request.targetLang,
      data.provider
    );

    return data;
  } catch (error) {
    console.error('Translation API error:', error);
    throw error;
  }
}

/**
 * Translate multiple texts in batch
 */
export async function translateBatch(
  texts: string[],
  sourceLang: string,
  targetLang: string,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const results: string[] = [];

  for (let i = 0; i < texts.length; i++) {
    try {
      const response = await translateText({
        text: texts[i],
        sourceLang,
        targetLang,
      });

      results.push(response.translatedText);
      onProgress?.(i + 1, texts.length);
    } catch (error) {
      console.error(`Failed to translate text ${i + 1}:`, error);
      results.push(texts[i]); // Keep original text on error
    }
  }

  return results;
}
