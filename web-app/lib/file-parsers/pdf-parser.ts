/**
 * PDF Parser
 *
 * Parses PDF files and extracts text content
 */

import pdfParse from 'pdf-parse';

export interface ParsedDocument {
  content: string;
  metadata: {
    title?: string;
    author?: string;
    pages?: number;
    format: string;
    [key: string]: any;
  };
}

export async function parsePdf(fileBuffer: Buffer): Promise<ParsedDocument> {
  try {
    const data = await pdfParse(fileBuffer);

    const metadata = {
      title: data.info?.Title || 'Untitled PDF',
      author: data.info?.Author || 'Unknown',
      creator: data.info?.Creator,
      producer: data.info?.Producer,
      pages: data.numpages,
      format: 'pdf',
    };

    // Clean up the extracted text
    const content = cleanPdfText(data.text);

    return {
      content,
      metadata,
    };
  } catch (error) {
    throw new Error(
      `PDF parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Clean up PDF extracted text
 */
function cleanPdfText(text: string): string {
  // Remove excessive whitespace
  let cleaned = text.replace(/\s+/g, ' ');

  // Fix common PDF extraction issues
  cleaned = cleaned
    .replace(/\u0000/g, '') // Remove null characters
    .replace(/\ufffd/g, '') // Remove replacement characters
    .trim();

  return cleaned;
}

/**
 * Validate if file is a valid PDF
 */
export function isValidPdf(fileBuffer: Buffer): boolean {
  // PDF files start with %PDF-
  const pdfSignature = Buffer.from('%PDF-');
  return fileBuffer.slice(0, 5).equals(pdfSignature);
}

/**
 * Get PDF page count without full parsing
 */
export async function getPdfPageCount(fileBuffer: Buffer): Promise<number> {
  try {
    const data = await pdfParse(fileBuffer, {
      max: 1, // Only parse first page
    });
    return data.numpages;
  } catch (error) {
    return 0;
  }
}
