/** Collect translatable paragraphs from a content area */

const TRANSLATABLE_TAGS = new Set([
  'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'LI', 'TD', 'TH', 'BLOCKQUOTE', 'FIGCAPTION', 'DD', 'DT',
]);

const SKIP_TAGS = new Set(['PRE', 'CODE', 'KBD', 'SAMP', 'SCRIPT', 'STYLE', 'SVG', 'MATH']);
const MIN_TEXT_LENGTH = 10;
const ATTR_ID = 'data-ait-id';
const ATTR_STATE = 'data-ait-state';

export type TranslationState = 'pending' | 'translating' | 'translated' | 'error';

export interface CollectedParagraph {
  id: string;
  element: HTMLElement;
  text: string;
}

let nextId = 0;

/** Collect all translatable paragraphs within a container */
export function collectParagraphs(container: HTMLElement): CollectedParagraph[] {
  const results: CollectedParagraph[] = [];

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      const el = node as HTMLElement;
      if (SKIP_TAGS.has(el.tagName)) return NodeFilter.FILTER_REJECT;
      if (TRANSLATABLE_TAGS.has(el.tagName)) return NodeFilter.FILTER_ACCEPT;
      return NodeFilter.FILTER_SKIP;
    },
  });

  let node: Node | null;
  while ((node = walker.nextNode())) {
    const el = node as HTMLElement;

    // Skip already-collected or already-translated
    if (el.getAttribute(ATTR_ID)) continue;

    const text = el.textContent?.trim() ?? '';
    if (text.length < MIN_TEXT_LENGTH) continue;

    // Skip code blocks inside translatable elements
    if (el.querySelector('pre, code')) continue;

    const id = `ait-${nextId++}`;
    el.setAttribute(ATTR_ID, id);
    el.setAttribute(ATTR_STATE, 'pending');

    results.push({ id, element: el, text });
  }

  return results;
}

/** Update translation state on an element */
export function setTranslationState(el: HTMLElement, state: TranslationState): void {
  el.setAttribute(ATTR_STATE, state);
}

/** Check if an element has already been collected */
export function isCollected(el: HTMLElement): boolean {
  return el.hasAttribute(ATTR_ID);
}

/** Reset the internal ID counter — call when stopping translation on a page */
export function resetCollector(): void {
  nextId = 0;
}
