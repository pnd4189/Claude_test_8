/**
 * API Key Rotator
 *
 * Manages rotation of multiple API keys to handle quota limits.
 * When one key hits quota, automatically rotates to the next available key.
 */

export class APIKeyRotator {
  private keys: string[];
  private currentIndex: number = 0;
  private failedAttempts: Map<string, number> = new Map();
  private readonly MAX_RETRIES = 3;
  private readonly provider: string;

  constructor(keys: string[], provider: string = 'unknown') {
    this.keys = keys.filter((k) => k && k.length > 0);
    this.provider = provider;

    if (this.keys.length === 0) {
      throw new Error(`No API keys provided for ${provider}`);
    }

    console.log(`[${this.provider}] Initialized with ${this.keys.length} keys`);
  }

  /**
   * Execute a function with automatic key rotation on quota errors
   */
  async executeWithRotation<T>(
    fn: (apiKey: string) => Promise<T>,
    options: {
      onRotation?: (newIndex: number, totalKeys: number) => void;
      onError?: (error: any, keyIndex: number) => void;
    } = {}
  ): Promise<T> {
    const startIndex = this.currentIndex;
    let attempts = 0;

    while (attempts < this.keys.length) {
      const currentKey = this.keys[this.currentIndex];
      const keyMasked = this.maskKey(currentKey);

      try {
        console.log(
          `[${this.provider}] Attempting with key ${this.currentIndex + 1}/${this.keys.length}: ${keyMasked}`
        );

        const result = await fn(currentKey);

        // Success - reset failed attempts for this key
        this.failedAttempts.delete(currentKey);
        console.log(`[${this.provider}] Success with key ${keyMasked}`);

        return result;
      } catch (error: any) {
        const isQuotaError = this.isQuotaError(error);
        const isRateLimitError = this.isRateLimitError(error);

        // Log error
        console.error(
          `[${this.provider}] Error with key ${keyMasked}:`,
          error.message || error
        );

        // Call error callback
        options.onError?.(error, this.currentIndex);

        // Track failed attempts
        const currentFails = this.failedAttempts.get(currentKey) || 0;
        this.failedAttempts.set(currentKey, currentFails + 1);

        // If quota or rate limit error, rotate to next key
        if (isQuotaError || isRateLimitError) {
          console.warn(
            `[${this.provider}] ${isQuotaError ? 'Quota' : 'Rate limit'} exceeded on key ${keyMasked}, rotating...`
          );

          this.rotateKey();
          options.onRotation?.(this.currentIndex, this.keys.length);

          attempts++;

          // If we've tried all keys, throw error
          if (attempts >= this.keys.length) {
            throw new Error(
              `All ${this.keys.length} API keys exhausted for ${this.provider}`
            );
          }

          continue;
        }

        // For non-quota errors, throw immediately
        throw error;
      }
    }

    throw new Error(`All API keys exhausted for ${this.provider}`);
  }

  /**
   * Check if error is a quota exceeded error
   */
  private isQuotaError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    const status = error.status || error.statusCode;

    return (
      status === 429 ||
      message.includes('quota') ||
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('insufficient_quota')
    );
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    const status = error.status || error.statusCode;

    return (
      status === 429 ||
      message.includes('rate limit') ||
      message.includes('too many requests')
    );
  }

  /**
   * Rotate to next key
   */
  private rotateKey(): void {
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
  }

  /**
   * Get current API key
   */
  getCurrentKey(): string {
    return this.keys[this.currentIndex];
  }

  /**
   * Get current key index
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * Get total number of keys
   */
  getTotalKeys(): number {
    return this.keys.length;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      provider: this.provider,
      totalKeys: this.keys.length,
      currentIndex: this.currentIndex,
      currentKey: this.maskKey(this.keys[this.currentIndex]),
      failedAttempts: Array.from(this.failedAttempts.entries()).map(
        ([key, count]) => ({
          key: this.maskKey(key),
          failures: count,
        })
      ),
    };
  }

  /**
   * Reset failed attempts counter
   */
  resetFailures(): void {
    this.failedAttempts.clear();
  }

  /**
   * Mask API key for logging (show first 8 and last 4 chars)
   */
  private maskKey(key: string): string {
    if (key.length <= 12) return '***';
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
  }

  /**
   * Manually set current key index
   */
  setCurrentIndex(index: number): void {
    if (index >= 0 && index < this.keys.length) {
      this.currentIndex = index;
    }
  }
}

/**
 * Create API key rotators for all providers from environment variables
 */
export function createRotators() {
  const rotators = {
    openrouter: createRotatorFromEnv('OPENROUTER_API_KEY', 'OpenRouter'),
    gemini: createRotatorFromEnv('GEMINI_API_KEY', 'Gemini'),
    mistral: createRotatorFromEnv('MISTRAL_API_KEY', 'Mistral'),
    groq: createRotatorFromEnv('GROQ_API_KEY', 'Groq'),
  };

  return rotators;
}

/**
 * Create a rotator from environment variables with a given prefix
 */
function createRotatorFromEnv(
  prefix: string,
  provider: string
): APIKeyRotator | null {
  const keys: string[] = [];

  // Try to load keys with suffix _1, _2, _3, etc.
  for (let i = 1; i <= 20; i++) {
    const key = process.env[`${prefix}_${i}`];
    if (key) {
      keys.push(key);
    }
  }

  // Also try without suffix (for backward compatibility)
  const singleKey = process.env[prefix];
  if (singleKey && !keys.includes(singleKey)) {
    keys.push(singleKey);
  }

  if (keys.length === 0) {
    console.warn(`No API keys found for ${provider} (${prefix}_X)`);
    return null;
  }

  return new APIKeyRotator(keys, provider);
}
