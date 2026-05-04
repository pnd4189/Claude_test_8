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
  private readonly CHARS_PER_TOKEN_LATIN = 4;
  private readonly CHARS_PER_TOKEN_CJK = 1.5;

  private hasCJK(text: string): boolean {
    const cjkRange = /[一-鿿㐀-䶿\u{20000}-\u{2a6df}\u{2a700}-\u{2b73f}\u{2b740}-\u{2b81f}\u{2b820}-\u{2ceaf}\u{2ceb0}-\u{2ebef}\u{30000}-\u{3134f}　-〿぀-ゟ゠-ヿ가-힯]/u;
    return cjkRange.test(text);
  }

  private getCharsPerToken(text: string): number {
    return this.hasCJK(text) ? this.CHARS_PER_TOKEN_CJK : this.CHARS_PER_TOKEN_LATIN;
  }

  private safeSlice(text: string, start: number, end: number): string {
    return Array.from(text).slice(start, end).join('');
  }

  private safeLength(text: string): number {
    return Array.from(text).length;
  }

  /**
   * Split text into chunks
   */
  chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    if (!text || text.trim().length === 0) {
      return [];
    }

    const charsPerToken = this.getCharsPerToken(text);
    const maxChars = opts.maxTokens * charsPerToken;
    const overlapChars = opts.overlap * charsPerToken;

    // If text is small enough, return as single chunk
    if (this.safeLength(text) <= maxChars) {
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
      if (this.safeLength(currentChunk) + this.safeLength(sentence) > maxChars && currentChunk) {
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
    const chars = Array.from(text);
    const textLen = chars.length;
    const chunks: string[] = [];
    let position = 0;

    while (position < textLen) {
      const end = Math.min(position + maxChars, textLen);
      let chunkText = chars.slice(position, end).join('');

      if (end < textLen) {
        const lastSpace = chunkText.lastIndexOf(' ');
        if (lastSpace > maxChars * 0.8) {
          chunkText = chunkText.slice(0, lastSpace);
        }
      }

      chunks.push(chunkText.trim());

      const endPosition = position + (chunkText.trimEnd().length || 1);
      position = endPosition - overlapChars;

      if (position <= (chunks.length > 1 ? chunks[chunks.length - 2].length : 0)) {
        position = endPosition;
      }
    }

    return chunks;
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    const chars = Array.from(text);
    const sentences: string[] = [];
    let current = '';

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      current += char;

      if (
        (char === '.' || char === '!' || char === '?') &&
        (i === chars.length - 1 || chars[i + 1] === ' ' || chars[i + 1] === '\n')
      ) {
        sentences.push(current);
        current = '';
      } else if (char === '\n' && current.trim()) {
        sentences.push(current);
        current = '';
      }
    }

    if (current.trim()) {
      sentences.push(current);
    }

    return sentences.filter((s) => s.trim().length > 0);
  }

  /**
   * Get overlap text from end of previous chunk
   */
  private getOverlap(text: string, overlapChars: number): string {
    const charLen = this.safeLength(text);
    if (charLen <= overlapChars) {
      return text + ' ';
    }

    const overlap = this.safeSlice(text, charLen - overlapChars, charLen);
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
    return Math.ceil(this.safeLength(text) / this.getCharsPerToken(text));
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
