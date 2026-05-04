/** FreeLLMAPI provider — OpenAI-compatible proxy aggregating 11 free-tier providers */

import { OpenAICompatibleProvider, loadKeysFromEnv } from './openai-compatible-provider';

export function createFreeLLMAPIClient(): OpenAICompatibleProvider | null {
  const keys = loadKeysFromEnv('FREELLMAPI_KEY');
  const baseUrl = process.env.FREELLMAPI_URL?.replace(/\/+$/, '');
  if (keys.length === 0 || !baseUrl) return null;

  return new OpenAICompatibleProvider({
    name: 'FreeLLMAPI',
    baseUrl: `${baseUrl}/v1`,
    defaultModel: 'auto',
    envPrefix: 'FREELLMAPI_KEY',
  }, keys);
}
