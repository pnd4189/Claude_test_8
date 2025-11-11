/**
 * Provider Types
 *
 * Type definitions for AI providers
 */

export interface AIModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
  };
}

export interface AIProvider {
  id: string;
  name: string;
  baseUrl: string;
  models: AIModel[];
  available: boolean;
}

export interface TranslationRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
  provider: string;
  model: string;
}

export interface TranslationResponse {
  translatedText: string;
  provider: string;
  model: string;
  tokensUsed?: number;
  cached?: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ProviderError extends Error {
  status?: number;
  code?: string;
  provider?: string;
}

export type ProviderName = 'openrouter' | 'gemini' | 'mistral' | 'groq';
