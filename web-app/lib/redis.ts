import { createHash } from 'crypto';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { logger } from './logger';
import type { AIModel } from './providers/types';

/** Alias for cached model entries — mirrors AIModel */
export type ModelInfo = AIModel;

// Initialize Redis client (will use env variables)
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Rate limiter: 10 requests per minute per IP
export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: 'ratelimit',
});

// Cache utilities
export const cache = {
  // Get cached value
  async get<T>(key: string): Promise<T | null> {
    try {
      return await redis.get<T>(key);
    } catch (error) {
      logger.error('cache', 'Cache get error', error);
      return null;
    }
  },

  // Set cached value with TTL (default 7 days)
  async set(key: string, value: unknown, ttlSeconds = 604800): Promise<void> {
    try {
      await redis.set(key, value, { ex: ttlSeconds });
    } catch (error) {
      logger.error('cache', 'Cache set error', error);
    }
  },

  // Delete cached value
  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error('cache', 'Cache del error', error);
    }
  },

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('cache', 'Cache exists error', error);
      return false;
    }
  },
};

// Translation cache utilities
export const translationCache = {
  generateKey(
    text: string,
    sourceLang: string,
    targetLang: string,
    provider: string
  ): string {
    const textHash = createHash('sha256').update(text).digest('hex').substring(0, 32);
    return `translation:${sourceLang}:${targetLang}:${provider}:${textHash}`;
  },

  async get(
    text: string,
    sourceLang: string,
    targetLang: string,
    provider: string
  ): Promise<string | null> {
    const key = this.generateKey(text, sourceLang, targetLang, provider);
    return cache.get<string>(key);
  },

  async set(
    text: string,
    sourceLang: string,
    targetLang: string,
    provider: string,
    translation: string
  ): Promise<void> {
    const key = this.generateKey(text, sourceLang, targetLang, provider);
    await cache.set(key, translation, 604800); // 7 days TTL
  },
};

// Models cache utilities
export const modelsCache = {
  async getModels(provider: string): Promise<ModelInfo[] | null> {
    return cache.get<ModelInfo[]>(`models:${provider}`);
  },

  async setModels(provider: string, models: ModelInfo[]): Promise<void> {
    await cache.set(`models:${provider}`, models, 86400); // 24 hours TTL
  },

  async refreshModels(provider: string, models: ModelInfo[]): Promise<void> {
    await this.setModels(provider, models);
  },
};
