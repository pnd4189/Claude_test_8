/**
 * OpenRouter Provider
 *
 * Integration with OpenRouter API for accessing multiple AI models
 */

import { APIKeyRotator } from '../api-key-rotator';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  AIModel,
  ProviderError,
} from './types';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * OpenRouter API client
 */
export class OpenRouterClient {
  private rotator: APIKeyRotator;

  constructor(apiKeys: string[]) {
    this.rotator = new APIKeyRotator(apiKeys, 'OpenRouter');
  }

  /**
   * Chat completion
   */
  async chatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    return this.rotator.executeWithRotation(async (apiKey) => {
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Free AI Translator',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error: any = new Error(
          `OpenRouter API error: ${response.status} ${response.statusText}`
        );
        error.status = response.status;

        try {
          const errorData = await response.json();
          error.message = errorData.error?.message || error.message;
        } catch {
          // Ignore JSON parse errors
        }

        throw error;
      }

      return response.json();
    });
  }

  /**
   * Translate text
   */
  async translate(
    text: string,
    sourceLang: string,
    targetLang: string,
    model: string = 'openai/gpt-3.5-turbo'
  ): Promise<string> {
    const systemPrompt = `You are a professional translator. Translate the following text from ${sourceLang} to ${targetLang}. Maintain the original meaning, tone, and formatting. Only return the translated text without any explanations or additional content.`;

    const response = await this.chatCompletion({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Fetch available models
   */
  async fetchModels(): Promise<AIModel[]> {
    return this.rotator.executeWithRotation(async (apiKey) => {
      const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    });
  }

  /**
   * Filter free models and specific providers
   */
  async fetchFreeModels(): Promise<AIModel[]> {
    const allModels = await this.fetchModels();

    // Filter for :free models and specific providers
    const filtered = allModels.filter((model) => {
      const id = model.id.toLowerCase();
      return (
        id.includes(':free') ||
        id.includes('qwen') ||
        id.includes('deepseek') ||
        id.includes('kimi') ||
        id.includes('glm')
      );
    });

    return filtered;
  }

  /**
   * Get rotator stats
   */
  getStats() {
    return this.rotator.getStats();
  }
}

/**
 * Create OpenRouter client from environment variables
 */
export function createOpenRouterClient(): OpenRouterClient | null {
  const keys: string[] = [];

  for (let i = 1; i <= 20; i++) {
    const key = process.env[`OPENROUTER_API_KEY_${i}`];
    if (key) keys.push(key);
  }

  if (keys.length === 0) {
    console.warn('No OpenRouter API keys found');
    return null;
  }

  return new OpenRouterClient(keys);
}
