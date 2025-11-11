/**
 * Text Chunker
 *
 * Splits large texts into smaller chunks to avoid token limits.
 * Preserves sentence boundaries and adds overlap for context.
 */

export interface ChunkOptions {
  maxTokens?: number; // Maximum tokens per chunk (default: 800)
  overlap?: number; // Number of overlapping tokens between chunks (default: 50)
  preserveSentences?: boolean; // Try to split on sentence boundaries (default: true)
}

export interface TextChunk {
  id: string;
  text: string;
  index: number;
  totalChunks: number;
  estimatedTokens: number;
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  maxTokens: 800,
  overlap: 50,
  preserveSentences: true,
};

export class TextChunker {
  // Rough approximation: 1 token ≈ 4 characters (0.25 tokens per char)
  private readonly CHARS_PER_TOKEN = 4;

  /**
   * Split text into chunks
   */
  chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    if (!text || text.trim().length === 0) {
      return [];
    }

    const maxChars = opts.maxTokens * this.CHARS_PER_TOKEN;
    const overlapChars = opts.overlap * this.CHARS_PER_TOKEN;

    // If text is small enough, return as single chunk
    if (text.length <= maxChars) {
      return [
        {
          id: this.generateChunkId(0),
          text: text.trim(),
          index: 0,
          totalChunks: 1,
          estimatedTokens: this.estimateTokens(text),
        },
      ];
    }

    // Split text based on options
    const rawChunks = opts.preserveSentences
      ? this.chunkBySentences(text, maxChars, overlapChars)
      : this.chunkBySize(text, maxChars, overlapChars);

    // Convert to TextChunk objects
    return rawChunks.map((chunkText, index) => ({
      id: this.generateChunkId(index),
      text: chunkText,
      index,
      totalChunks: rawChunks.length,
      estimatedTokens: this.estimateTokens(chunkText),
    }));
  }

  /**
   * Chunk by preserving sentence boundaries
   */
  private chunkBySentences(
    text: string,
    maxChars: number,
    overlapChars: number
  ): string[] {
    // Split into sentences (handles ., !, ?, and line breaks)
    const sentences = this.splitIntoSentences(text);
    const chunks: string[] = [];
    let currentChunk = '';
    let previousChunk = '';

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];

      // If adding this sentence would exceed max, save current chunk
      if (currentChunk.length + sentence.length > maxChars && currentChunk) {
        chunks.push(currentChunk.trim());
        previousChunk = currentChunk;

        // Start new chunk with overlap from previous
        const overlap = this.getOverlap(previousChunk, overlapChars);
        currentChunk = overlap + sentence;
      } else {
        currentChunk += sentence;
      }
    }

    // Add final chunk if not empty
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Chunk by fixed size with overlap
   */
  private chunkBySize(
    text: string,
    maxChars: number,
    overlapChars: number
  ): string[] {
    const chunks: string[] = [];
    let position = 0;

    while (position < text.length) {
      const end = Math.min(position + maxChars, text.length);
      let chunkText = text.slice(position, end);

      // Try to end at word boundary if not at text end
      if (end < text.length) {
        const lastSpace = chunkText.lastIndexOf(' ');
        if (lastSpace > maxChars * 0.8) {
          // Only adjust if we're not losing too much
          chunkText = chunkText.slice(0, lastSpace);
        }
      }

      chunks.push(chunkText.trim());

      // Move position forward, accounting for overlap
      position = end - overlapChars;

      // Ensure we make progress
      if (position <= chunks[chunks.length - 1].length + (chunks.length - 1) * (maxChars - overlapChars)) {
        position = end;
      }
    }

    return chunks;
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Split on sentence boundaries: ., !, ?, or newlines
    // But preserve the punctuation
    const sentences: string[] = [];
    let current = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      current += char;

      // Check if this is sentence end
      if (
        (char === '.' || char === '!' || char === '?') &&
        (i === text.length - 1 || text[i + 1] === ' ' || text[i + 1] === '\n')
      ) {
        sentences.push(current);
        current = '';
      } else if (char === '\n' && current.trim()) {
        sentences.push(current);
        current = '';
      }
    }

    // Add any remaining text
    if (current.trim()) {
      sentences.push(current);
    }

    return sentences.filter((s) => s.trim().length > 0);
  }

  /**
   * Get overlap text from end of previous chunk
   */
  private getOverlap(text: string, overlapChars: number): string {
    if (text.length <= overlapChars) {
      return text + ' ';
    }

    // Get last overlapChars, but try to start at word boundary
    const overlap = text.slice(-overlapChars);
    const firstSpace = overlap.indexOf(' ');

    if (firstSpace > 0 && firstSpace < overlapChars * 0.3) {
      return overlap.slice(firstSpace + 1) + ' ';
    }

    return overlap + ' ';
  }

  /**
   * Estimate number of tokens in text
   */
  estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }

  /**
   * Generate unique chunk ID
   */
  private generateChunkId(index: number): string {
    return `chunk-${index}-${Date.now().toString(36)}`;
  }

  /**
   * Merge translated chunks back into single text
   */
  static mergeChunks(chunks: TextChunk[]): string {
    // Sort by index to ensure correct order
    const sorted = [...chunks].sort((a, b) => a.index - b.index);

    // Simply join with double newline
    return sorted.map((chunk) => chunk.text.trim()).join('\n\n');
  }

  /**
   * Calculate statistics for chunking operation
   */
  static getChunkStats(chunks: TextChunk[]) {
    const totalChars = chunks.reduce((sum, chunk) => sum + chunk.text.length, 0);
    const totalTokens = chunks.reduce(
      (sum, chunk) => sum + chunk.estimatedTokens,
      0
    );
    const avgChunkSize = totalChars / chunks.length;
    const avgTokensPerChunk = totalTokens / chunks.length;

    return {
      totalChunks: chunks.length,
      totalCharacters: totalChars,
      totalEstimatedTokens: totalTokens,
      averageChunkSize: Math.round(avgChunkSize),
      averageTokensPerChunk: Math.round(avgTokensPerChunk),
      minChunkSize: Math.min(...chunks.map((c) => c.text.length)),
      maxChunkSize: Math.max(...chunks.map((c) => c.text.length)),
    };
  }
}

/**
 * Utility function to chunk text (convenience wrapper)
 */
export function chunkText(text: string, options?: ChunkOptions): TextChunk[] {
  const chunker = new TextChunker();
  return chunker.chunkText(text, options);
}

/**
 * Utility function to estimate tokens
 */
export function estimateTokens(text: string): number {
  const chunker = new TextChunker();
  return chunker.estimateTokens(text);
}
