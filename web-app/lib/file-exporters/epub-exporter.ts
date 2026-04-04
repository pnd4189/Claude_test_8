/** Client-side EPUB exporter — rebuild translated EPUB preserving original format.
 *  Requires: npm install jszip
 */

import JSZip from 'jszip';

/** Selector matching web-app epub-parser paragraph extraction */
const PARAGRAPH_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, li, blockquote';
const MIN_TEXT_LENGTH = 5;

/**
 * Rebuild EPUB with translated text, preserving all original formatting.
 * @param originalData — Original EPUB ArrayBuffer
 * @param translatedText — Flat translated text (paragraphs separated by newlines)
 * @param mode — 'replace' swaps original; 'bilingual' appends after each paragraph
 */
export async function exportTranslatedEpub(
  originalData: ArrayBuffer,
  translatedText: string,
  mode: 'replace' | 'bilingual' = 'bilingual'
): Promise<Blob> {
  const zip = await JSZip.loadAsync(originalData);

  // Find OPF path
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

  // Split translated text into paragraphs
  const translatedParagraphs = translatedText
    .split('\n')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  let transIdx = 0;

  // Process each spine item
  for (const itemId of spineRefs) {
    const href = manifest.get(itemId);
    if (!href) continue;

    const filePath = opfDir + href;
    const html = await zip.file(filePath)?.async('string');
    if (!html) continue;

    const doc = parser.parseFromString(html, 'text/html');
    const elements = doc.querySelectorAll(PARAGRAPH_SELECTOR);

    let modified = false;
    for (const el of elements) {
      const text = el.textContent?.trim();
      if (!text || text.length <= MIN_TEXT_LENGTH) continue;
      if (transIdx >= translatedParagraphs.length) break;

      if (mode === 'replace') {
        el.textContent = translatedParagraphs[transIdx];
      } else {
        const translatedEl = doc.createElement('p');
        translatedEl.className = 'translated';
        translatedEl.style.cssText = 'color: #1a73e8; font-style: italic; margin-top: 0.25em;';
        translatedEl.textContent = translatedParagraphs[transIdx];
        el.parentNode?.insertBefore(translatedEl, el.nextSibling);
      }
      transIdx++;
      modified = true;
    }

    if (modified) {
      const serializer = new XMLSerializer();
      zip.file(filePath, serializer.serializeToString(doc));
    }
  }

  return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
}
