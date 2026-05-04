/** EPUB exporter — rebuild translated EPUB preserving original format */

import JSZip from 'jszip';

/** Content selector matching epub-parser.ts extractParagraphs() */
const PARAGRAPH_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, li, blockquote';
const MIN_TEXT_LENGTH = 5;

export interface EpubExportOptions {
  /** Original EPUB file as ArrayBuffer */
  originalData: ArrayBuffer;
  /** Map of chapter index → translated paragraph strings */
  translatedChapters: Map<number, string[]>;
  /** 'replace' swaps original text; 'bilingual' appends translation after each paragraph */
  mode: 'replace' | 'bilingual';
}

/** Rebuild EPUB with translated content, preserving all original formatting, CSS, images */
export async function exportTranslatedEpub(options: EpubExportOptions): Promise<Blob> {
  const { originalData, translatedChapters, mode } = options;
  const zip = await JSZip.loadAsync(originalData);

  // Find OPF path from container.xml
  const containerXml = await zip.file('META-INF/container.xml')?.async('string');
  if (!containerXml) throw new Error('Invalid EPUB: missing container.xml');

  const opfPath = containerXml.match(/full-path="([^"]+)"/)?.[1] ?? 'content.opf';
  const opfContent = await zip.file(opfPath)?.async('string');
  if (!opfContent) throw new Error('Invalid EPUB: missing OPF');

  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
  const parser = new DOMParser();
  const opfDoc = parser.parseFromString(opfContent, 'text/xml');

  // Get spine order and manifest
  const spineRefs = Array.from(opfDoc.getElementsByTagName('itemref'))
    .map((el) => el.getAttribute('idref') ?? '')
    .filter(Boolean);

  const manifest = new Map<string, string>();
  for (const item of opfDoc.getElementsByTagName('item')) {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (id && href) manifest.set(id, href);
  }

  // Process each chapter that has translations
  let chapterIndex = 0;
  for (const itemId of spineRefs) {
    const href = manifest.get(itemId);
    if (!href) { chapterIndex++; continue; }

    const filePath = opfDir + href;
    const html = await zip.file(filePath)?.async('string');
    if (!html) { chapterIndex++; continue; }

    // Check if this chapter has paragraphs (same filter as parser)
    const isLikelyXhtml = html.trimStart().startsWith('<?xml') || html.includes('xmlns');
    let doc = parser.parseFromString(html, 'application/xhtml+xml');
    const xhtmlParseFailed = !!doc.querySelector('parsererror');
    if (xhtmlParseFailed || !isLikelyXhtml) {
      doc = parser.parseFromString(html, 'text/html');
    }
    const elements = doc.querySelectorAll(PARAGRAPH_SELECTOR);
    const hasContent = Array.from(elements).some((el) => (el.textContent?.trim().length ?? 0) > MIN_TEXT_LENGTH);
    if (!hasContent) { chapterIndex++; continue; }

    // Get translations for this chapter
    const translations = translatedChapters.get(chapterIndex);
    if (!translations || translations.length === 0) { chapterIndex++; continue; }

    // Apply translations to matching elements
    let transIdx = 0;
    for (const el of elements) {
      const text = el.textContent?.trim();
      if (!text || text.length <= MIN_TEXT_LENGTH) continue;
      if (transIdx >= translations.length) break;

      if (mode === 'replace') {
        el.textContent = translations[transIdx];
      } else {
        // Bilingual: insert translated paragraph after original
        const translatedEl = doc.createElement('p');
        translatedEl.className = 'translated';
        translatedEl.style.cssText = 'color: #1a73e8; font-style: italic; margin-top: 0.25em;';
        translatedEl.textContent = translations[transIdx];
        el.parentNode?.insertBefore(translatedEl, el.nextSibling);
      }
      transIdx++;
    }

    // Serialize back and write to zip
    const serializer = new XMLSerializer();
    let modifiedHtml: string;
    if (!xhtmlParseFailed && isLikelyXhtml) {
      // XHTML document: XMLSerializer produces valid XHTML
      modifiedHtml = serializer.serializeToString(doc);
    } else {
      // HTML-parsed document: serialize only the body content
      const body = doc.body;
      const xhtmlDoc = parser.parseFromString(
        '<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body></body></html>',
        'application/xhtml+xml'
      );
      const xhtmlBody = xhtmlDoc.querySelector('body');
      if (xhtmlBody) {
        // Move modified nodes into the XHTML skeleton
        while (body.firstChild) {
          xhtmlBody.appendChild(xhtmlDoc.importNode(body.firstChild, true));
          body.removeChild(body.firstChild);
        }
        modifiedHtml = serializer.serializeToString(xhtmlDoc);
      } else {
        modifiedHtml = serializer.serializeToString(doc);
      }
    }
    zip.file(filePath, modifiedHtml);

    chapterIndex++;
  }

  return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
}
