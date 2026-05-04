/** Chrome extension message type definitions for background ↔ content ↔ popup communication */

import type { SourceLanguage, TargetLanguage, ProviderName, DisplayMode } from '../providers/types.ts';

// Message action types
export type MessageAction =
  | 'translate'
  | 'batch-translate'
  | 'get-settings'
  | 'update-settings'
  | 'clear-cache'
  | 'get-cache-stats';

// Base message shape
export interface BaseMessage {
  action: MessageAction;
}

// Translate single text
export interface TranslateMessage extends BaseMessage {
  action: 'translate';
  text: string;
  sourceLang: SourceLanguage;
  targetLang: TargetLanguage;
}

// Translate batch of texts
export interface BatchTranslateMessage extends BaseMessage {
  action: 'batch-translate';
  texts: string[];
  sourceLang: SourceLanguage;
  targetLang: TargetLanguage;
}

// Settings messages
export interface GetSettingsMessage extends BaseMessage {
  action: 'get-settings';
}

export interface UpdateSettingsMessage extends BaseMessage {
  action: 'update-settings';
  settings: Partial<ExtensionSettings>;
}

// Cache messages
export interface ClearCacheMessage extends BaseMessage {
  action: 'clear-cache';
}

export interface GetCacheStatsMessage extends BaseMessage {
  action: 'get-cache-stats';
}

// Union of all messages
export type ExtensionMessage =
  | TranslateMessage
  | BatchTranslateMessage
  | GetSettingsMessage
  | UpdateSettingsMessage
  | ClearCacheMessage
  | GetCacheStatsMessage;

// Settings shape
export interface ExtensionSettings {
  targetLang: TargetLanguage;
  sourceLang: SourceLanguage;
  provider: ProviderName;
  providerMode: 'byok' | 'proxy';
  displayMode: DisplayMode;
  enabledSites: string[];
  proxyUrl: string;
  freellmapiUrl: string;
  apiKeys: Record<ProviderName, string>;
  enabled: boolean;
}

// Default settings
export const DEFAULT_SETTINGS: ExtensionSettings = {
  targetLang: 'vi',
  sourceLang: 'auto',
  provider: 'gemini',
  providerMode: 'byok',
  displayMode: 'below',
  enabledSites: ['*'],
  proxyUrl: '',
  freellmapiUrl: '',
  apiKeys: { freellmapi: '', gemini: '', glm: '', groq: '', qwen: '' },
  enabled: true,
};
