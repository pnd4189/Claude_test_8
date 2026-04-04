/** GLM (Z.AI / ChatGLM) provider — uses OpenAI-compatible format */

import { OpenAICompatibleProvider, loadKeysFromEnv } from './openai-compatible-provider';

export function createGlmClient(): OpenAICompatibleProvider | null {
  const keys = loadKeysFromEnv('GLM_API_KEY');
  if (keys.length === 0) return null;

  return new OpenAICompatibleProvider({
    name: 'GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash',
    envPrefix: 'GLM_API_KEY',
  }, keys);
}
