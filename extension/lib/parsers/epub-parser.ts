/** ePub parser — unpack ZIP, extract metadata, chapters, and TOC */

import JSZip from 'jszip';

export interface EpubMetadata {
  title: string;
  author: string;
  language: string;
}

export interface EpubChapter {
  id: string;
  title: string;
  htmlContent: string;
  paragraphs: string[];
}

export interface TocEntry {
  title: string;
  chapterId: string;
}

export interface ParsedEpub {
  metadata: EpubMetadata;
  chapters: EpubChapter[];
  toc: TocEntry[];
}

/** Parse an ePub file from ArrayBuffer */
export async function parseEpub(data: ArrayBuffer): Promise<ParsedEpub> {
  const zip = await JSZip.loadAsync(data);

  // Find content.opf path from container.xml
  const containerXml = await zip.file('META-INF/container.xml')?.async('string');
  if (!containerXml) throw new Error('Invalid ePub: missing container.xml');

  const opfPath = extractOpfPath(containerXml);
  const opfContent = await zip.file(opfPath)?.async('string');
  if (!opfContent) throw new Error('Invalid ePub: missing content.opf');

  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
  const parser = new DOMParser();
  const opfDoc = parser.parseFromString(opfContent, 'text/xml');

  // Extract metadata
  const metadata = extractMetadata(opfDoc);

  // Extract spine order (reading order)
  const spineItemIds = extractSpine(opfDoc);
  const manifest = extractManifest(opfDoc);

  // Load chapters in spine order
  const chapters: EpubChapter[] = [];
  for (let i = 0; i < spineItemIds.length; i++) {
    const itemId = spineItemIds[i];
    const item = manifest.get(itemId);
    if (!item) continue;

    const filePath = opfDir + item.href;
    const html = await zip.file(filePath)?.async('string');
    if (!html) continue;

    const paragraphs = extractParagraphs(html);
    if (paragraphs.length === 0) continue;

    chapters.push({
      id: `ch-${i}`,
      title: `Chapter ${i + 1}`,
      htmlContent: html,
      paragraphs,
    });
  }

  // Try to extract TOC
  const toc = await extractToc(zip, opfDoc, opfDir, chapters);

  // Update chapter titles from TOC
  for (const entry of toc) {
    const ch = chapters.find((c) => c.id === entry.chapterId);
    if (ch) ch.title = entry.title;
  }

  return { metadata, chapters, toc };
}

function extractOpfPath(containerXml: string): string {
  const match = containerXml.match(/full-path="([^"]+)"/);
  return match?.[1] ?? 'content.opf';
}

function extractMetadata(doc: Document): EpubMetadata {
  const getText = (tag: string) => doc.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';
  return {
    title: getText('dc:title') || getText('title') || 'Unknown',
    author: getText('dc:creator') || getText('creator') || 'Unknown',
    language: getText('dc:language') || getText('language') || 'en',
  };
}

function extractSpine(doc: Document): string[] {
  const items = doc.getElementsByTagName('itemref');
  return Array.from(items).map((el) => el.getAttribute('idref') ?? '').filter(Boolean);
}

function extractManifest(doc: Document): Map<string, { href: string; mediaType: string }> {
  const items = doc.getElementsByTagName('item');
  const map = new Map<string, { href: string; mediaType: string }>();
  for (const item of items) {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    const mediaType = item.getAttribute('media-type') ?? '';
    if (id && href) map.set(id, { href, mediaType });
  }
  return map;
}

/** Extract readable paragraphs from HTML chapter content */
function extractParagraphs(html: string): string[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const paragraphs: string[] = [];

  const elements = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote');
  for (const el of elements) {
    const text = el.textContent?.trim();
    if (text && text.length > 5) paragraphs.push(text);
  }

  return paragraphs;
}

/** Try to extract TOC from ncx or nav document */
async function extractToc(
  zip: JSZip,
  opfDoc: Document,
  opfDir: string,
  chapters: EpubChapter[]
): Promise<TocEntry[]> {
  // Try nav.xhtml (ePub3) first
  const navItem = Array.from(opfDoc.getElementsByTagName('item')).find(
    (el) => el.getAttribute('properties')?.includes('nav')
  );

  if (navItem) {
    const navPath = opfDir + navItem.getAttribute('href');
    const navHtml = await zip.file(navPath)?.async('string');
    if (navHtml) {
      const parser = new DOMParser();
      const navDoc = parser.parseFromString(navHtml, 'text/html');
      const links = navDoc.querySelectorAll('nav a, nav[epub\\:type="toc"] a');
      const entries: TocEntry[] = [];
      for (let i = 0; i < links.length && i < chapters.length; i++) {
        entries.push({ title: links[i].textContent?.trim() ?? `Chapter ${i + 1}`, chapterId: chapters[i].id });
      }
      if (entries.length > 0) return entries;
    }
  }

  // Fallback: generate from chapter list
  return chapters.map((ch, i) => ({ title: ch.title || `Chapter ${i + 1}`, chapterId: ch.id }));
}
