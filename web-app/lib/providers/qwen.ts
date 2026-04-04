/** Qwen (AlibabaCloud DashScope) provider — uses OpenAI-compatible format */

import { OpenAICompatibleProvider, loadKeysFromEnv } from './openai-compatible-provider';

export function createQwenClient(): OpenAICompatibleProvider | null {
  const keys = loadKeysFromEnv('QWEN_API_KEY');
  if (keys.length === 0) return null;

  return new OpenAICompatibleProvider({
    name: 'Qwen',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-mt-flash',
    envPrefix: 'QWEN_API_KEY',
  }, keys);
}
