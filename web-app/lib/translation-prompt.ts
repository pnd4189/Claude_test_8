/** Shared translation system prompt for all web-app providers */

export const TRANSLATION_SYSTEM_PROMPT = (sourceLang: string, targetLang: string) =>
  `You are a professional translator. Translate the following text from ${sourceLang} to ${targetLang}. Maintain the original meaning, tone, and formatting. Only return the translated text without any explanations or additional content.`;
