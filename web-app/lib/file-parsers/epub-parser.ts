/**
 * EPUB Parser
 *
 * Parses EPUB files and extracts text content
 */

import EPub from 'epub';
import { promisify } from 'util';

export interface ParsedDocument {
  content: string;
  metadata: {
    title?: string;
    author?: string;
    language?: string;
    format: string;
    [key: string]: any;
  };
  structure?: {
    title: string;
    startIndex: number;
    endIndex: number;
  }[];
}

export async function parseEpub(fileBuffer: Buffer): Promise<ParsedDocument> {
  return new Promise((resolve, reject) => {
    try {
      const epub = new EPub(fileBuffer as unknown as string);

      epub.on('error', (error) => {
        reject(new Error(`EPUB parsing error: ${error.message}`));
      });

      epub.on('end', async () => {
        try {
          const metadata = {
            title: epub.metadata.title || 'Untitled',
            author: epub.metadata.creator || 'Unknown',
            language: epub.metadata.language || 'unknown',
            publisher: (epub.metadata as any).publisher,
            date: epub.metadata.date,
            format: 'epub',
          };

          // Extract text from all chapters
          const chapters: string[] = [];
          const structure: ParsedDocument['structure'] = [];

          // Get chapter flow
          const flow = epub.flow || [];

          for (const chapter of flow) {
            try {
              // Use promisify to convert callback to promise
              const getChapter = promisify(epub.getChapter.bind(epub));
              const chapterContent = await getChapter(chapter.id);

              // Remove HTML tags and extract text
              const text = stripHtml(chapterContent);

              if (text.trim()) {
                const startIndex = chapters.join('\n\n').length;
                chapters.push(text);
                const endIndex = chapters.join('\n\n').length;

                structure.push({
                  title: chapter.title || `Chapter ${chapters.length}`,
                  startIndex,
                  endIndex,
                });
              }
            } catch (error) {
              console.warn(
                `Failed to parse chapter ${chapter.id}:`,
                error
              );
            }
          }

          const content = chapters.join('\n\n');

          resolve({
            content,
            metadata,
            structure,
          });
        } catch (error) {
          reject(error);
        }
      });

      epub.parse();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Strip HTML tags and decode entities
 */
function stripHtml(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Validate if file is a valid EPUB
 */
export function isValidEpub(fileBuffer: Buffer): boolean {
  // EPUB files are ZIP archives, check for ZIP signature
  const zipSignature = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
  return fileBuffer.slice(0, 4).equals(zipSignature);
}
