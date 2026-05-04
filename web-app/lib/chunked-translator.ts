/**
 * Chunked Translator
 *
 * Handles translation of large documents by splitting into chunks
 */

import { TextChunker, type TextChunk } from './text-chunker';
import type { TranslationChunk } from '@/store/translation-store';

export interface ChunkedTranslationOptions {
  text: string;
  sourceLang: string;
  targetLang: string;
  provider: string;
  model: string;
  maxTokensPerChunk?: number;
  overlap?: number;
  onProgress?: (current: number, total: number) => void;
  onChunkComplete?: (chunk: TranslationChunk) => void;
  onError?: (error: Error, chunkIndex: number) => void;
}

export interface ChunkedTranslationResult {
  translatedText: string;
  chunks: TranslationChunk[];
  totalChunks: number;
  successCount: number;
  failureCount: number;
}

export class ChunkedTranslator {
  private apiEndpoint: string;

  constructor(apiEndpoint: string = '/api/translate') {
    this.apiEndpoint = apiEndpoint;
  }

  /**
   * Translate large text by chunking
   */
  async translate(
    options: ChunkedTranslationOptions
  ): Promise<ChunkedTranslationResult> {
    const {
      text,
      sourceLang,
      targetLang,
      provider,
      model,
      maxTokensPerChunk = 800,
      overlap = 50,
      onProgress,
      onChunkComplete,
      onError,
    } = options;

    // Split text into chunks
    const chunker = new TextChunker();
    const textChunks = chunker.chunkText(text, {
      maxTokens: maxTokensPerChunk,
      overlap,
      preserveSentences: true,
    });

    console.log(`Split text into ${textChunks.length} chunks`);

    // Prepare translation chunks
    const translationChunks: TranslationChunk[] = textChunks.map((chunk) => ({
      id: chunk.id,
      sourceText: chunk.text,
      status: 'pending' as const,
    }));

    let successCount = 0;
    let failureCount = 0;

    // Translate each chunk sequentially
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      const translationChunk = translationChunks[i];

      try {
        // Update status to processing
        translationChunk.status = 'processing';
        onChunkComplete?.(translationChunk);

        // Call translation API
        const response = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: chunk.text,
            sourceLang,
            targetLang,
            provider,
            model,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Translation failed');
        }

        const data = await response.json();

        // Update chunk with translation
        translationChunk.targetText = data.translatedText;
        translationChunk.status = 'completed';
        successCount++;

        onChunkComplete?.(translationChunk);
        onProgress?.(i + 1, textChunks.length);

        console.log(
          `Translated chunk ${i + 1}/${textChunks.length} (${chunk.estimatedTokens} tokens)`
        );
      } catch (error) {
        console.error(`Failed to translate chunk ${i + 1}:`, error);

        translationChunk.status = 'failed';
        translationChunk.error =
          error instanceof Error ? error.message : 'Unknown error';
        failureCount++;

        onError?.(error as Error, i);
        onChunkComplete?.(translationChunk);

        // Continue with next chunk even if this one fails
      }
    }

    // Merge translated chunks
    const translatedText = this.mergeTranslatedChunks(translationChunks);

    return {
      translatedText,
      chunks: translationChunks,
      totalChunks: textChunks.length,
      successCount,
      failureCount,
    };
  }

  /**
   * Merge translated chunks into final text, inserting placeholders for failures
   */
  private mergeTranslatedChunks(chunks: TranslationChunk[]): string {
    return chunks
      .map((chunk, index) => {
        if (chunk.status === 'completed' && chunk.targetText) {
          return chunk.targetText;
        }
        return `[TRANSLATION FAILED - Section ${index + 1}]`;
      })
      .join('\n\n');
  }

  /**
   * Retry failed chunks
   */
  async retryFailedChunks(
    chunks: TranslationChunk[],
    options: Omit<ChunkedTranslationOptions, 'text'>
  ): Promise<TranslationChunk[]> {
    const failedChunks = chunks.filter((chunk) => chunk.status === 'failed');

    console.log(`Retrying ${failedChunks.length} failed chunks`);

    for (const chunk of failedChunks) {
      try {
        chunk.status = 'processing';
        chunk.error = undefined;

        const response = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: chunk.sourceText,
            sourceLang: options.sourceLang,
            targetLang: options.targetLang,
            provider: options.provider,
            model: options.model,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Translation failed');
        }

        const data = await response.json();

        chunk.targetText = data.translatedText;
        chunk.status = 'completed';

        options.onChunkComplete?.(chunk);
      } catch (error) {
        console.error(`Retry failed for chunk ${chunk.id}:`, error);
        chunk.status = 'failed';
        chunk.error =
          error instanceof Error ? error.message : 'Unknown error';
      }
    }

    return chunks;
  }
}

/**
 * Utility function for chunked translation
 */
export async function translateWithChunks(
  options: ChunkedTranslationOptions
): Promise<ChunkedTranslationResult> {
  const translator = new ChunkedTranslator();
  return translator.translate(options);
}
