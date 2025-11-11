/**
 * Background Service Worker
 * Handles messages from content scripts and popup
 */

import { translateText } from '../shared/api-client';
import { DEFAULT_SETTINGS } from '../shared/types';

console.log('Background service worker initialized');

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed');

  // Set default settings if not exists
  const result = await chrome.storage.local.get('settings');
  if (!result.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    console.log('Default settings initialized');
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);

  switch (request.type) {
    case 'TRANSLATE':
      handleTranslate(request.payload)
        .then((response) => sendResponse({ success: true, data: response }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error.message || 'Translation failed',
          })
        );
      return true; // Keep channel open for async response

    case 'GET_SETTINGS':
      chrome.storage.local
        .get('settings')
        .then((result) =>
          sendResponse({ success: true, data: result.settings || DEFAULT_SETTINGS })
        )
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;

    case 'UPDATE_SETTINGS':
      chrome.storage.local
        .set({ settings: request.payload })
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
      return false;
  }
});

/**
 * Handle translation request
 */
async function handleTranslate(payload: {
  text: string;
  sourceLang: string;
  targetLang: string;
  provider?: string;
  model?: string;
}) {
  return await translateText(payload);
}
