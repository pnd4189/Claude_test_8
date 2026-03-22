/**
 * Text Chunker — splits large texts into smaller chunks respecting token limits.
 * Preserves sentence boundaries and adds overlap for context.
 * Migrated from web-app/lib/text-chunker.ts (browser-safe, no Node.js APIs).
 */

export interface ChunkOptions {
  maxTokens?: number;
  overlap?: number;
  preserveSentences?: boolean;
}

export interface TextChunk {
  id: string;
  text: string;
  index: number;
  totalChunks: number;
  estimatedTokens: number;
}

const CHARS_PER_TOKEN = 4;

const DEFAULTS: Required<ChunkOptions> = {
  maxTokens: 800,
  overlap: 50,
  preserveSentences: true,
};

/** Estimate token count from text length */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/** Generate unique chunk ID */
function makeChunkId(index: number): string {
  return `chunk-${index}-${Date.now().toString(36)}`;
}

/** Split text into sentence-like segments */
function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  let current = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    current += char;

    const isSentenceEnd =
      (char === '.' || char === '!' || char === '?') &&
      (i === text.length - 1 || text[i + 1] === ' ' || text[i + 1] === '\n');

    if (isSentenceEnd || (char === '\n' && current.trim())) {
      sentences.push(current);
      current = '';
    }
  }

  if (current.trim()) sentences.push(current);
  return sentences.filter((s) => s.trim().length > 0);
}

/** Get overlap text from end of previous chunk */
function getOverlap(text: string, overlapChars: number): string {
  if (text.length <= overlapChars) return text + ' ';
  const overlap = text.slice(-overlapChars);
  const firstSpace = overlap.indexOf(' ');
  if (firstSpace > 0 && firstSpace < overlapChars * 0.3) {
    return overlap.slice(firstSpace + 1) + ' ';
  }
  return overlap + ' ';
}

/** Chunk text preserving sentence boundaries */
function chunkBySentences(text: string, maxChars: number, overlapChars: number): string[] {
  const sentences = splitSentences(text);
  const chunks: string[] = [];
  let currentChunk = '';
  let previousChunk = '';

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChars && currentChunk) {
      chunks.push(currentChunk.trim());
      previousChunk = currentChunk;
      currentChunk = getOverlap(previousChunk, overlapChars) + sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
}

/** Chunk text by fixed size */
function chunkBySize(text: string, maxChars: number, overlapChars: number): string[] {
  const chunks: string[] = [];
  let pos = 0;

  while (pos < text.length) {
    const end = Math.min(pos + maxChars, text.length);
    let chunk = text.slice(pos, end);

    if (end < text.length) {
      const lastSpace = chunk.lastIndexOf(' ');
      if (lastSpace > maxChars * 0.8) chunk = chunk.slice(0, lastSpace);
    }

    chunks.push(chunk.trim());
    pos = pos + chunk.length - overlapChars;
    if (pos <= 0 && chunks.length > 0) pos = end; // ensure progress
  }

  return chunks;
}

/** Split text into translation-friendly chunks */
export function chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
  const opts = { ...DEFAULTS, ...options };

  if (!text || text.trim().length === 0) return [];

  const maxChars = opts.maxTokens * CHARS_PER_TOKEN;
  const overlapChars = opts.overlap * CHARS_PER_TOKEN;

  if (text.length <= maxChars) {
    return [{
      id: makeChunkId(0),
      text: text.trim(),
      index: 0,
      totalChunks: 1,
      estimatedTokens: estimateTokens(text),
    }];
  }

  const rawChunks = opts.preserveSentences
    ? chunkBySentences(text, maxChars, overlapChars)
    : chunkBySize(text, maxChars, overlapChars);

  return rawChunks.map((chunk, index) => ({
    id: makeChunkId(index),
    text: chunk,
    index,
    totalChunks: rawChunks.length,
    estimatedTokens: estimateTokens(chunk),
  }));
}

/** Merge translated chunks back into single text */
export function mergeChunks(chunks: TextChunk[]): string {
  return [...chunks].sort((a, b) => a.index - b.index).map((c) => c.text.trim()).join('\n\n');
}
