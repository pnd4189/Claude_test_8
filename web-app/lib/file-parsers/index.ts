/**
 * File Parsers Index
 *
 * Exports all file parsers and provides utility functions
 */

import { parseEpub, isValidEpub } from './epub-parser';
import { parsePdf, isValidPdf } from './pdf-parser';
import { parseDocx, isValidDocx } from './docx-parser';

export interface ParsedDocument {
  content: string;
  metadata: {
    title?: string;
    author?: string;
    pages?: number;
    language?: string;
    format: string;
    [key: string]: any;
  };
  structure?: {
    title: string;
    startIndex: number;
    endIndex: number;
  }[];
  warnings?: string[];
}

export type FileFormat = 'epub' | 'pdf' | 'docx' | 'txt';

/**
 * Parse text file
 */
function parseTxt(fileBuffer: Buffer): ParsedDocument {
  const content = fileBuffer.toString('utf-8');

  return {
    content,
    metadata: {
      title: 'Text File',
      format: 'txt',
    },
  };
}

/**
 * Validate text file
 */
function isValidTxt(fileBuffer: Buffer): boolean {
  try {
    // Try to decode as UTF-8
    fileBuffer.toString('utf-8');
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse file based on format
 */
export async function parseFile(
  fileBuffer: Buffer,
  format: FileFormat
): Promise<ParsedDocument> {
  switch (format) {
    case 'epub':
      if (!isValidEpub(fileBuffer)) {
        throw new Error('Invalid EPUB file');
      }
      return parseEpub(fileBuffer);

    case 'pdf':
      if (!isValidPdf(fileBuffer)) {
        throw new Error('Invalid PDF file');
      }
      return parsePdf(fileBuffer);

    case 'docx':
      if (!isValidDocx(fileBuffer)) {
        throw new Error('Invalid DOCX file');
      }
      return parseDocx(fileBuffer);

    case 'txt':
      if (!isValidTxt(fileBuffer)) {
        throw new Error('Invalid TXT file');
      }
      return parseTxt(fileBuffer);

    default:
      throw new Error(`Unsupported file format: ${format}`);
  }
}

/**
 * Detect file format from buffer
 */
export function detectFileFormat(fileBuffer: Buffer): FileFormat | null {
  if (isValidPdf(fileBuffer)) return 'pdf';
  if (isValidEpub(fileBuffer)) return 'epub';
  if (isValidDocx(fileBuffer)) return 'docx';
  if (isValidTxt(fileBuffer)) return 'txt';

  return null;
}

/**
 * Detect file format from filename
 */
export function detectFormatFromFilename(filename: string): FileFormat | null {
  const ext = filename.toLowerCase().split('.').pop();

  switch (ext) {
    case 'epub':
      return 'epub';
    case 'pdf':
      return 'pdf';
    case 'docx':
    case 'doc':
      return 'docx';
    case 'txt':
      return 'txt';
    default:
      return null;
  }
}

/**
 * Validate file size (max 50MB)
 */
export function validateFileSize(
  fileSize: number,
  maxSize: number = 50 * 1024 * 1024
): boolean {
  return fileSize <= maxSize;
}

/**
 * Get supported formats
 */
export function getSupportedFormats(): FileFormat[] {
  return ['epub', 'pdf', 'docx', 'txt'];
}

/**
 * Check if format is supported
 */
export function isFormatSupported(format: string): boolean {
  return getSupportedFormats().includes(format as FileFormat);
}

// Re-export individual parsers
export { parseEpub, parsePdf, parseDocx };
