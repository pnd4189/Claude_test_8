/**
 * DOCX Parser
 *
 * Parses DOCX (Word) files and extracts text content
 */

import mammoth from 'mammoth';

export interface ParsedDocument {
  content: string;
  metadata: {
    title?: string;
    format: string;
    [key: string]: any;
  };
  warnings?: string[];
}

export async function parseDocx(fileBuffer: Buffer): Promise<ParsedDocument> {
  try {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });

    const metadata = {
      title: 'Word Document',
      format: 'docx',
    };

    // Clean up the extracted text
    const content = cleanDocxText(result.value);

    // Convert messages to warnings
    const warnings = result.messages
      .filter((m) => m.type === 'warning')
      .map((m) => m.message);

    return {
      content,
      metadata,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    throw new Error(
      `DOCX parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Parse DOCX and extract HTML (preserving some formatting)
 */
export async function parseDocxToHtml(
  fileBuffer: Buffer
): Promise<{
  html: string;
  metadata: ParsedDocument['metadata'];
  warnings?: string[];
}> {
  try {
    const result = await mammoth.convertToHtml({ buffer: fileBuffer });

    const metadata = {
      title: 'Word Document',
      format: 'docx',
    };

    const warnings = result.messages
      .filter((m) => m.type === 'warning')
      .map((m) => m.message);

    return {
      html: result.value,
      metadata,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    throw new Error(
      `DOCX to HTML parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Clean up DOCX extracted text
 */
function cleanDocxText(text: string): string {
  // Remove excessive whitespace
  let cleaned = text.replace(/\s+/g, ' ');

  // Remove null characters
  cleaned = cleaned.replace(/\u0000/g, '').trim();

  return cleaned;
}

/**
 * Validate if file is a valid DOCX
 */
export function isValidDocx(fileBuffer: Buffer): boolean {
  // DOCX files are ZIP archives, check for ZIP signature
  // and also look for typical DOCX structure
  const zipSignature = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

  if (!fileBuffer.slice(0, 4).equals(zipSignature)) {
    return false;
  }

  // Check for [Content_Types].xml which is present in all DOCX files
  const contentTypes = Buffer.from('[Content_Types].xml');
  const fileString = fileBuffer.toString('utf8', 0, Math.min(1000, fileBuffer.length));

  return fileString.includes('[Content_Types].xml');
}
