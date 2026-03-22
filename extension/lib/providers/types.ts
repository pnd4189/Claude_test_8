/** AI translation provider interface and types */

export type SourceLanguage = 'en' | 'zh' | 'auto';
export type TargetLanguage = 'vi' | 'en';
export type LanguagePair = `${SourceLanguage}-${TargetLanguage}`;

export type ProviderName = 'gemini' | 'glm';

export type DisplayMode = 'below' | 'hover' | 'side-by-side';

export interface TranslationRequest {
  text: string;
  sourceLang: SourceLanguage;
  targetLang: TargetLanguage;
  provider: ProviderName;
}

export interface TranslationResponse {
  translatedText: string;
  sourceLang: SourceLanguage;
  targetLang: TargetLanguage;
  provider: ProviderName;
  cached: boolean;
}

export interface TranslationProvider {
  name: ProviderName;
  translate(request: TranslationRequest): Promise<TranslationResponse>;
  batchTranslate(requests: TranslationRequest[]): Promise<TranslationResponse[]>;
}

export interface ProviderConfig {
  name: ProviderName;
  label: string;
  proxyUrl: string;
  apiKey?: string;
  model: string;
}
